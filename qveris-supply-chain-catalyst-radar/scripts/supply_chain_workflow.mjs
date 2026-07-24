#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import * as qverisClient from "../../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../../qveris-official/scripts/qveris_env.mjs";
import {
  executeFinanceCapability,
  normalizeCnSymbol,
} from "../../qveris-official/scripts/qveris_finance_adapter.mjs";
import { sanitizeProviderRouteMetadata } from "../../qveris-official/scripts/qveris_sanitize.mjs";
import {
  assessSupplyChainExecution,
  assessSupplyChainWorkflow,
  DEFAULT_MAX_AGE,
  normalizeMaxAge,
  quarantineQualitativeExecution,
} from "./supply_chain_evidence.mjs";

const SKILL_NAME = "qveris-supply-chain-catalyst-radar";
const WORKFLOWS = new Set(["company_radar", "hiring_innovation", "contract_watch", "shipping_watch"]);
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.-]{0,23}$/i;
const VESSEL_RE = /^[A-Z0-9][A-Z0-9._-]{3,31}$/i;
const SECRET_RE = /api[-_ ]?key|private[-_ ]?key|password|credential|secret|seed[-_ ]?phrase|mnemonic/i;

const SOURCE_RECORD = Object.freeze({
  original_repository: "MarketBot",
  github_url: "https://github.com/EthanAlgoX/MarketBot",
  license: "MIT",
  adapted_components: ["catalyst-tracker", "logic-chain-visualizer", "thesis-tracker"],
  upstream_commit: "4faa7fd7406a40ce8081b6a49de5cad08a545c64",
  evaluated_at: "2026-07-24",
});

function positiveInteger(value, label, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
  }
  return number;
}

export function normalizeIssuer(value) {
  const input = String(value ?? "").trim();
  if (!input || SECRET_RE.test(input) || !SYMBOL_RE.test(input)) {
    throw new Error("issuer must be a ticker or market-qualified security code");
  }
  const cn = normalizeCnSymbol(input);
  return { symbol: (cn ?? input).toUpperCase().replace(/\.SS$/, ".SH") };
}

function normalizeVesselId(value) {
  const vesselId = String(value ?? "").trim().toUpperCase();
  if (!VESSEL_RE.test(vesselId) || SECRET_RE.test(vesselId)) {
    throw new Error("vessel-id must be an IMO, MMSI, or documented public vessel identifier");
  }
  return vesselId;
}

function dateBounds(asOf, lookbackDays) {
  const endMs = Date.parse(asOf);
  if (Number.isNaN(endMs)) throw new Error("asOf must be a valid ISO timestamp");
  const days = positiveInteger(lookbackDays, "lookbackDays");
  return {
    start_date: new Date(endMs - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end_date: new Date(endMs).toISOString().slice(0, 10),
  };
}

function call(toolName, params, { required, purpose, dependsOnIdentity = true } = {}) {
  return { tool_name: toolName, params, required, purpose, depends_on_identity: dependsOnIdentity };
}

export function buildWorkflowPlan({
  workflow = "company_radar",
  issuer,
  asOf = new Date().toISOString(),
  lookbackDays = 90,
  includeJobs = true,
  includePatents = true,
  includeContracts = true,
  includeFilings = true,
  includeNews = true,
  vesselIds = [],
} = {}) {
  if (!WORKFLOWS.has(workflow)) throw new Error(`workflow must be one of: ${[...WORKFLOWS].join(", ")}`);
  const identity = normalizeIssuer(issuer);
  const window = dateBounds(asOf, lookbackDays);
  const vessels = [...new Set(vesselIds.map(normalizeVesselId))];
  if (vessels.length > 5) throw new Error("a workflow may include at most five vessel identifiers");
  if (workflow === "shipping_watch" && vessels.length === 0) {
    throw new Error("shipping_watch requires at least one --vessel-id");
  }

  const required = [call("qveris_finance.ref_security_master", identity, {
    required: true,
    purpose: "issuer_identity",
    dependsOnIdentity: false,
  })];
  const optional = [];
  const issuerWindow = { ...identity, ...window };
  const add = (target, toolName, purpose, requiredCall = false) => target.push(call(toolName, issuerWindow, {
    required: requiredCall,
    purpose,
  }));

  if (workflow === "company_radar" || workflow === "shipping_watch") {
    add(required, "qveris_finance.alt_supply_chain", "supply_chain_relationships", true);
  }
  if (workflow === "hiring_innovation") {
    add(required, "qveris_finance.alt_job_postings", "job_postings", true);
    add(required, "qveris_finance.alt_patents", "patent_activity", true);
  }
  if (workflow === "contract_watch") {
    add(required, "qveris_finance.alt_govt_contracts", "government_contracts", true);
    add(required, "qveris_finance.filings_regulatory_metadata", "regulatory_filings", true);
  }

  const present = new Set(required.map((item) => item.purpose));
  if (includeJobs && !present.has("job_postings")) add(optional, "qveris_finance.alt_job_postings", "job_postings");
  if (includePatents && !present.has("patent_activity")) add(optional, "qveris_finance.alt_patents", "patent_activity");
  if (includeContracts && !present.has("government_contracts")) add(optional, "qveris_finance.alt_govt_contracts", "government_contracts");
  if (includeFilings && !present.has("regulatory_filings")) add(optional, "qveris_finance.filings_regulatory_metadata", "regulatory_filings");
  if (includeNews) add(optional, "qveris_finance.news_fin_tagged", "qualitative_news_context");

  for (const vesselId of vessels) {
    const shippingCall = call("qveris_finance.alt_shipping_ais", { vessel_id: vesselId, ...window }, {
      required: workflow === "shipping_watch",
      purpose: "shipping_ais_observation",
    });
    (shippingCall.required ? required : optional).push(shippingCall);
  }

  return {
    workflow,
    issuer: identity,
    window: { start: window.start_date, end: window.end_date, timezone: "UTC" },
    vessel_ids: vessels,
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

function markFinalTraceRejected(execution, semantic) {
  if (semantic.semantic_status !== "rejected" || execution.response?.success !== true) return execution;
  const issues = semantic.semantic_issues ?? ["semantic_rejection"];
  const trace = execution.qveris_trace ?? [];
  if (trace.length > 0) {
    const final = trace.at(-1);
    final.status = "rejected";
    final.missing_fields = [...new Set([...(final.missing_fields ?? []), ...issues])];
  }
  const calls = execution.observed_calls ?? [];
  if (calls.length > 0 && calls.at(-1).trace) {
    calls.at(-1).trace = trace.at(-1);
  }
  return execution;
}

export async function runWorkflow({
  workflow = "company_radar",
  issuer,
  maxCalls = 8,
  dryRun = false,
  lookbackDays = 90,
  includeJobs = true,
  includePatents = true,
  includeContracts = true,
  includeFilings = true,
  includeNews = true,
  vesselIds = [],
  maxAge = DEFAULT_MAX_AGE,
  executeCapability,
  apiKey,
  now = () => new Date().toISOString(),
} = {}) {
  const normalizedMaxCalls = positiveInteger(maxCalls, "maxCalls", { allowZero: true });
  const planningAsOf = now();
  const plan = buildWorkflowPlan({
    workflow,
    issuer,
    asOf: planningAsOf,
    lookbackDays,
    includeJobs,
    includePatents,
    includeContracts,
    includeFilings,
    includeNews,
    vesselIds,
  });
  const controls = {
    dry_run: Boolean(dryRun),
    max_calls: normalizedMaxCalls,
    max_age: normalizeMaxAge(maxAge),
  };
  const base = {
    workflow_version: "qveris_supply_chain_workflow.v1",
    workflow,
    controls,
    plan,
    executions: [],
    observed_calls: [],
    qveris_trace: [],
    skipped_calls: [],
    observed_call_count: 0,
  };
  if (dryRun) return { ...base, status: "dry_run" };
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
  let identityConfirmed = false;
  let identityAttempted = false;

  for (let index = 0; index < plan.calls.length; index += 1) {
    const item = plan.calls[index];
    if (item.depends_on_identity && identityAttempted && !identityConfirmed) {
      result.skipped_calls.push({ ...item, reason: "identity_not_confirmed" });
      continue;
    }
    const remaining = normalizedMaxCalls - result.observed_calls.length;
    if (remaining <= 0) {
      result.skipped_calls.push({ ...item, reason: "max_calls_exhausted" });
      continue;
    }
    const laterMandatory = plan.calls.slice(index + 1).filter((candidate) => candidate.required).length;
    const attemptCapacity = remaining - laterMandatory;
    if (item.required && attemptCapacity < 1) {
      result.skipped_calls.push({ ...item, reason: "budget_reserved_for_mandatory_calls" });
      continue;
    }
    const maxAttempts = Math.min(2, item.required ? attemptCapacity : remaining);
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
      const semantic = assessSupplyChainExecution({
        purpose: item.purpose,
        params: execution.final_params ?? item.params,
        response: execution.response,
        maxAge: controls.max_age,
        now: now(),
        promptInjectionPaths: quarantined.rejected_paths,
      });
      execution = markFinalTraceRejected(execution, semantic);
      const observed = execution.observed_calls ?? [];
      if (observed.length > maxAttempts || result.observed_calls.length + observed.length > normalizedMaxCalls) {
        throw new Error("adapter exceeded the workflow attempt budget");
      }
      const record = {
        tool_name: item.tool_name,
        purpose: item.purpose,
        required: item.required,
        final_params: execution.final_params ?? item.params,
        resolution: execution.resolution ?? null,
        parameter_audit: execution.parameter_audit ?? null,
        retry_events: execution.retry_events ?? [],
        control_plane_retry_events: execution.control_plane_retry_events ?? [],
        response: execution.response ?? null,
        prompt_injection_rejections: quarantined.rejected_paths,
        ...semantic,
      };
      result.executions.push(record);
      result.observed_calls.push(...observed);
      result.qveris_trace.push(...(execution.qveris_trace ?? []));
      result.adapter_version ??= execution.adapter_version;
      if (item.purpose === "issuer_identity") {
        identityAttempted = true;
        identityConfirmed = semantic.semantic_status === "accepted";
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
      if (item.purpose === "issuer_identity") identityAttempted = true;
    }
  }

  result.observed_call_count = result.observed_calls.length;
  result.workflow_assessment = assessSupplyChainWorkflow({ executions: result.executions });
  const requiredExecutions = result.executions.filter((execution) => execution.required);
  const requiredComplete = requiredExecutions.length === plan.required_call_count
    && requiredExecutions.every((execution) => !executionFailed(execution));
  result.status = requiredComplete ? "complete" : "partial";
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

function statusProjection(status) {
  if (status === "complete") return { evidence: "corroborated", quality: "complete" };
  if (status === "budget_limited") return { evidence: "budget_limited", quality: "budget_limited" };
  if (status === "partial") return { evidence: "partial", quality: "partial" };
  return { evidence: "limited", quality: "limited" };
}

export function buildStructuredOutput(result, { asOf = result.observed_calls?.at(-1)?.observed_at ?? null } = {}) {
  const projected = statusProjection(result.status);
  const rejected = (result.executions ?? []).filter((item) => item.semantic_status === "rejected");
  const failedTrace = (result.qveris_trace ?? []).filter((row) => row.status !== "success");
  const skipped = result.skipped_calls ?? [];
  const missingFields = [...new Set([
    ...failedTrace.flatMap((row) => row.missing_fields ?? []),
    ...rejected.flatMap((item) => item.semantic_issues ?? []),
    ...skipped.map((item) => item.purpose ?? item.tool_name),
    ...(result.status === "dry_run" ? (result.plan?.calls ?? []).map((item) => item.purpose) : []),
  ])];
  const warnings = [...new Set([
    ...(result.status === "dry_run" ? ["dry_run_no_transport"] : []),
    ...(result.status === "budget_limited" ? ["mandatory_plan_exceeds_max_calls"] : []),
    ...failedTrace.flatMap((row) => row.missing_fields ?? []),
    ...rejected.flatMap((item) => item.semantic_issues ?? []),
    ...skipped.map((item) => item.reason),
  ])];
  const suppressedFields = [
    "target_price",
    "investment_recommendation",
    "directional_forecast",
    "causal_claim_without_corroboration",
    "unverified_company_vessel_link",
  ];
  const acceptedEvidence = (result.executions ?? [])
    .filter((item) => item.semantic_status === "accepted" && item.purpose !== "issuer_identity")
    .map((item) => ({
      tool_name: item.tool_name,
      purpose: item.purpose,
      status: "accepted",
      fields: item.evidence ?? {},
    }));
  const summary = result.status === "complete"
    ? "Required identity and workflow evidence passed semantic validation; directional catalyst claims remain unsupported without aligned comparison evidence."
    : "The workflow produced incomplete accepted evidence; missing or rejected layers are not treated as catalysts.";
  return sanitizeProviderRouteMetadata({
    skill: SKILL_NAME,
    source_record: SOURCE_RECORD,
    controls: {
      ...result.controls,
      budget_note: result.status === "dry_run"
        ? "Dry-run plan; no runtime observation is claimed."
        : `${result.observed_call_count ?? 0} of ${result.controls?.max_calls ?? 0} permitted query attempts were observed.`,
    },
    analysis: {
      workflow: result.workflow,
      summary,
      evidence_status: projected.evidence,
      as_of: asOf,
      issuer: result.plan?.issuer?.symbol ?? null,
      window: result.plan?.window ?? null,
      planned_calls: (result.plan?.calls ?? []).map((item) => item.tool_name),
      sections: [...new Set((result.plan?.calls ?? []).map((item) => item.purpose))],
      change_assessment: result.workflow_assessment?.change_assessment ?? {
        status: "unsupported",
        reason: "No independently aligned baseline/current comparison was observed.",
      },
      shipping_company_link_status: (result.plan?.vessel_ids ?? []).length === 0
        ? "not_requested"
        : result.workflow_assessment?.shipping_company_link_status ?? "unverified",
      interpretation_limits: [
        "alternative_data_is_observational_not_causal",
        "single_window_does_not_prove_change",
        "shipping_observation_requires_independent_company_link",
      ],
      rejections: rejected.map((item) => `${item.tool_name}:${(item.semantic_issues ?? []).join(",")}`),
      evidence: acceptedEvidence,
    },
    risk_notes: [
      "Hiring, patent, contract, shipping, and relationship records may be incomplete or delayed and do not by themselves establish financial impact.",
      "A catalyst direction requires independently aligned baseline/current evidence plus a documented transmission link.",
    ],
    missing_fields: missingFields,
    data_quality: {
      status: projected.quality,
      warnings,
      stale_fields: warnings.filter((value) => value.endsWith("_stale")),
      out_of_window_events: warnings.filter((value) => value.includes("requested_window")),
      suppressed_fields: suppressedFields,
    },
    observed_call_count: result.observed_call_count ?? 0,
    qveris_trace: result.qveris_trace ?? [],
    disclaimer: "Not investment advice.",
    suppressed_fields: suppressedFields,
  });
}

function usage() {
  return `Usage:
  node scripts/supply_chain_workflow.mjs --workflow NAME --issuer SYMBOL [options]

Workflows: company_radar, hiring_innovation, contract_watch, shipping_watch
Options:
  --issuer SYMBOL        Required ticker or market-qualified security code
  --vessel-id VALUE     Repeatable public IMO/MMSI identifier; required by shipping_watch
  --lookback-days N     Inclusive evidence lookback (default: 90)
  --max-calls N         Hard cap on observed capabilities/query attempts (default: 8)
  --max-age CLASS=VALUE Repeatable stricter freshness override
  --no-jobs             Omit optional job-posting evidence
  --no-patents          Omit optional patent evidence
  --no-contracts        Omit optional government-contract evidence
  --no-filings          Omit optional filing corroboration
  --no-news             Omit optional news corroboration
  --dry-run             Emit a plan without credentials or data calls
  --artifact PATH       Save an observed_calls.v1 sidecar
  --case-id VALUE       Sidecar case identifier
  --runtime-json        Print internal runtime diagnostics`;
}

function parseArgs(argv) {
  const options = {
    workflow: "company_radar",
    issuer: null,
    vesselIds: [],
    lookbackDays: 90,
    maxCalls: 8,
    maxAge: {},
    includeJobs: true,
    includePatents: true,
    includeContracts: true,
    includeFilings: true,
    includeNews: true,
    dryRun: false,
    artifact: null,
    caseId: null,
    runtimeJson: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return { help: true };
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--runtime-json") options.runtimeJson = true;
    else if (arg === "--no-jobs") options.includeJobs = false;
    else if (arg === "--no-patents") options.includePatents = false;
    else if (arg === "--no-contracts") options.includeContracts = false;
    else if (arg === "--no-filings") options.includeFilings = false;
    else if (arg === "--no-news") options.includeNews = false;
    else if (["--workflow", "--issuer", "--vessel-id", "--lookback-days", "--max-calls", "--max-age", "--artifact", "--case-id"].includes(arg)) {
      const value = argv[++index];
      if (value === undefined) throw new Error(`${arg} requires a value`);
      if (arg === "--workflow") options.workflow = value;
      else if (arg === "--issuer") options.issuer = value;
      else if (arg === "--vessel-id") options.vesselIds.push(value);
      else if (arg === "--lookback-days") options.lookbackDays = Number(value);
      else if (arg === "--max-calls") options.maxCalls = Number(value);
      else if (arg === "--artifact") options.artifact = value;
      else if (arg === "--case-id") options.caseId = value;
      else {
        const separator = value.indexOf("=");
        if (separator <= 0) throw new Error("--max-age requires CLASS=ISO_DURATION");
        options.maxAge[value.slice(0, separator)] = value.slice(separator + 1);
      }
    } else throw new Error(`unknown option: ${arg}`);
  }
  if (!options.issuer) throw new Error("--issuer is required");
  options.maxAge = { ...DEFAULT_MAX_AGE, ...options.maxAge };
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const result = await runWorkflow(options);
  if (options.artifact && !options.dryRun) {
    const artifact = buildObservedCallsArtifact(result, {
      caseId: options.caseId ?? `${options.workflow}-cli`,
    });
    await writeFile(options.artifact, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
  const output = options.runtimeJson ? result : buildStructuredOutput(result);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
