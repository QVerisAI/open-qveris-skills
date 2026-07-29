#!/usr/bin/env node
/** Run one live CAP case for each audited finance skill and save observed-call artifacts. */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import * as qverisClient from "../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../qveris-official/scripts/qveris_env.mjs";
import { executeFinanceCapability as executeSharedFinanceCapability } from "../qveris-official/scripts/qveris_finance_adapter.mjs";
import { sanitizeProviderRouteMetadata as sanitizeSharedMetadata } from "../qveris-official/scripts/qveris_sanitize.mjs";

const CASES = [
  {
    skill: "qveris-a-share-factor-screen",
    caseId: "a-share-factor-identity-coverage",
    toolName: "qveris_finance.ref_symbology",
    params: { symbol: "600519.SH", market: "CN" },
  },
  {
    skill: "qveris-a-stock-data-layer",
    caseId: "a-stock-requested-window-bars",
    toolName: "qveris_finance.mkt_bars_eod",
    params: {
      symbol: "600519.SH",
      market: "CN",
      start_date: "2026-06-01",
      end_date: "2026-06-30",
      interval: "1d",
    },
  },
  {
    skill: "qveris-a-share-data",
    caseId: "a-share-latest-snapshot",
    toolName: "qveris_finance.mkt_l1_rt",
    params: { symbol: "600519.SH", market: "CN" },
  },
  {
    skill: "qveris-alphaear-market-intelligence",
    caseId: "alphaear-news-coverage-monitor",
    toolName: "qveris_finance.news_fin_tagged",
    params: { symbol: "NVDA", market: "US", limit: 5 },
  },
  {
    skill: "qveris-daymade-financial-data-suite",
    caseId: "daymade-annual-income-statement",
    toolName: "qveris_finance.fundamentals_is",
    params: { symbol: "NVDA", market: "US", period_type: "annual", limit: 1 },
  },
  {
    skill: "qveris-uzi-equity-research",
    caseId: "uzi-a-share-specialty-gate",
    toolName: "qveris_finance.flow_dragon_tiger",
    params: {
      symbol: "002594.SZ",
      market: "CN",
      start_date: "2026-06-13",
      end_date: "2026-07-13",
    },
  },
  {
    skill: "qveris-anthropic-financial-services",
    caseId: "anthropic-derived-ratios-contract",
    toolName: "qveris_finance.fundamentals_derived_ratios",
    params: { symbol: "NVDA", market: "US" },
  },
  {
    skill: "qveris-finance-skills",
    caseId: "finance-skills-tagged-news-contract",
    toolName: "qveris_finance.news_fin_tagged",
    params: { symbol: "AAPL", market: "US" },
  },
  {
    skill: "qveris-tradermonty-trading-skills",
    caseId: "tradermonty-adjusted-bars-contract",
    toolName: "qveris_finance.mkt_bars_adjusted",
    params: { symbol: "SPY", market: "US", start_date: "2026-06-01", end_date: "2026-06-30" },
  },
  {
    skill: "qveris-supply-chain-catalyst-radar",
    caseId: "supply-chain-alt-cap-matrix",
    checks: [
      { toolName: "qveris_finance.ref_security_master", params: { symbol: "AAPL" } },
      { toolName: "qveris_finance.alt_supply_chain", params: { symbol: "AAPL", start_date: "$DATE_MINUS_90", end_date: "$DATE" } },
      { toolName: "qveris_finance.alt_job_postings", params: { symbol: "AAPL", start_date: "$DATE_MINUS_90", end_date: "$DATE" } },
      { toolName: "qveris_finance.alt_patents", params: { symbol: "AAPL", start_date: "$DATE_MINUS_90", end_date: "$DATE" } },
      { toolName: "qveris_finance.alt_govt_contracts", params: { symbol: "AAPL", start_date: "$DATE_MINUS_90", end_date: "$DATE" } },
      { toolName: "qveris_finance.filings_regulatory_metadata", params: { symbol: "AAPL", start_date: "$DATE_MINUS_90", end_date: "$DATE" } },
      { toolName: "qveris_finance.news_fin_tagged", params: { symbol: "AAPL", start_date: "$DATE_MINUS_7", end_date: "$DATE", limit: 5 } },
      { toolName: "qveris_finance.alt_shipping_ais", params: { vessel_id: "210035000", start_date: "$DATE_MINUS_1", end_date: "$DATE" } },
    ],
  },
  {
    skill: "qveris-macro-policy-monitor",
    caseId: "macro-policy-cap-matrix",
    checks: [
      { toolName: "qveris_finance.macro_indicators", params: { country: "US", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.macro_employment", params: { country: "US", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.macro_real_estate", params: { country: "US", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.macro_commodity_benchmark", params: { commodity_name: "WTI", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.rates_policy", params: { country: "US", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.rates_govt_benchmark", params: { country: "US", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.rates_interbank_benchmark", params: { rate_type: "shibor", country: "CN", start_date: "$DATE_MINUS_730", end_date: "$DATE" } },
      { toolName: "qveris_finance.fx_spot", params: { base_currency: "EUR", quote_currency: "USD" } },
      { toolName: "qveris_finance.index_levels", params: { symbol: "SPX" } },
    ],
  },
  {
    skill: "qveris-crypto-market-radar",
    caseId: "crypto-base-cap-matrix",
    checks: [
      { toolName: "qveris_finance.crypto_ref_master", params: { symbol: "BTC" } },
      { toolName: "qveris_finance.crypto_spot_rt", params: { symbol: "BTC" } },
      { toolName: "qveris_finance.crypto_bars_history", params: { symbol: "BTC", interval: "1d", start_date: "$DATE_MINUS_1", end_date: "$DATE" } },
      { toolName: "qveris_finance.crypto_market_rankings", params: { mode: "market_cap", limit: 20, quote_currency: "USD", market: "global" } },
      { toolName: "qveris_finance.crypto_fgi", params: { date: "$DATE" } },
      {
        toolName: "qveris_finance.crypto_whale",
        params: {
          address: "0x52908400098527886E0F7030069857D2E4169EE7",
          network: "ETH",
          start_date: "$DATE_MINUS_1",
          end_date: "$DATE",
        },
      },
    ],
  },
];

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function offsetDate(dateTag, dayOffset) {
  const timestamp = Date.parse(`${dateTag}T00:00:00Z`);
  if (Number.isNaN(timestamp)) throw new Error(`invalid date token base: ${dateTag}`);
  return new Date(timestamp + dayOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function materializeDateTokens(value, dateTag) {
  if (Array.isArray(value)) return value.map((item) => materializeDateTokens(item, dateTag));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      materializeDateTokens(child, dateTag),
    ]));
  }
  if (value === "$DATE") return dateTag;
  const offsetMatch = typeof value === "string" ? /^\$DATE_MINUS_(\d+)$/.exec(value) : null;
  if (offsetMatch) return offsetDate(dateTag, -Number(offsetMatch[1]));
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function markdownJson(value) {
  return `\`${JSON.stringify(value)}\``;
}

function renderTraceRows(trace) {
  return trace.map((row) => `| \`${row.tool_name}\` | ${markdownJson(row.params)} | ${row.status} | ${row.execution_id ?? "null"} | ${row.fallback_used} | ${markdownJson(row.missing_fields)} |`).join("\n");
}

function renderReport(testCase, artifactName, execution) {
  const trace = execution.qveris_trace ?? [];
  const finalTrace = trace.at(-1);
  const checkResults = execution.check_results ?? [];
  const statuses = checkResults.map((check) => check.status);
  const status = statuses.length > 0 && statuses.every((value) => value === "success")
    ? "success"
    : finalTrace?.status ?? (trace.length > 0 ? "failed" : "rejected");
  const missingFields = [...new Set([
    ...trace.flatMap((row) => row.missing_fields ?? []),
    ...checkResults.filter((check) => check.adapter_error).map((check) => check.adapter_error.code),
  ])];
  if (missingFields.length === 0 && status !== "success") missingFields.push("adapter_preflight_failed");
  const observedCount = execution.observed_calls?.length ?? 0;
  const checks = testCase.checks ?? [{ toolName: testCase.toolName, params: testCase.params }];
  const evidence = status === "success"
    ? `${observedCount} live CAP attempt(s) were observed and the final attempt succeeded. This supports only the narrow route check, not a complete research conclusion.`
    : observedCount > 0
      ? `${observedCount} live CAP attempt(s) were observed, but the final attempt failed. They supply call-availability evidence only and no positive market or issuer evidence.`
      : "The Skill-owned adapter rejected the case before transport because live CAP resolution or parameter preflight could not be completed. No call is claimed.";
  const quality = status === "success" ? "partial" : "insufficient";
  const preflightNote = observedCount === 0
    ? "Adapter preflight did not produce an observed call; the Trace table is intentionally empty.\n\n"
    : "";

  return `# ${testCase.skill} Live E2E

## Summary

Case \`${testCase.caseId}\` ran through the Skill-owned finance adapter. Final observed status: \`${status}\`; broader skill conclusions remain out of scope for this contract check.

## Evidence

${evidence}

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- \`data_quality.status\`: \`${quality}\`.
- \`missing_fields\`: ${markdownJson(missingFields)}.
- Requested logical CAPs: ${markdownJson(checks.map((check) => check.toolName))}.
- Final transmitted params by check: ${markdownJson(checkResults.map((check) => ({ tool_name: check.tool_name, params: check.final_params })))}.
- Resolved CAPs by check: ${markdownJson(checkResults.map((check) => ({ tool_name: check.tool_name, capability_id: check.resolution?.capability_id ?? null, detail_source: check.resolution?.detail_source ?? null })))}.
- Control-plane retries by check: ${markdownJson(checkResults.flatMap((check) => (check.resolution?.control_plane_retry_events ?? []).map((event) => ({ tool_name: check.tool_name, ...event }))))}.
- Preflight errors by check: ${markdownJson(checkResults.filter((check) => check.adapter_error).map((check) => ({ tool_name: check.tool_name, code: check.adapter_error.code, message: check.adapter_error.message })))}.
- Observed-call artifact: \`${artifactName}\`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
${renderTraceRows(trace)}

${preflightNote}
Observed call count: \`${observedCount}\`.

Not investment advice.
`;
}

async function runCase(apiKey, testCase, dateTag) {
  const checks = (testCase.checks ?? [{ toolName: testCase.toolName, params: testCase.params }])
    .map((check) => ({ ...check, params: materializeDateTokens(check.params, dateTag) }));
  const useSharedAdapter = new Set([
    "qveris-crypto-market-radar",
    "qveris-macro-policy-monitor",
    "qveris-supply-chain-catalyst-radar",
  ]).has(testCase.skill);
  let executeFinanceCapability = executeSharedFinanceCapability;
  let sanitizeProviderRouteMetadata = sanitizeSharedMetadata;
  let financeTransport = null;
  if (!useSharedAdapter) {
    const modules = await Promise.all([
      import(`../${testCase.skill}/scripts/qveris_finance_adapter.mjs`),
      import(`../${testCase.skill}/scripts/qveris_finance_client.mjs`),
      import(`../${testCase.skill}/scripts/qveris_sanitize.mjs`),
    ]);
    executeFinanceCapability = modules[0].executeFinanceCapability;
    financeTransport = modules[1].financeTransport;
    sanitizeProviderRouteMetadata = modules[2].sanitizeProviderRouteMetadata;
  }
  const executions = [];
  for (const check of checks) {
    try {
      executions.push(await executeFinanceCapability(useSharedAdapter ? {
          client: qverisClient, apiKey, requestedCapability: check.toolName,
          parameters: check.params, strategy: "best", timeoutMs: 120000,
        } : {
          capability: check.toolName,
          parameters: check.params,
          context: {
            ...(check.params.market ? { market: check.params.market } : {}),
            ...(check.params.period ? { period: check.params.period } : {}),
            ...(check.params.end_date ? { cut_off: check.params.end_date } : {}),
          },
          transport: financeTransport(apiKey), strategy: "best", timeoutMs: 120000,
        }));
    } catch (error) {
      executions.push({
        adapter_version: "qveris_finance_adapter.v1",
        resolution: null,
        final_params: {},
        parameter_audit: null,
        retry_events: [],
        observed_calls: [],
        qveris_trace: [],
        adapter_error: {
          code: error?.code ?? "adapter_preflight_failed",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
  const combinedExecution = {
    adapter_version: executions.find((item) => item.adapter_version)?.adapter_version ?? "qveris_finance_adapter.v1",
    resolution: executions.map((item) => item.resolution),
    final_params: executions.map((item) => item.final_params),
    parameter_audit: executions.map((item) => item.parameter_audit),
    retry_events: executions.flatMap((item) => item.retry_events ?? []),
    observed_calls: executions.flatMap((item) => item.observed_calls ?? []),
    qveris_trace: executions.flatMap((item) => item.qveris_trace ?? []),
    check_results: executions.map((item, index) => {
      const finalTrace = item.qveris_trace?.at(-1);
      return {
        tool_name: checks[index].toolName,
        status: finalTrace?.status ?? "rejected",
        resolution: item.resolution,
        final_params: item.final_params ?? {},
        observed_call_count: item.observed_calls?.length ?? 0,
        ...(item.adapter_error ? { adapter_error: item.adapter_error } : {}),
      };
    }),
  };
  const sanitizedExecution = sanitizeProviderRouteMetadata(combinedExecution);
  const observedCalls = sanitizedExecution.observed_calls ?? [];
  for (const observedCall of observedCalls) {
    if (observedCall.response_sha256 !== sha256(observedCall.response)) {
      throw new Error(`Adapter response hash mismatch for ${testCase.caseId}`);
    }
  }
  const artifact = {
    artifact_version: "observed_calls.v1",
    adapter_version: sanitizedExecution.adaptation?.schema_version ?? sanitizedExecution.adapter_version,
    skill: testCase.skill,
    case_id: testCase.caseId,
    recorded_at: new Date().toISOString(),
    resolution: sanitizedExecution.resolution,
    final_params: sanitizedExecution.final_params,
    parameter_audit: sanitizedExecution.parameter_audit,
    retry_events: sanitizedExecution.retry_events,
    observed_calls: observedCalls,
    check_results: sanitizedExecution.check_results,
  };

  const baseName = `live-e2e-output-${dateTag}`;
  const artifactName = `${baseName}.observed-calls.json`;
  const exampleDir = path.join(testCase.skill, "examples");
  await writeFile(path.join(exampleDir, artifactName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(exampleDir, `${baseName}.md`),
    renderReport(testCase, artifactName, sanitizedExecution),
    "utf8",
  );
  const statuses = sanitizedExecution.check_results.map((check) => check.status);
  const finalCall = observedCalls.at(-1);
  return {
    skill: testCase.skill,
    status: statuses.length > 0 && statuses.every((status) => status === "success")
      ? "success"
      : observedCalls.length > 0
        ? "failed"
        : "rejected",
    executionId: finalCall?.execution_id ?? null,
    observedCallCount: observedCalls.length,
  };
}

async function main() {
  const dateIndex = process.argv.indexOf("--date");
  const dateTag = dateIndex >= 0 ? process.argv[dateIndex + 1] : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTag ?? "")) {
    throw new Error("--date must use YYYY-MM-DD");
  }
  const skillIndex = process.argv.indexOf("--skill");
  const requestedSkill = skillIndex >= 0 ? process.argv[skillIndex + 1] : null;
  const selectedCases = requestedSkill
    ? CASES.filter((testCase) => testCase.skill === requestedSkill)
    : CASES;
  if (requestedSkill && selectedCases.length === 0) {
    throw new Error(`unknown --skill value: ${requestedSkill}`);
  }
  const apiKey = readQverisApiKey();
  for (const testCase of selectedCases) {
    const result = await runCase(apiKey, testCase, dateTag);
    console.log(`${result.skill}: ${result.status} observed_calls=${result.observedCallCount} execution_id=${result.executionId ?? "null"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
