#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import * as qverisClient from "../../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../../qveris-official/scripts/qveris_env.mjs";
import { executeFinanceCapability } from "../../qveris-official/scripts/qveris_finance_adapter.mjs";
import { sanitizeProviderRouteMetadata } from "../../qveris-official/scripts/qveris_sanitize.mjs";
import {
  assessCryptoExecution,
  assessCryptoWorkflow,
  DEFAULT_MAX_AGE,
  normalizeMaxAge,
  quarantineQualitativeExecution,
} from "./crypto_evidence.mjs";

const SKILL_NAME = "qveris-crypto-market-radar";
const WORKFLOWS = new Set([
  "spot_snapshot",
  "asset_trend",
  "market_radar",
  "whale_monitor",
  "multi_asset_comparison",
]);
const SECRET_HINT_RE = /private[-_ ]?key|seed[-_ ]?phrase|mnemonic|signing[-_ ]?key|wallet[-_ ]?credential|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const HEX_PRIVATE_KEY_RE = /^(?:0x)?[0-9a-f]{64}$/i;
const SIMPLE_ASSET_RE = /^[a-z0-9][a-z0-9._/-]{0,19}$/i;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/i;
const LONG_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{24,64}$/;

function assertPositiveInteger(value, label, { allowZero = false } = {}) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
  }
}

export function normalizeAssetSpec(value) {
  const input = String(value ?? "").trim();
  if (!input) {
    throw new Error("asset must be non-empty");
  }
  if (SECRET_HINT_RE.test(input) || HEX_PRIVATE_KEY_RE.test(input)) {
    throw new Error("wallet secret or credential-like input is not allowed");
  }
  if (input.split(/\s+/).length >= 12) {
    throw new Error("seed-like multi-word secret input is not allowed");
  }

  const at = input.lastIndexOf("@");
  const identifier = at > 0 ? input.slice(0, at) : input;
  const chain = at > 0 ? input.slice(at + 1).trim().toLowerCase() : null;
  if (at > 0 && !/^[a-z0-9][a-z0-9_-]{1,31}$/i.test(chain)) {
    throw new Error("chain qualifier must use letters, digits, underscore, or hyphen");
  }

  const addressLike = EVM_ADDRESS_RE.test(identifier) || LONG_ADDRESS_RE.test(identifier);
  if (addressLike) {
    if (!chain) {
      throw new Error("contract address is ambiguous without an explicit @chain qualifier");
    }
    return { input, contract_address: identifier, chain };
  }
  if (!SIMPLE_ASSET_RE.test(identifier)) {
    throw new Error("asset must be a ticker/pair or a chain-qualified contract address");
  }
  return {
    input,
    symbol: identifier.toUpperCase(),
    ...(chain ? { chain } : {}),
  };
}

function call(toolName, params, { required, purpose }) {
  return {
    tool_name: toolName,
    params,
    required,
    purpose,
  };
}

function assetParams(asset) {
  if (asset.contract_address) {
    return { contract_address: asset.contract_address, chain: asset.chain };
  }
  return { symbol: asset.symbol, ...(asset.chain ? { chain: asset.chain } : {}) };
}

export function buildWorkflowPlan({
  workflow,
  assets = [],
  interval = "1d",
  limit = 30,
  lookbackHours = 24,
  includeAnalytics = false,
  includeNews = false,
  includeSocial = false,
} = {}) {
  if (!WORKFLOWS.has(workflow)) {
    throw new Error(`workflow must be one of: ${[...WORKFLOWS].join(", ")}`);
  }
  assertPositiveInteger(Number(limit), "limit");
  assertPositiveInteger(Number(lookbackHours), "lookbackHours");
  const normalizedAssets = assets.map(normalizeAssetSpec);
  if (normalizedAssets.length > 5) {
    throw new Error("a workflow may include at most five assets");
  }
  if (workflow !== "market_radar" && normalizedAssets.length === 0) {
    throw new Error(`${workflow} requires at least one asset`);
  }
  if (workflow === "multi_asset_comparison" && normalizedAssets.length < 2) {
    throw new Error("multi_asset_comparison requires at least two assets");
  }

  const required = [];
  const optional = [];
  const addAssetCore = (asset, { history = false, whale = false } = {}) => {
    const params = assetParams(asset);
    required.push(call("qveris_finance.crypto_ref_master", params, {
      required: true,
      purpose: "asset_identity",
    }));
    if (history) {
      required.push(call("qveris_finance.crypto_bars_history", {
        ...params,
        interval,
        limit: Number(limit),
      }, { required: true, purpose: "requested_window_history" }));
    }
    if (whale) {
      required.push(call("qveris_finance.crypto_whale", {
        ...params,
        lookback_hours: Number(lookbackHours),
      }, { required: true, purpose: "whale_activity" }));
    }
    required.push(call("qveris_finance.crypto_spot_rt", params, {
      required: true,
      purpose: "spot_snapshot",
    }));
    if (includeAnalytics) {
      optional.push(call("qveris_finance.analytics_tech_indicators", {
        ...params,
        interval,
        limit: Number(limit),
      }, { required: false, purpose: "descriptive_technical_context" }));
    }
    if (includeNews) {
      optional.push(call("qveris_finance.news_fin_realtime", {
        ...params,
        limit: 5,
      }, { required: false, purpose: "qualitative_news_context" }));
    }
    if (includeSocial) {
      optional.push(call("qveris_finance.non_fin_social_media", {
        ...params,
        limit: 5,
      }, { required: false, purpose: "qualitative_social_context" }));
    }
  };

  if (workflow === "market_radar") {
    required.push(call("qveris_finance.crypto_market_rankings", {}, {
      required: true,
      purpose: "cross_sectional_rankings",
    }));
    required.push(call("qveris_finance.crypto_fgi", {}, {
      required: true,
      purpose: "market_wide_mood",
    }));
    for (const asset of normalizedAssets) {
      const params = assetParams(asset);
      optional.push(call("qveris_finance.crypto_ref_master", params, {
        required: false,
        purpose: "displayed_asset_identity",
      }));
      optional.push(call("qveris_finance.crypto_spot_rt", params, {
        required: false,
        purpose: "displayed_asset_spot",
      }));
    }
  } else {
    for (const asset of normalizedAssets) {
      addAssetCore(asset, {
        history: workflow === "asset_trend" || workflow === "multi_asset_comparison",
        whale: workflow === "whale_monitor",
      });
    }
  }

  return {
    workflow,
    assets: normalizedAssets,
    calls: [...required, ...optional],
    required_call_count: required.length,
    optional_call_count: optional.length,
  };
}

function executionFailed(execution) {
  return Boolean(execution.preflight_error)
    || execution.response?.success !== true
    || execution.semantic_status === "rejected";
}

function assetDependencyKey(params) {
  if (params?.contract_address) {
    return `contract:${params.chain ?? ""}:${params.contract_address}`;
  }
  if (params?.symbol) {
    return `symbol:${params.chain ?? ""}:${params.symbol}`;
  }
  return null;
}

export async function runWorkflow({
  workflow,
  assets = [],
  maxCalls = 8,
  dryRun = false,
  maxAge = DEFAULT_MAX_AGE,
  interval = "1d",
  limit = 30,
  lookbackHours = 24,
  includeAnalytics = false,
  includeNews = false,
  includeSocial = false,
  executeCapability,
  apiKey,
  now = () => new Date().toISOString(),
} = {}) {
  assertPositiveInteger(Number(maxCalls), "maxCalls", { allowZero: true });
  const normalizedMaxCalls = Number(maxCalls);
  const plan = buildWorkflowPlan({
    workflow,
    assets,
    interval,
    limit,
    lookbackHours,
    includeAnalytics,
    includeNews,
    includeSocial,
  });
  const controls = {
    dry_run: Boolean(dryRun),
    max_calls: normalizedMaxCalls,
    max_age: normalizeMaxAge(maxAge),
  };
  const base = {
    workflow_version: "qveris_crypto_workflow.v1",
    workflow,
    controls,
    plan,
    executions: [],
    observed_calls: [],
    qveris_trace: [],
    skipped_calls: [],
    observed_call_count: 0,
  };

  if (dryRun) {
    return { ...base, status: "dry_run" };
  }
  if (normalizedMaxCalls < plan.required_call_count) {
    return {
      ...base,
      status: "budget_limited",
      skipped_calls: plan.calls.map((item) => ({ ...item, reason: "mandatory_plan_exceeds_max_calls" })),
    };
  }

  const executor = executeCapability ?? ((request) => executeFinanceCapability({
    client: qverisClient,
    apiKey: apiKey ?? readQverisApiKey(),
    now,
    ...request,
  }));
  const result = { ...base, executions: [], observed_calls: [], qveris_trace: [], skipped_calls: [] };
  const blockedAssetKeys = new Set();

  for (let index = 0; index < plan.calls.length; index += 1) {
    const item = plan.calls[index];
    const dependencyKey = assetDependencyKey(item.params);
    const isIdentityCall = item.purpose === "asset_identity" || item.purpose === "displayed_asset_identity";
    if (!isIdentityCall && dependencyKey && blockedAssetKeys.has(dependencyKey)) {
      result.skipped_calls.push({ ...item, reason: "identity_not_confirmed" });
      continue;
    }
    const remaining = normalizedMaxCalls - result.observed_calls.length;
    if (remaining <= 0) {
      result.skipped_calls.push({ ...item, reason: "max_calls_exhausted" });
      continue;
    }
    const remainingMandatory = plan.calls
      .slice(index + 1)
      .filter((candidate) => candidate.required).length;
    const retryCapacity = remaining - remainingMandatory;
    if (item.required && retryCapacity < 1) {
      result.skipped_calls.push({ ...item, reason: "budget_reserved_for_mandatory_calls" });
      continue;
    }
    const maxAttempts = Math.min(2, item.required ? retryCapacity : remaining);

    try {
      let execution = sanitizeProviderRouteMetadata(await executor({
        requestedCapability: item.tool_name,
        parameters: item.params,
        strategy: "best",
        timeoutMs: 120000,
        maxAttempts,
      }));
      const quarantined = quarantineQualitativeExecution(execution, item.purpose);
      execution = quarantined.execution;
      const observed = execution.observed_calls ?? [];
      if (observed.length > maxAttempts || result.observed_calls.length + observed.length > normalizedMaxCalls) {
        throw new Error("adapter exceeded the workflow attempt budget");
      }
      const finalParams = execution.final_params ?? item.params;
      const semantic = assessCryptoExecution({
        purpose: item.purpose,
        params: finalParams,
        requestedParams: item.params,
        response: execution.response,
        maxAge: controls.max_age,
        now: now(),
        promptInjectionPaths: quarantined.rejected_paths,
      });
      result.executions.push({
        tool_name: item.tool_name,
        purpose: item.purpose,
        required: item.required,
        final_params: finalParams,
        resolution: execution.resolution ?? null,
        parameter_audit: execution.parameter_audit ?? null,
        retry_events: execution.retry_events ?? [],
        response: execution.response ?? null,
        prompt_injection_rejections: quarantined.rejected_paths,
        ...semantic,
      });
      result.observed_calls.push(...observed);
      result.qveris_trace.push(...(execution.qveris_trace ?? []));
      result.adapter_version ??= execution.adapter_version;
      if (isIdentityCall && semantic.semantic_status !== "accepted" && dependencyKey) {
        blockedAssetKeys.add(dependencyKey);
      }
    } catch (error) {
      result.executions.push({
        tool_name: item.tool_name,
        purpose: item.purpose,
        required: item.required,
        preflight_error: {
          code: error?.code ?? "workflow_preflight_failed",
          message: error instanceof Error ? error.message : String(error),
        },
      });
      if (isIdentityCall && dependencyKey) {
        blockedAssetKeys.add(dependencyKey);
      }
    }
  }

  result.observed_call_count = result.observed_calls.length;
  result.workflow_assessment = assessCryptoWorkflow({
    workflow,
    executions: result.executions,
  });
  const requiredExecutions = result.executions.filter((execution) => execution.required);
  const requiredComplete = requiredExecutions.length === plan.required_call_count
    && requiredExecutions.every((execution) => !executionFailed(execution));
  const anyFailed = result.executions.some(executionFailed);
  result.status = requiredComplete
    && !anyFailed
    && result.workflow_assessment.semantic_status === "accepted"
    ? "complete"
    : "partial";
  return sanitizeProviderRouteMetadata(result);
}

export function buildObservedCallsArtifact(result, {
  caseId = `${result.workflow}-workflow`,
  recordedAt = new Date().toISOString(),
} = {}) {
  return sanitizeProviderRouteMetadata({
    artifact_version: "observed_calls.v1",
    adapter_version: result.adapter_version ?? "qveris_finance_adapter.v1",
    skill: SKILL_NAME,
    case_id: caseId,
    recorded_at: recordedAt,
    workflow: result.workflow,
    controls: result.controls,
    observed_calls: result.observed_calls ?? [],
  });
}

function assetDisplayName(asset) {
  if (asset.contract_address) {
    return `${asset.contract_address}@${asset.chain}`;
  }
  return asset.chain ? `${asset.symbol}@${asset.chain}` : asset.symbol;
}

function workflowSections(workflow, plan) {
  const sections = ["market_snapshot"];
  if (workflow === "asset_trend" || workflow === "multi_asset_comparison") {
    sections.push("history_and_technical_context");
  }
  if (workflow === "market_radar") {
    sections.push("rankings_and_market_mood");
  }
  if (workflow === "whale_monitor") {
    sections.push("whale_context");
  }
  if (plan?.calls?.some((item) => item.purpose === "qualitative_news_context" || item.purpose === "qualitative_social_context")) {
    sections.push("news_and_social_context");
  }
  return sections;
}

function structuredStatus(status) {
  if (status === "complete") return { evidence: "confirmed", quality: "complete" };
  if (status === "budget_limited") return { evidence: "budget_limited", quality: "budget_limited" };
  if (status === "partial") return { evidence: "partial", quality: "partial" };
  return { evidence: "limited", quality: "limited" };
}

export function buildStructuredOutput(result, {
  asOf = result.observed_calls?.at(-1)?.observed_at ?? null,
} = {}) {
  const status = structuredStatus(result.status);
  const skipped = result.skipped_calls ?? [];
  const semanticRejections = (result.executions ?? [])
    .filter((execution) => execution.semantic_status === "rejected");
  const failedTrace = (result.qveris_trace ?? []).filter((row) => row.status !== "success");
  const missingFields = new Set([
    ...failedTrace.flatMap((row) => row.missing_fields ?? []),
    ...semanticRejections.flatMap((execution) => execution.semantic_issues ?? []),
    ...skipped.map((item) => item.purpose ?? item.tool_name),
    ...(result.workflow_assessment?.issues ?? []),
  ]);
  if (result.status === "dry_run") {
    for (const item of result.plan?.calls ?? []) missingFields.add(item.purpose ?? item.tool_name);
  }
  const historyCall = result.plan?.calls?.find((item) => item.purpose === "requested_window_history");
  const historyExecution = result.executions?.find((item) => item.purpose === "requested_window_history");
  const quoteCurrencies = [...new Set((result.executions ?? []).flatMap((execution) => [
    execution.evidence?.quote_currency,
    ...(execution.evidence?.quote_currencies ?? []),
  ]).filter(Boolean))];
  const warnings = new Set();
  if (result.status === "dry_run") warnings.add("dry_run_no_transport");
  if (result.status === "budget_limited") warnings.add("mandatory_plan_exceeds_max_calls");
  for (const item of skipped) warnings.add(item.reason);
  for (const row of failedTrace) {
    for (const field of row.missing_fields ?? []) warnings.add(field);
  }
  for (const execution of semanticRejections) {
    for (const issue of execution.semantic_issues ?? []) warnings.add(issue);
  }
  for (const issue of result.workflow_assessment?.issues ?? []) warnings.add(issue);
  const suppressedFields = [
    "wallet_actions",
    "swap_execution",
    "order_execution",
    "transaction_signing",
    "target_price",
    "return_prediction",
  ];
  const budgetNote = result.status === "dry_run"
    ? "Dry-run plan; no runtime observation is claimed."
    : result.status === "budget_limited"
      ? "Mandatory logical calls exceeded max_calls, so no data calls were made."
      : `${result.observed_call_count} of ${result.controls.max_calls} permitted query attempts were observed.`;
  const output = {
    skill: SKILL_NAME,
    source_record: {
      candidate_number: 23,
      original_repository: "GMGN Skills",
      github_url: "https://github.com/GMGNAI/gmgn-skills",
      license: "MIT",
      evaluation_recent_activity: "2026-07-23",
      local_source_snapshot: "third_party/source_repos/23-gmgn-skills",
      snapshot_latest_commit: "7205bf2 on 2026-07-23",
    },
    controls: {
      ...result.controls,
      budget_note: budgetNote,
    },
    analysis: {
      workflow: result.workflow,
      summary: result.status === "complete"
        ? "All mandatory workflow calls completed; conclusions still require the semantic acceptance fields in this output."
        : "The workflow did not produce a complete accepted evidence set; unsupported conclusions remain suppressed.",
      evidence_status: status.evidence,
      as_of: asOf,
      assets: (result.plan?.assets ?? []).map(assetDisplayName),
      quote_currencies: quoteCurrencies,
      window: historyCall ? {
        start: historyExecution?.evidence?.start ?? null,
        end: historyExecution?.evidence?.end ?? null,
        interval: historyCall.params.interval ?? null,
        timezone: "UTC",
        requested_observations: historyCall.params.limit ?? 0,
        accepted_observations: historyExecution?.evidence?.accepted_observations ?? 0,
      } : null,
      planned_calls: (result.plan?.calls ?? []).map((item) => item.tool_name),
      fallback_plan: skipped.length > 0
        ? "Use only independently accepted evidence; skipped evidence remains missing."
        : null,
      sections: workflowSections(result.workflow, result.plan),
      interpretation_limits: ["descriptive_evidence_only", "no_return_prediction"],
      rejections: [
        ...skipped.map((item) => `${item.tool_name}:${item.reason}`),
        ...semanticRejections.flatMap((execution) => (execution.semantic_issues ?? [])
          .map((issue) => `${execution.tool_name}:${issue}`)),
        ...(result.workflow_assessment?.issues ?? []).map((issue) => `workflow:${issue}`),
      ],
      evidence: (result.executions ?? [])
        .filter((execution) => execution.semantic_status === "accepted" && execution.evidence)
        .map((execution) => ({
          tool_name: execution.tool_name,
          purpose: execution.purpose,
          status: "accepted",
          fields: execution.evidence,
        })),
    },
    risk_notes: [
      "Crypto evidence is descriptive and does not support transaction instructions or future-return claims.",
    ],
    missing_fields: [...missingFields],
    data_quality: {
      status: status.quality,
      warnings: [...warnings],
      stale_fields: semanticRejections
        .filter((execution) => execution.semantic_issues?.some((issue) => issue.endsWith("_stale")))
        .map((execution) => execution.purpose),
      out_of_window_events: [
        ...semanticRejections.flatMap((execution) => (execution.semantic_issues ?? [])
          .filter((issue) => /(?:window|stale|timestamp)/.test(issue))
          .map((issue) => ({ tool_name: execution.tool_name, issue }))),
        ...(result.workflow_assessment?.issues ?? [])
          .filter((issue) => issue.includes("window"))
          .map((issue) => ({ issue })),
      ],
      suppressed_fields: suppressedFields,
    },
    observed_call_count: result.observed_call_count ?? 0,
    qveris_trace: result.qveris_trace ?? [],
    disclaimer: "Not investment advice.",
    suppressed_fields: suppressedFields,
  };
  output.qveris_trace = sanitizeProviderRouteMetadata(output.qveris_trace);
  return output;
}

function parseCli(argv) {
  const parsed = {
    assets: [],
    maxCalls: 8,
    maxAge: {},
    interval: "1d",
    limit: 30,
    lookbackHours: 24,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workflow") parsed.workflow = argv[++index];
    else if (arg === "--asset") parsed.assets.push(argv[++index]);
    else if (arg === "--max-calls") parsed.maxCalls = Number(argv[++index]);
    else if (arg === "--interval") parsed.interval = argv[++index];
    else if (arg === "--limit") parsed.limit = Number(argv[++index]);
    else if (arg === "--lookback-hours") parsed.lookbackHours = Number(argv[++index]);
    else if (arg === "--max-age") {
      const value = argv[++index];
      const separator = value?.indexOf("=") ?? -1;
      if (separator < 1 || separator === value.length - 1) {
        throw new Error("--max-age must use evidence_class=ISO_DURATION");
      }
      parsed.maxAge[value.slice(0, separator)] = value.slice(separator + 1);
    }
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--include-analytics") parsed.includeAnalytics = true;
    else if (arg === "--include-news") parsed.includeNews = true;
    else if (arg === "--include-social") parsed.includeSocial = true;
    else if (arg === "--artifact") parsed.artifactPath = argv[++index];
    else if (arg === "--case-id") parsed.caseId = argv[++index];
    else if (arg === "--runtime-json") parsed.runtimeJson = true;
    else if (arg === "--help") parsed.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node scripts/crypto_workflow.mjs --workflow NAME [--asset BTC] [options]

Workflows: spot_snapshot, asset_trend, market_radar, whale_monitor, multi_asset_comparison
Options:
  --asset VALUE          Repeat up to five times; use contract@chain for an address
  --max-calls N          Hard cap on observed capabilities/query attempts (default: 8)
  --dry-run              Emit the plan without reading credentials or making calls
  --interval VALUE       History/analytics interval (default: 1d)
  --limit N              History observation request (default: 30)
  --lookback-hours N     Whale lookback (default: 24)
  --max-age CLASS=VALUE  Repeatable stricter freshness override, for example spot=PT5M
  --include-analytics    Add optional descriptive technical context
  --include-news         Add optional finance-news context
  --include-social       Add optional social context
  --artifact PATH        Save an observed_calls.v1 sidecar
  --case-id VALUE        Sidecar case identifier
  --runtime-json         Print internal runtime diagnostics instead of schema output`);
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const result = await runWorkflow(args);
  if (args.artifactPath) {
    const artifact = buildObservedCallsArtifact(result, { caseId: args.caseId });
    await writeFile(args.artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(args.runtimeJson ? result : buildStructuredOutput(result), null, 2));
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
