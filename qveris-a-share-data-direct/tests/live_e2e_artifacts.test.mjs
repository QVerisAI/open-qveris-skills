import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { validateDirectResponse } from "../scripts/qveris_direct_runtime.mjs";

const artifactRoot = new URL("../../artifacts/live-e2e-2026-07-31/", import.meta.url);

async function readArtifact(name) {
  const raw = await readFile(new URL(name, artifactRoot), "utf8");
  assert.doesNotMatch(raw, /Bearer\s+[A-Za-z0-9._~+/=-]+/i);
  assert.doesNotMatch(raw, /"(?:api[_-]?key|source_provider|routing_decision|failover_log)"\s*:/i);
  const artifact = JSON.parse(raw);
  assert.equal(artifact.artifact_version, "observed_calls.v1");
  assert.equal(artifact.observed_call_count, artifact.observed_calls.length);
  assert.equal(artifact.qveris_trace.length, artifact.observed_calls.length);
  return artifact;
}

test("captured A-share live E2E contains 43 explicit adjusted bars", async () => {
  const artifact = await readArtifact("a-share-data-observed_calls.json");
  const execute = artifact.observed_calls.find((call) => call.request_kind === "tools/execute");
  assert.equal(execute.status, "success");
  assert.equal(execute.params.symbol, "600519.SS");
  assert.equal(execute.search_id, "88552a4a-f102-4c4b-a74c-602549ee3f99");
  assert.equal(execute.response.result.data.length, 43);
  assert.ok(execute.response.result.data.every((row) => Number.isFinite(row.adjClose)));
  assert.equal(execute.billing.list_amount_credits, 24.2);
});

test("captured factor-screen live E2E rejects ambiguous adjusted-close semantics", async () => {
  const artifact = await readArtifact("factor-screen-observed_calls.json");
  const execute = artifact.observed_calls.findLast((call) => call.request_kind === "tools/execute");
  const groups = execute.response.result.data;
  assert.equal(execute.status, "rejected");
  assert.deepEqual(execute.missing_fields, ["adjustment_basis_unclear"]);
  assert.equal(groups.length, 3);
  assert.equal(groups.reduce((count, rows) => count + rows.length, 0), 129);
  assert.equal(execute.response.result.metadata.result_count_for_billing, 3870);
  assert.equal(execute.billing.list_amount_credits, 5.11);
  const validation = validateDirectResponse({
    requestKind: "tools/execute",
    payload: execute.response,
    params: execute.params,
    observedAt: execute.observed_at,
    validation: {
      kind: "adjusted_bar_groups",
      expectedSymbols: ["600519.SH", "300750.SZ", "002594.SZ"],
      adjustment: "forward",
    },
  });
  assert.equal(validation.status, "rejected");
  assert.equal(validation.reason_code, "adjustment_basis_unclear");
});

test("captured AlphaEar live E2E contains a TSLA quote and one FY2025 annual record", async () => {
  const artifact = await readArtifact("alphaear-observed_calls.json");
  const executes = artifact.observed_calls.filter((call) => call.request_kind === "tools/execute");
  assert.equal(executes.length, 2);
  assert.equal(executes[0].response.result.data.c, 308.85);
  const fy2025 = executes[1].response.result.data.annualReports
    .find((row) => row.fiscalDateEnding === "2025-12-31");
  assert.ok(fy2025);
  assert.equal(fy2025.reportedCurrency, "USD");
  assert.equal(fy2025.totalRevenue, "94827000000");
  assert.equal(executes[0].billing.list_amount_credits + executes[1].billing.list_amount_credits, 3);
  const quoteValidation = validateDirectResponse({
    requestKind: "tools/execute",
    payload: executes[0].response,
    params: executes[0].params,
    observedAt: executes[0].observed_at,
    validation: {
      kind: "quote",
      expectedSymbol: "TSLA",
      identitySource: "request",
      maxAgeMs: 96 * 60 * 60 * 1000,
      marketSession: { timeZone: "America/New_York", openTime: "09:30", holidays: [] },
    },
  });
  assert.equal(quoteValidation.status, "success");
  const statementValidation = validateDirectResponse({
    requestKind: "tools/execute",
    payload: executes[1].response,
    params: executes[1].params,
    observedAt: executes[1].observed_at,
    validation: {
      kind: "records",
      expectedSymbol: "TSLA",
      expectedCurrency: "USD",
      requiredFields: ["symbol", "annualReports"],
      recordPath: "annualReports",
      minRecords: 1,
    },
  });
  assert.equal(statementValidation.status, "success");
});
