import test from "node:test";
import assert from "node:assert/strict";

import {
  DirectContractError,
  adaptDirectParameters,
  classifyTimeout,
  createObservedCall,
  createObservedCallsArtifact,
  enforceDirectBudget,
  estimateDirectBudget,
  normalizeAdjustedBars,
  normalizeAshareSymbol,
  normalizeFiscalPeriod,
  resolveDirectBaseUrl,
  sanitizeDirectResponse,
  validateFactorComparability,
} from "../scripts/qveris_direct_runtime.mjs";

test("uses the configured approved QVeris base URL", () => {
  assert.equal(resolveDirectBaseUrl({ QVERIS_BASE_URL: "https://qveris.cn/api/v1/" }), "https://qveris.cn/api/v1");
  assert.equal(resolveDirectBaseUrl({ QVERIS_BASE_URL: "https://api.qveris.cloud/api/v1" }), "https://api.qveris.cloud/api/v1");
});

test("rejects unsafe base URLs and redirects-by-origin", () => {
  for (const value of [
    "http://qveris.cn/api/v1",
    "https://evil.example/api/v1",
    "https://qveris.cn/not-api/v1",
    "https://user:pass@qveris.cn/api/v1",
    "https://qveris.cn:8443/api/v1",
  ]) {
    assert.throws(() => resolveDirectBaseUrl({ QVERIS_BASE_URL: value }), DirectContractError);
  }
});

test("normalizes A-share symbols and fiscal periods deterministically", () => {
  assert.equal(normalizeAshareSymbol("600519"), "600519.SH");
  assert.equal(normalizeAshareSymbol("300750"), "300750.SZ");
  assert.equal(normalizeAshareSymbol("430047"), "430047.BJ");
  assert.equal(normalizeAshareSymbol("920001"), "920001.BJ");
  assert.equal(normalizeAshareSymbol("600519.ss"), "600519.SH");
  assert.throws(() => normalizeAshareSymbol("900901"), (error) => error.code === "ambiguous_symbol");
  assert.equal(normalizeFiscalPeriod("FY"), "1231");
  assert.equal(normalizeFiscalPeriod("Q3"), "0930");
});

test("adapts canonical parameters to a discovered provider schema", () => {
  const result = adaptDirectParameters({
    parameters: {
      symbol: "600519",
      fiscal_period: "FY",
      statement_type: "balance_sheet",
      ignored: "drop-me",
    },
    schema: {
      type: "object",
      required: ["code", "period", "type"],
      properties: {
        code: { type: "string", description: "six-digit code without exchange suffix" },
        period: { type: "string", enum: ["0331", "0630", "0930", "1231"] },
        type: { type: "integer", enum: [1] },
      },
    },
    enumMaps: { type: { balance_sheet: 1 } },
  });
  assert.deepEqual(result.final_parameters, { code: "600519", period: "1231", type: 1 });
  assert.equal(result.schema_version, "qveris.direct-parameter-adaptation.v1");
  assert.ok(result.audit.some((entry) => entry.source === "ignored" && entry.action === "dropped_unsupported"));
});

test("preserves canonical fiscal periods when the selected schema accepts them", () => {
  const result = adaptDirectParameters({
    parameters: { symbol: "TSLA", fiscal_period: "FY" },
    schema: { required: ["symbol", "fiscal_period"], properties: { symbol: {}, fiscal_period: { enum: ["FY", "Q1", "Q2", "Q3", "Q4"] } } },
  });
  assert.deepEqual(result.final_parameters, { symbol: "TSLA", fiscal_period: "FY" });
});

test("refuses a call when discovered required parameters remain unresolved", () => {
  assert.throws(
    () => adaptDirectParameters({ parameters: { symbol: "TSLA" }, schema: { required: ["symbol", "period"], properties: { symbol: {}, period: {} } } }),
    (error) => error.code === "missing_required_parameters" && error.details.missingRequired.includes("period"),
  );
});

test("normalizes adjusted bars and enforces an exact trailing count", () => {
  const rows = Array.from({ length: 22 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    close: 100 + index,
    adj_close: 90 + index,
  }));
  rows.push({ ...rows.at(-1) });
  const result = normalizeAdjustedBars(rows, { requestedCount: 20, adjustment: "forward" });
  assert.equal(result.status, "complete");
  assert.equal(result.observed_count, 20);
  assert.equal(result.window_start, "2026-07-03");
  assert.equal(result.window_end, "2026-07-22");
  assert.equal(result.bars[0].adj_close, 92);
});

test("rejects ambiguous adjusted-close semantics instead of using raw close", () => {
  const result = normalizeAdjustedBars([
    { date: "2026-06-10", close: 1275.88, adjustment_factor: 0.9780369 },
  ], { adjustment: "forward" });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "adjustment_basis_unclear");
  assert.deepEqual(result.bars, []);
});

test("converts close plus factor only with an explicit tested convention", () => {
  const result = normalizeAdjustedBars([
    { date: "2026-06-10", close: 1275.88, adjustment_factor: 0.9780369 },
  ], { adjustment: "forward", factorConvention: "multiply" });
  assert.equal(result.status, "complete");
  assert.ok(Math.abs(result.bars[0].adj_close - 1247.858) < 0.01);
  assert.equal(result.bars[0].adjustment_basis, "close_multiply_factor");
});

test("rejects an invalid requested bar count", () => {
  assert.throws(() => normalizeAdjustedBars([], { requestedCount: "twenty" }), (error) => error.code === "invalid_requested_count");
});

test("fails closed on cross-industry factor ranking without a common normalization", () => {
  const base = {
    factor_set: ["momentum", "value", "quality"],
    price_window: "2026-06-01/2026-07-30",
    fiscal_period: "FY2025",
    measurement_basis: "reported",
    market_convention: "CN-adjusted-close",
  };
  const rows = [
    { ...base, security: "600519.SH", peer_group: "consumer" },
    { ...base, security: "300750.SZ", peer_group: "battery" },
    { ...base, security: "600036.SH", peer_group: "bank" },
  ];
  assert.equal(validateFactorComparability(rows).reason_code, "cross_industry_not_comparable");
  const normalized = rows.map((row) => ({ ...row, cross_industry_normalized: true, normalization_method: "within-industry-zscore-v1" }));
  assert.equal(validateFactorComparability(normalized).status, "complete");
});

test("blocks a high-quantity batch before it spends credits", () => {
  const estimate = estimateDirectBudget({
    expectedRows: 129,
    expectedBillableQuantity: 1419,
    creditsPerUnit: 1,
    unitsPerCredit: 25,
  });
  assert.ok(Math.abs(estimate.credits - 56.76) < 1e-9);
  assert.throws(
    () => enforceDirectBudget({
      budget: { max_calls: 12, used_calls: 2, max_credits: 25, used_credits: 0, max_rows: 300, max_billable_quantity: 600 },
      estimate,
    }),
    (error) => error.code === "budget_limited"
      && error.details.exceeded.includes("max_credits_exceeded")
      && error.details.exceeded.includes("max_billable_quantity_exceeded"),
  );
});

test("blocks a request when a bounded cost estimate is unknown", () => {
  assert.throws(
    () => enforceDirectBudget({
      budget: { max_credits: 20 },
      estimate: estimateDirectBudget({ expectedRows: 43 }),
    }),
    (error) => error.code === "budget_limited" && error.details.exceeded.includes("credits_estimate_unknown"),
  );
});

test("recursively sanitizes provider, routing, credentials, and signed URLs", () => {
  const sanitized = sanitizeDirectResponse({
    data: [{ symbol: "600519.SH", close: 100 }],
    source_provider: "internal-provider",
    routing_decision: { candidate: "secret-route" },
    headers: { authorization: "Bearer abc.def" },
    detail: "Bearer abc.def",
    download: "https://qveris.cn/file?signature=secret",
    remaining_credits: 1234,
    candidate_number: 57,
    token_count: 321,
  });
  assert.deepEqual(sanitized.data, [{ symbol: "600519.SH", close: 100 }]);
  assert.equal(sanitized.source_provider, undefined);
  assert.deepEqual(sanitized.headers, {});
  assert.equal(sanitized.detail, "Bearer [redacted]");
  assert.equal(sanitized.download, "[redacted_signed_url]");
  assert.equal(sanitized.remaining_credits, undefined);
  assert.equal(sanitized.candidate_number, 57);
  assert.equal(sanitized.token_count, 321);
});

test("builds a sanitized observed-calls sidecar and exact trace projection", () => {
  const call = createObservedCall({
    requestKind: "tools/execute",
    toolId: "raw.tool.v1",
    searchId: "search-1",
    params: { symbol: "600519.SH" },
    status: "rejected",
    missingFields: ["adjustment_basis_unclear"],
    response: { data: [{ close: 1275.88 }], source_provider: "hidden" },
    observedAt: "2026-07-31T00:00:00.000Z",
  });
  const artifact = createObservedCallsArtifact({ skill: "qveris-a-share-data-direct", calls: [call], recordedAt: "2026-07-31T00:00:01.000Z" });
  assert.equal(artifact.artifact_version, "observed_calls.v1");
  assert.equal(artifact.observed_call_count, 1);
  assert.equal(artifact.observed_calls[0].response.source_provider, undefined);
  assert.match(artifact.observed_calls[0].response_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(artifact.qveris_trace, [call.trace]);
  assert.equal(call.trace.tool_id, "raw.tool.v1");
});

test("reports the actual timeout layer and elapsed time", () => {
  const client = classifyTimeout(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }), {
    elapsedMs: 21_299,
    clientTimeoutMs: 30_000,
  });
  assert.equal(client.layer, "client");
  assert.equal(client.elapsed_ms, 21_299);
  assert.equal(client.limit_ms, 30_000);
  assert.match(client.message, /21299ms/);

  const upstream = classifyTimeout(new Error("Request timeout after 120s"), {
    elapsedMs: 21_299,
    upstreamTimeoutMs: 120_000,
  });
  assert.equal(upstream.layer, "upstream");
  assert.equal(upstream.limit_ms, 120_000);
});
