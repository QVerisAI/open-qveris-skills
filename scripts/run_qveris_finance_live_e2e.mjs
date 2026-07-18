#!/usr/bin/env node
/** Run one live CAP case for each audited finance skill and save observed-call artifacts. */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import * as qverisClient from "../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../qveris-official/scripts/qveris_env.mjs";
import { executeFinanceCapability } from "../qveris-official/scripts/qveris_finance_adapter.mjs";
import { sanitizeProviderRouteMetadata } from "../qveris-official/scripts/qveris_sanitize.mjs";

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
  const status = finalTrace?.status ?? "rejected";
  const missingFields = finalTrace?.missing_fields ?? [execution.adapter_error?.code ?? "adapter_preflight_failed"];
  const observedCount = execution.observed_calls?.length ?? 0;
  const evidence = status === "success"
    ? `${observedCount} live CAP attempt(s) were observed and the final attempt succeeded. This supports only the narrow route check, not a complete research conclusion.`
    : observedCount > 0
      ? `${observedCount} live CAP attempt(s) were observed, but the final attempt failed. They supply call-availability evidence only and no positive market or issuer evidence.`
      : "The public adapter rejected the case before transport because live CAP resolution or parameter preflight could not be completed. No call is claimed.";
  const quality = status === "success" ? "partial" : "insufficient";
  const preflightNote = observedCount === 0
    ? "Adapter preflight did not produce an observed call; the Trace table is intentionally empty.\n\n"
    : "";

  return `# ${testCase.skill} Live E2E

## Summary

Case \`${testCase.caseId}\` ran through the public finance adapter. Final observed status: \`${status}\`; broader skill conclusions remain out of scope for this contract check.

## Evidence

${evidence}

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- \`data_quality.status\`: \`${quality}\`.
- \`missing_fields\`: ${markdownJson(missingFields)}.
- Requested logical CAP: \`${testCase.toolName}\`.
- Final transmitted params: ${markdownJson(execution.final_params ?? {})}.
- Resolved CAP ID: \`${execution.resolution?.capability_id ?? "unresolved"}\` from \`${execution.resolution?.detail_source ?? "unavailable"}\`.
- Observed-call artifact: \`${artifactName}\`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

${preflightNote}| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
${renderTraceRows(trace)}

Observed call count: \`${observedCount}\`.

Not investment advice.
`;
}

async function runCase(apiKey, testCase, dateTag) {
  let execution;
  try {
    execution = await executeFinanceCapability({
      client: qverisClient,
      apiKey,
      requestedCapability: testCase.toolName,
      parameters: testCase.params,
      strategy: "best",
      timeoutMs: 120000,
    });
  } catch (error) {
    execution = {
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
    };
  }

  const sanitizedExecution = sanitizeProviderRouteMetadata(execution);
  const observedCalls = sanitizedExecution.observed_calls ?? [];
  for (const observedCall of observedCalls) {
    if (observedCall.response_sha256 !== sha256(observedCall.response)) {
      throw new Error(`Adapter response hash mismatch for ${testCase.caseId}`);
    }
  }
  const artifact = {
    artifact_version: "observed_calls.v1",
    adapter_version: sanitizedExecution.adapter_version,
    skill: testCase.skill,
    case_id: testCase.caseId,
    recorded_at: new Date().toISOString(),
    resolution: sanitizedExecution.resolution,
    final_params: sanitizedExecution.final_params,
    parameter_audit: sanitizedExecution.parameter_audit,
    retry_events: sanitizedExecution.retry_events,
    observed_calls: observedCalls,
    ...(sanitizedExecution.adapter_error ? { adapter_error: sanitizedExecution.adapter_error } : {}),
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
  const finalCall = observedCalls.at(-1);
  return {
    skill: testCase.skill,
    status: finalCall?.status ?? "rejected",
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
  const apiKey = readQverisApiKey();
  for (const testCase of CASES) {
    const result = await runCase(apiKey, testCase, dateTag);
    console.log(`${result.skill}: ${result.status} observed_calls=${result.observedCallCount} execution_id=${result.executionId ?? "null"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
