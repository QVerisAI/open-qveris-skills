#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import * as qverisClient from "../../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../../qveris-official/scripts/qveris_env.mjs";
import { executeFinanceCapability } from "../../qveris-official/scripts/qveris_finance_adapter.mjs";
import { sanitizeProviderRouteMetadata } from "../../qveris-official/scripts/qveris_sanitize.mjs";
import {
  assessMacroExecution,
  assessMacroWorkflow,
  DEFAULT_MAX_AGE,
  normalizeMaxAge,
} from "./macro_policy_evidence.mjs";

const SKILL_NAME = "qveris-macro-policy-monitor";
const WORKFLOWS = new Set(["macro_policy", "growth_inflation", "rates_fx"]);
const GEOGRAPHY_RE = /^[A-Z][A-Z0-9 ._-]{1,31}$/i;
const SOURCE_RECORD = Object.freeze({
  original_repository: "LLMQuant Skills",
  github_url: "https://github.com/LLMQuant/skills",
  license: "MIT",
  adapted_components: ["llmquant-macro", "global-macro-dashboard", "fed-policy-preview"],
  upstream_commit: "1918237467c2dff4cc97a18ebc0892dfd46e8129",
  evaluated_at: "2026-07-24",
});

const MARKET_CONTEXT = Object.freeze({
  US: { fx_pair: "EURUSD", index_symbol: "SPX" },
  CN: { fx_pair: "USDCNY", index_symbol: "CSI300", interbank_type: "shibor" },
  HK: { fx_pair: "USDHKD", index_symbol: "HSI" },
  EU: { fx_pair: "EURUSD", index_symbol: "STOXX50" },
  SG: { fx_pair: "USDSGD", index_symbol: "STI" },
  GB: { fx_pair: "GBPUSD", index_symbol: "FTSE100" },
  JP: { fx_pair: "USDJPY", index_symbol: "NIKKEI225" },
});

function positiveInteger(value, label, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
  }
  return number;
}

function normalizeGeography(value) {
  const geography = String(value ?? "").trim().toUpperCase();
  if (!GEOGRAPHY_RE.test(geography)) throw new Error("geography must be an explicit country or region code/name");
  return geography;
}

function dateBounds(asOf, lookbackDays) {
  const end = Date.parse(asOf);
  if (Number.isNaN(end)) throw new Error("asOf must be a valid ISO timestamp");
  const days = positiveInteger(lookbackDays, "lookbackDays");
  return {
    start_date: new Date(end - days * 86400000).toISOString().slice(0, 10),
    end_date: new Date(end).toISOString().slice(0, 10),
  };
}

function call(toolName, purpose, params, { anchor = false } = {}) {
  return { tool_name: toolName, purpose, params, anchor };
}

export function buildWorkflowPlan({
  workflow = "macro_policy",
  geography,
  asOf = new Date().toISOString(),
  lookbackDays = 730,
  fxPair,
  indexSymbol,
  commodityName = "WTI",
  indicatorName = "CPI",
} = {}) {
  if (!WORKFLOWS.has(workflow)) throw new Error(`workflow must be one of: ${[...WORKFLOWS].join(", ")}`);
  const country = normalizeGeography(geography);
  const window = dateBounds(asOf, lookbackDays);
  const common = { country, ...window };
  const macroWindow = dateBounds(asOf, Math.min(Number(lookbackDays), 730));
  const rateWindow = dateBounds(asOf, Math.min(Number(lookbackDays), 120));
  const marketWindow = dateBounds(asOf, Math.min(Number(lookbackDays), 30));
  const context = MARKET_CONTEXT[country] ?? {};
  const fx = String(fxPair ?? context.fx_pair ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
  if (fx && !/^[A-Z]{6}$/.test(fx)) throw new Error("fxPair must contain two ISO 4217 currency codes");
  const index = String(indexSymbol ?? context.index_symbol ?? "").trim().toUpperCase();
  const commodity = String(commodityName ?? "").trim();
  const calls = [];
  const add = (toolName, purpose, params = common, options = {}) => calls.push(call(toolName, purpose, params, options));

  if (workflow === "macro_policy") {
    add("qveris_finance.macro_indicators", "macro_indicators", { country, indicator_name: indicatorName, ...macroWindow }, { anchor: true });
    add("qveris_finance.rates_policy", "policy_rate", { country, ...rateWindow }, { anchor: true });
    add("qveris_finance.macro_employment", "employment");
    add("qveris_finance.macro_real_estate", "real_estate");
    if (commodity) add("qveris_finance.macro_commodity_benchmark", "commodity", { commodity_name: commodity, ...rateWindow });
    add("qveris_finance.rates_govt_benchmark", "government_rates", { country, ...marketWindow });
    if (context.interbank_type) add("qveris_finance.rates_interbank_benchmark", "interbank_rates", { rate_type: context.interbank_type, country, ...marketWindow });
    if (fx) add("qveris_finance.fx_spot", "fx_context", { base_currency: fx.slice(0, 3), quote_currency: fx.slice(3) });
    if (index) add("qveris_finance.index_levels", "index_context", { symbol: index });
  } else if (workflow === "growth_inflation") {
    add("qveris_finance.macro_indicators", "macro_indicators", { country, indicator_name: indicatorName, ...macroWindow }, { anchor: true });
    add("qveris_finance.macro_employment", "employment", common, { anchor: true });
    add("qveris_finance.macro_real_estate", "real_estate");
    if (commodity) add("qveris_finance.macro_commodity_benchmark", "commodity", { commodity_name: commodity, ...rateWindow });
  } else {
    add("qveris_finance.rates_policy", "policy_rate", { country, ...rateWindow }, { anchor: true });
    add("qveris_finance.rates_govt_benchmark", "government_rates", { country, ...marketWindow }, { anchor: true });
    if (context.interbank_type) add("qveris_finance.rates_interbank_benchmark", "interbank_rates", { rate_type: context.interbank_type, country, ...marketWindow });
    if (fx) add("qveris_finance.fx_spot", "fx_context", { base_currency: fx.slice(0, 3), quote_currency: fx.slice(3) });
    if (index) add("qveris_finance.index_levels", "index_context", { symbol: index });
  }
  return {
    workflow,
    geography: country,
    window: { start: window.start_date, end: window.end_date, timezone: "UTC" },
    calls,
    minimum_call_count: calls.filter((item) => item.anchor).length,
    disabled_capabilities: ["EVENT.CALENDAR.MACRO", "MACRO.ACTUAL_VS_FORECAST"],
  };
}

function markRejectedTrace(execution, semantic) {
  if (semantic.semantic_status !== "rejected" || execution.response?.success !== true) return execution;
  const trace = execution.qveris_trace ?? [];
  if (trace.length > 0) {
    trace.at(-1).status = "rejected";
    trace.at(-1).missing_fields = [...new Set([...(trace.at(-1).missing_fields ?? []), ...(semantic.semantic_issues ?? [])])];
  }
  if (execution.observed_calls?.at(-1)?.trace && trace.length > 0) execution.observed_calls.at(-1).trace = trace.at(-1);
  return execution;
}

export async function runWorkflow({
  workflow = "macro_policy",
  geography,
  maxCalls = 9,
  dryRun = false,
  lookbackDays = 730,
  fxPair,
  indexSymbol,
  commodityName = "WTI",
  indicatorName = "CPI",
  maxAge = DEFAULT_MAX_AGE,
  executeCapability,
  apiKey,
  now = () => new Date().toISOString(),
} = {}) {
  const budget = positiveInteger(maxCalls, "maxCalls", { allowZero: true });
  const plan = buildWorkflowPlan({ workflow, geography, asOf: now(), lookbackDays, fxPair, indexSymbol, commodityName, indicatorName });
  const controls = { dry_run: Boolean(dryRun), max_calls: budget, max_age: normalizeMaxAge(maxAge) };
  const base = {
    workflow_version: "qveris_macro_policy_workflow.v1",
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
  if (budget < plan.minimum_call_count) {
    return { ...base, status: "budget_limited", skipped_calls: plan.calls.map((item) => ({ ...item, reason: "minimum_plan_exceeds_max_calls" })) };
  }
  const executor = executeCapability ?? ((request) => executeFinanceCapability({
    client: qverisClient,
    apiKey: apiKey ?? readQverisApiKey(),
    now,
    ...request,
  }));
  const result = { ...base, executions: [], observed_calls: [], qveris_trace: [], skipped_calls: [] };
  for (let index = 0; index < plan.calls.length; index += 1) {
    const item = plan.calls[index];
    const remaining = budget - result.observed_calls.length;
    if (remaining <= 0) {
      result.skipped_calls.push({ ...item, reason: "max_calls_exhausted" });
      continue;
    }
    const laterAnchors = plan.calls.slice(index + 1).filter((candidate) => candidate.anchor).length;
    const attemptCapacity = remaining - laterAnchors;
    if (attemptCapacity < 1) {
      result.skipped_calls.push({ ...item, reason: "budget_reserved_for_anchor_calls" });
      continue;
    }
    const maxAttempts = Math.min(2, attemptCapacity);
    try {
      let execution = sanitizeProviderRouteMetadata(await executor({
        requestedCapability: item.tool_name,
        parameters: item.params,
        strategy: "best",
        timeoutMs: 120000,
        maxAttempts,
        retrieveFullContent: true,
      }));
      const semantic = assessMacroExecution({
        purpose: item.purpose,
        params: execution.final_params ?? item.params,
        response: execution.response,
        maxAge: controls.max_age,
        now: now(),
      });
      execution = markRejectedTrace(execution, semantic);
      const observed = execution.observed_calls ?? [];
      if (observed.length > maxAttempts || result.observed_calls.length + observed.length > budget) throw new Error("adapter exceeded workflow attempt budget");
      result.executions.push({
        tool_name: item.tool_name,
        purpose: item.purpose,
        anchor: item.anchor,
        final_params: execution.final_params ?? item.params,
        resolution: execution.resolution ?? null,
        parameter_audit: execution.parameter_audit ?? null,
        retry_events: execution.retry_events ?? [],
        control_plane_retry_events: execution.control_plane_retry_events ?? [],
        response: execution.response ?? null,
        ...semantic,
      });
      result.observed_calls.push(...observed);
      result.qveris_trace.push(...(execution.qveris_trace ?? []));
      result.adapter_version ??= execution.adapter_version;
    } catch (error) {
      result.executions.push({
        tool_name: item.tool_name,
        purpose: item.purpose,
        anchor: item.anchor,
        preflight_error: { code: error?.code ?? "workflow_preflight_failed", message: error instanceof Error ? error.message : String(error) },
        semantic_status: "rejected",
        semantic_issues: ["preflight_failed"],
      });
    }
  }
  result.observed_call_count = result.observed_calls.length;
  result.workflow_assessment = assessMacroWorkflow({ executions: result.executions });
  result.status = ["complete", "complete_with_macro_fallback"].includes(result.workflow_assessment.fallback_mode) ? "complete" : "partial";
  return sanitizeProviderRouteMetadata(result);
}

export function buildObservedCallsArtifact(result, { caseId = `${result.workflow}-workflow`, recordedAt = new Date().toISOString() } = {}) {
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

export function buildStructuredOutput(result) {
  const assessment = result.workflow_assessment ?? assessMacroWorkflow({ executions: result.executions });
  const accepted = (result.executions ?? []).filter((item) => item.semantic_status === "accepted");
  const rejected = (result.executions ?? []).filter((item) => item.semantic_status !== "accepted");
  const quality = result.status === "budget_limited" ? "budget_limited" : accepted.length === 0 ? "insufficient" : rejected.length > 0 ? "partial" : "complete";
  return sanitizeProviderRouteMetadata({
    skill: SKILL_NAME,
    source_record: SOURCE_RECORD,
    controls: { ...result.controls, budget_note: "max_calls counts observed capabilities/query attempts, including retries." },
    analysis: {
      workflow: result.workflow,
      summary: result.status === "budget_limited"
        ? "The minimum macro/rates plan did not fit the call budget; no data call was made."
        : result.status === "dry_run"
          ? `Dry-run plan for ${result.plan?.geography ?? "the requested geography"}; no data call was made and no observation is claimed.`
        : `Observed macro-policy evidence for ${result.plan?.geography ?? "the requested geography"}; unsupported layers remain explicit.`,
      evidence_status: result.status === "budget_limited" ? "budget_limited" : assessment.fallback_mode,
      as_of: result.plan?.window?.end ?? null,
      geography: result.plan?.geography ?? null,
      window: result.plan?.window ?? null,
      fallback_mode: assessment.fallback_mode,
      comparison_status: accepted.some((item) => ["increased", "decreased", "unchanged"].includes(item.evidence?.comparison?.status)) ? "descriptive_change_observed" : "snapshot_only",
      policy_transmission: assessment.policy_transmission,
      curve_proxy: assessment.curve_proxy,
      regime_label: assessment.regime_label,
      evidence: accepted.map((item) => ({
        tool_name: item.tool_name,
        purpose: item.purpose,
        status: "accepted",
        fields: item.evidence,
      })),
    },
    risk_notes: [
      "Descriptive changes do not mean improvement or deterioration unless a user-supplied semantic rule is independently justified.",
      "Co-movement does not establish policy transmission or causality.",
      "This workflow does not forecast policy, markets, or returns.",
    ],
    missing_fields: rejected.flatMap((item) => item.semantic_issues ?? [item.preflight_error?.code ?? "unavailable_layer"]),
    data_quality: {
      status: quality,
      warnings: rejected.flatMap((item) => item.semantic_issues ?? []),
      stale_fields: rejected.flatMap((item) => (item.semantic_issues ?? []).filter((issue) => issue.includes("stale"))),
      suppressed_fields: ["improvement_claim", "deterioration_claim", "causal_policy_transmission", "forecast"],
    },
    observed_call_count: result.observed_call_count ?? 0,
    qveris_trace: result.qveris_trace ?? [],
    disclaimer: "Not investment advice.",
    suppressed_fields: ["provider", "route", "candidate", "failover", "credential", "raw_tool_id", "provider_url"],
  });
}

function parseArgs(argv) {
  const options = { workflow: "macro_policy", maxCalls: 9, lookbackDays: 730, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === "--workflow") options.workflow = next();
    else if (arg === "--geography") options.geography = next();
    else if (arg === "--max-calls") options.maxCalls = Number(next());
    else if (arg === "--lookback-days") options.lookbackDays = Number(next());
    else if (arg === "--fx-pair") options.fxPair = next();
    else if (arg === "--index-symbol") options.indexSymbol = next();
    else if (arg === "--commodity") options.commodityName = next();
    else if (arg === "--indicator") options.indicatorName = next();
    else if (arg === "--artifact") options.artifact = next();
    else if (arg === "--output") options.output = next();
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runWorkflow(options);
  if (options.artifact) await writeFile(options.artifact, `${JSON.stringify(buildObservedCallsArtifact(result), null, 2)}\n`, "utf8");
  const output = buildStructuredOutput(result);
  if (options.output) await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  else process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
}
