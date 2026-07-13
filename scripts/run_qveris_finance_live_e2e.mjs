#!/usr/bin/env node
/** Run one live CAP case for each audited finance skill and save observed-call artifacts. */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { queryCapability } from "../qveris-official/scripts/qveris_client.mjs";
import { readQverisApiKey } from "../qveris-official/scripts/qveris_env.mjs";
import { sanitizeProviderRouteMetadata } from "../qveris-official/scripts/qveris_sanitize.mjs";

const CASES = [
  {
    skill: "qveris-a-share-factor-screen",
    caseId: "a-share-factor-identity-coverage",
    toolName: "qveris_finance.ref_symbology",
    capabilityId: "REF.SYMBOLOGY",
    params: { symbol: "600519.SH", market: "CN" },
  },
  {
    skill: "qveris-a-stock-data-layer",
    caseId: "a-stock-requested-window-bars",
    toolName: "qveris_finance.mkt_bars_eod",
    capabilityId: "MKT.BARS.EOD",
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
    capabilityId: "MKT.L1.RT",
    params: { symbol: "600519.SH", market: "CN" },
  },
  {
    skill: "qveris-alphaear-market-intelligence",
    caseId: "alphaear-news-coverage-monitor",
    toolName: "qveris_finance.news_fin_tagged",
    capabilityId: "NEWS.FIN.TAGGED",
    params: { symbol: "NVDA", market: "US", limit: 5 },
  },
  {
    skill: "qveris-daymade-financial-data-suite",
    caseId: "daymade-annual-income-statement",
    toolName: "qveris_finance.fundamentals_is",
    capabilityId: "FUNDAMENTALS.IS",
    params: { symbol: "NVDA", market: "US", period_type: "annual", limit: 1 },
  },
  {
    skill: "qveris-uzi-equity-research",
    caseId: "uzi-a-share-specialty-gate",
    toolName: "qveris_finance.flow_dragon_tiger",
    capabilityId: "FLOW.DRAGON_TIGER",
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

function renderReport(testCase, artifactName, observedCall) {
  const { status, execution_id: executionId, missing_fields: missingFields } = observedCall;
  const evidence = status === "success"
    ? "One live transport-success CAP response was observed. It supports only this narrow route check, not a complete research conclusion."
    : "The live CAP attempt failed, so it supplies call-availability evidence only and no positive market or issuer evidence.";
  const quality = status === "success" ? "partial" : "insufficient";

  return `# ${testCase.skill} Live E2E

## Summary

Case \`${testCase.caseId}\` executed one live QVeris CAP call. Observed status: \`${status}\`; broader skill conclusions remain out of scope for this contract check.

## Evidence

${evidence}

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- \`data_quality.status\`: \`${quality}\`.
- \`missing_fields\`: ${markdownJson(missingFields)}.
- Observed-call artifact: \`${artifactName}\`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| \`${testCase.toolName}\` | ${markdownJson(testCase.params)} | ${status} | ${executionId ?? "null"} | false | ${markdownJson(missingFields)} |

Observed call count: \`1\`.

Not investment advice.
`;
}

async function runCase(apiKey, testCase, dateTag) {
  const requestedAt = new Date().toISOString();
  let response;
  try {
    response = await queryCapability({
      apiKey,
      capabilityId: testCase.capabilityId,
      parameters: testCase.params,
      strategy: "best",
      timeoutMs: 120000,
    });
  } catch (error) {
    response = {
      success: false,
      execution_id: null,
      capability_id: testCase.capabilityId,
      parameters: testCase.params,
      error_message: error instanceof Error ? error.message : String(error),
    };
  }

  const sanitizedResponse = sanitizeProviderRouteMetadata(response);
  const status = sanitizedResponse.success === true ? "success" : "failed";
  const missingFields = status === "success" ? [] : ["cap_call_failed"];
  const observedCall = {
    tool_name: testCase.toolName,
    request_kind: "capabilities/query",
    capability_id: testCase.capabilityId,
    params: testCase.params,
    status,
    execution_id: sanitizedResponse.execution_id ?? null,
    fallback_used: false,
    missing_fields: missingFields,
    observed_at: sanitizedResponse.created_at ?? requestedAt,
    response_sha256: sha256(sanitizedResponse),
    response: sanitizedResponse,
  };
  const artifact = {
    artifact_version: "observed_calls.v1",
    skill: testCase.skill,
    case_id: testCase.caseId,
    recorded_at: new Date().toISOString(),
    observed_calls: [observedCall],
  };

  const baseName = `live-e2e-output-${dateTag}`;
  const artifactName = `${baseName}.observed-calls.json`;
  const exampleDir = path.join(testCase.skill, "examples");
  await writeFile(path.join(exampleDir, artifactName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(exampleDir, `${baseName}.md`),
    renderReport(testCase, artifactName, observedCall),
    "utf8",
  );
  return { skill: testCase.skill, status, executionId: observedCall.execution_id };
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
    console.log(`${result.skill}: ${result.status} execution_id=${result.executionId ?? "null"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
