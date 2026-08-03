import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DirectContractError,
  adaptDirectParameters,
  appendObservedCall,
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
  summarizeObservedUsage,
  validateDirectResponse,
  validateQuote,
  validateFactorComparability,
} from "../scripts/qveris_direct_runtime.mjs";

test("uses the configured approved QVeris base URL", () => {
  assert.equal(resolveDirectBaseUrl({ QVERIS_BASE_URL: "https://qveris.cn/api/v1/" }), "https://qveris.cn/api/v1");
  assert.equal(resolveDirectBaseUrl({ QVERIS_BASE_URL: "https://api.qveris.cloud/api/v1" }), "https://api.qveris.cloud/api/v1");
});

test("accepts the desktop API base URL variable without a launch-time translation", () => {
  assert.equal(resolveDirectBaseUrl({ QVERIS_API_BASE_URL: "https://qveris.cn/api/v1/" }), "https://qveris.cn/api/v1");
  assert.equal(
    resolveDirectBaseUrl({
      QVERIS_BASE_URL: "https://qveris.ai/api/v1",
      QVERIS_API_BASE_URL: "https://qveris.cn/api/v1",
    }),
    "https://qveris.ai/api/v1",
  );
});

test("CLI automatically enables Node environment-proxy support", () => {
  const runtimePath = fileURLToPath(new URL("../scripts/qveris_direct_runtime.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [runtimePath, "preflight", "--params", "{}", "--schema", "{}"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HTTP_PROXY: "http://127.0.0.1:7897",
      HTTPS_PROXY: "http://127.0.0.1:7897",
      QVERIS_BASE_URL: "https://qveris.ai/api/v1",
      QVERIS_PROXY_REEXEC: "",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).transport.env_proxy_enabled, true);
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

test("adapts Shanghai symbols to a discovered provider's .SS suffix", () => {
  const result = adaptDirectParameters({
    parameters: { symbol: "600519.SH" },
    schema: {
      required: ["symbol"],
      properties: {
        symbol: {
          type: "string",
          description: "Shanghai uses .SS (for example 600519.SS); .SH is not supported.",
        },
      },
    },
  });
  assert.deepEqual(result.final_parameters, { symbol: "600519.SS" });
});

test("uses structured schema examples for the Shanghai suffix adaptation", () => {
  const result = adaptDirectParameters({
    parameters: { symbol: "600519.SH" },
    schema: {
      required: ["symbol"],
      properties: { symbol: { type: "string", examples: ["600519.SS", "300750.SZ"] } },
    },
  });
  assert.deepEqual(result.final_parameters, { symbol: "600519.SS" });
});

test("adapts a canonical multi-symbol bars request to a discovered batch schema", () => {
  const result = adaptDirectParameters({
    parameters: {
      symbols: ["600519.SH", "300750.SZ", "002594.SZ"],
      start_date: "2026-06-01",
      end_date: "2026-07-30",
      interval: "1d",
      adjustment: "forward",
    },
    schema: {
      required: ["codes", "startdate", "enddate"],
      properties: {
        codes: { type: "string", description: "Security codes, comma-separated; e.g. 600030.SH,300750.SZ" },
        startdate: { type: "string" },
        enddate: { type: "string" },
        interval: { type: "string", enum: ["D", "W", "M"] },
        cps: { type: "string", enum: ["1", "2", "3", "6", "7"] },
      },
    },
    enumMaps: { interval: { "1d": "D" }, cps: { forward: "2" } },
  });
  assert.deepEqual(result.final_parameters, {
    codes: "600519.SH,300750.SZ,002594.SZ",
    startdate: "2026-06-01",
    enddate: "2026-07-30",
    interval: "D",
    cps: "2",
  });
});

test("adapts a canonical symbol to the compact s parameter used by quote tools", () => {
  const result = adaptDirectParameters({
    parameters: { symbol: "TSLA" },
    schema: { required: ["s"], properties: { s: { type: "string", description: "One or more symbols separated by commas" } } },
  });
  assert.deepEqual(result.final_parameters, { s: "TSLA" });
});

test("preserves canonical fiscal periods when the selected schema accepts them", () => {
  const result = adaptDirectParameters({
    parameters: { symbol: "TSLA", fiscal_period: "FY" },
    schema: { required: ["symbol", "fiscal_period"], properties: { symbol: {}, fiscal_period: { enum: ["FY", "Q1", "Q2", "Q3", "Q4"] } } },
  });
  assert.deepEqual(result.final_parameters, { symbol: "TSLA", fiscal_period: "FY" });
});

test("fails closed when an adapted value is outside the discovered enum", () => {
  assert.throws(
    () => adaptDirectParameters({
      parameters: { symbol: "TSLA", fiscal_period: "FY" },
      schema: { required: ["symbol", "period"], properties: { symbol: {}, period: { enum: ["annual", "quarter"] } } },
    }),
    (error) => error.code === "unsupported_enum_value" && error.details.parameter === "period",
  );
  const mapped = adaptDirectParameters({
    parameters: { symbol: "TSLA", fiscal_period: "FY" },
    schema: { required: ["symbol", "period"], properties: { symbol: {}, period: { enum: ["annual", "quarter"] } } },
    enumMaps: { period: { FY: "annual" } },
  });
  assert.deepEqual(mapped.final_parameters, { symbol: "TSLA", period: "annual" });
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

test("normalizes the camelCase adjusted-close field returned by a live direct tool", () => {
  const result = normalizeAdjustedBars([
    { symbol: "600519.SS", date: "2026-06-10", adjClose: 1246.38, volume: 3_924_414 },
  ], { startDate: "2026-06-01", endDate: "2026-07-30", adjustment: "forward" });
  assert.equal(result.status, "complete");
  assert.equal(result.bars[0].adj_close, 1246.38);
  assert.equal(result.bars[0].adjustment_basis, "explicit_adjusted_close");
});

test("normalizes the time field returned by a live batch-bars tool", () => {
  const result = normalizeAdjustedBars([
    { thscode: "300750.SZ", time: "2026-07-30", adjusted_close: 543.2, volume: 12_345 },
  ], { startDate: "2026-07-01", endDate: "2026-07-31", requestedCount: 1 });
  assert.equal(result.status, "complete");
  assert.equal(result.window_start, "2026-07-30");
  assert.equal(result.bars[0].date, "2026-07-30");
});

test("rejects adjusted bars that belong to a different security", () => {
  const result = normalizeAdjustedBars([
    { symbol: "300750.SZ", date: "2026-07-30", adjClose: 543.2 },
  ], {
    expectedSymbol: "600519.SH",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "entity_mismatch");
  assert.deepEqual(result.bars, []);
});

test("rejects conflicting duplicate bars instead of silently taking the last value", () => {
  const result = normalizeAdjustedBars([
    { symbol: "600519.SH", date: "2026-07-30", adjClose: 1361.76 },
    { symbol: "600519.SS", date: "2026-07-30", adjClose: 1300.00 },
  ], { expectedSymbol: "600519.SH" });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "conflicting_duplicate_observation");
  assert.deepEqual(result.bars, []);
});

test("rejects stale or mismatched quote evidence", () => {
  const stale = validateQuote({ symbol: "TSLA", price: 308.85, timestamp: "2026-07-30T20:00:00Z", currency: "USD" }, {
    expectedSymbol: "TSLA",
    expectedCurrency: "USD",
    observedAt: "2026-07-31T09:49:00Z",
    maxAgeMs: 60 * 60 * 1000,
  });
  assert.equal(stale.status, "rejected");
  assert.equal(stale.reason_code, "stale_quote");

  const mismatch = validateQuote({ symbol: "NVDA", price: 180, timestamp: "2026-07-31T09:48:00Z", currency: "USD" }, {
    expectedSymbol: "TSLA",
    observedAt: "2026-07-31T09:49:00Z",
    maxAgeMs: 60 * 60 * 1000,
  });
  assert.equal(mismatch.reason_code, "entity_mismatch");
});

test("keeps the latest Friday US close fresh before the next market session opens", () => {
  const marketSession = { timeZone: "America/New_York", openTime: "09:30", holidays: [] };
  const beforeOpen = validateQuote({ symbol: "TSLA", price: 311.21, timestamp: "2026-07-31T20:00:00Z" }, {
    expectedSymbol: "TSLA",
    observedAt: "2026-08-03T04:49:12Z",
    maxAgeMs: 96 * 60 * 60 * 1000,
    marketSession,
  });
  assert.equal(beforeOpen.status, "complete");
  assert.equal(beforeOpen.freshness_basis, "market_session");

  const afterOpen = validateQuote({ symbol: "TSLA", price: 311.21, timestamp: "2026-07-31T20:00:00Z" }, {
    expectedSymbol: "TSLA",
    observedAt: "2026-08-03T15:00:00Z",
    maxAgeMs: 96 * 60 * 60 * 1000,
    marketSession,
  });
  assert.equal(afterOpen.status, "rejected");
  assert.equal(afterOpen.reason_code, "stale_quote");
});

test("does not classify an execute transport response as successful without semantic validation", () => {
  const unvalidated = validateDirectResponse({
    requestKind: "tools/execute",
    payload: { success: true, result: { status_code: 200, data: [{ symbol: "600519.SS", date: "2026-07-30", adjClose: 1361.76 }] } },
  });
  assert.equal(unvalidated.status, "rejected");
  assert.equal(unvalidated.reason_code, "semantic_validation_required");

  const validated = validateDirectResponse({
    requestKind: "tools/execute",
    payload: { success: true, result: { status_code: 200, data: [{ symbol: "600519.SS", date: "2026-07-30", adjClose: 1361.76 }] } },
    validation: { kind: "adjusted_bars", expectedSymbol: "600519.SH", requestedCount: 1, adjustment: "forward" },
  });
  assert.equal(validated.status, "success");
  assert.equal(validated.reason_code, null);
  assert.equal(validated.evidence.bars[0].adj_close, 1361.76);
});

test("accepts a structurally valid cached-tool inspection without a search ID", () => {
  const inspected = validateDirectResponse({
    requestKind: "tools/by-ids",
    payload: { total: 1, results: [{ tool_id: "tool.v1", params: [] }] },
  });
  assert.equal(inspected.status, "success");
});

test("validates every requested security in a batch of adjusted bars", () => {
  const validated = validateDirectResponse({
    requestKind: "tools/execute",
    payload: {
      success: true,
      result: { status_code: 200, data: [
        [{ thscode: "600519.SH", time: "2026-07-30", adjusted_close: 1361.76 }],
        [{ thscode: "300750.SZ", time: "2026-07-30", adjusted_close: 543.2 }],
      ] },
    },
    validation: { kind: "adjusted_bar_groups", expectedSymbols: ["600519.SH", "300750.SZ"], requestedCount: 1 },
  });
  assert.equal(validated.status, "success");
  assert.deepEqual(validated.evidence.observed_symbols, ["300750.SZ", "600519.SH"]);

  const ambiguous = validateDirectResponse({
    requestKind: "tools/execute",
    payload: { success: true, result: { status_code: 200, data: [[{ thscode: "600519.SH", time: "2026-07-30", close: 1361.76 }]] } },
    validation: { kind: "adjusted_bar_groups", expectedSymbols: ["600519.SH"], requestedCount: 1, adjustment: "forward" },
  });
  assert.equal(ambiguous.status, "rejected");
  assert.equal(ambiguous.reason_code, "adjustment_basis_unclear");
});

test("validates financial statement identity, currency, and required report collection", () => {
  const validated = validateDirectResponse({
    requestKind: "tools/execute",
    payload: {
      success: true,
      result: {
        status_code: 200,
        data: { symbol: "TSLA", annualReports: [{ fiscalDateEnding: "2025-12-31", reportedCurrency: "USD", totalRevenue: "94827000000" }] },
      },
    },
    validation: {
      kind: "records",
      expectedSymbol: "TSLA",
      expectedCurrency: "USD",
      requiredFields: ["symbol", "annualReports"],
      recordPath: "annualReports",
      minRecords: 1,
    },
  });
  assert.equal(validated.status, "success");
  assert.equal(validated.evidence.observed_count, 1);

  const wrongCurrency = validateDirectResponse({
    requestKind: "tools/execute",
    payload: { success: true, result: { status_code: 200, data: { symbol: "TSLA", annualReports: [{ reportedCurrency: "CNY" }] } } },
    validation: { kind: "records", expectedSymbol: "TSLA", expectedCurrency: "USD", recordPath: "annualReports", minRecords: 1 },
  });
  assert.equal(wrongCurrency.status, "rejected");
  assert.equal(wrongCurrency.reason_code, "currency_mismatch");
});

test("can bind a symbol-less quote response to its audited request identity", () => {
  const validated = validateDirectResponse({
    requestKind: "tools/execute",
    params: { symbol: "TSLA" },
    observedAt: "2026-07-31T09:49:00Z",
    payload: { success: true, result: { status_code: 200, data: { c: 308.85, t: 1785441600 } } },
    validation: {
      kind: "quote",
      expectedSymbol: "TSLA",
      identitySource: "request",
      maxAgeMs: 14 * 60 * 60 * 1000,
    },
  });
  assert.equal(validated.status, "success");
  assert.equal(validated.evidence.identity_source, "request");
  assert.equal(validated.evidence.quote.symbol, "TSLA");
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

test("derives cumulative budget usage from observed calls instead of trusting reset counters", () => {
  const observedCalls = [
    createObservedCall({ requestKind: "search", status: "success", response: { results: [] } }),
    createObservedCall({
      requestKind: "tools/execute",
      status: "success",
      billing: {
        summary: "Billed by quantity. This call used 3870 quantitys and costs 5.11 credits",
        list_amount_credits: 5.11,
      },
      response: { success: true, result: { data: [[{ date: "2026-07-29" }, { date: "2026-07-30" }], [{ date: "2026-07-30" }]] } },
    }),
  ];
  assert.deepEqual(summarizeObservedUsage(observedCalls), {
    calls: 2,
    credits: 5.11,
    rows: 3,
    billable_quantity: 3870,
  });
  assert.throws(
    () => enforceDirectBudget({
      budget: {
        max_calls: 10,
        used_calls: 0,
        max_credits: 10,
        used_credits: 0,
        max_rows: 10,
        used_rows: 0,
        max_billable_quantity: 3870,
        used_billable_quantity: 0,
      },
      estimate: { calls: 1, credits: 1, rows: 1, billable_quantity: 1 },
      observedCalls,
    }),
    (error) => error.code === "budget_limited"
      && error.details.used.calls === 2
      && error.details.used.billable_quantity === 3870
      && error.details.exceeded.includes("max_billable_quantity_exceeded"),
  );
});

test("CLI preflight enforces cumulative usage from its audit artifact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qveris-direct-budget-"));
  const artifactPath = join(directory, "observed_calls.json");
  const runtimePath = fileURLToPath(new URL("../scripts/qveris_direct_runtime.mjs", import.meta.url));
  const artifact = createObservedCallsArtifact({
    skill: "test-skill",
    calls: [createObservedCall({ requestKind: "search", status: "success", response: { results: [] } })],
  });
  await writeFile(artifactPath, JSON.stringify(artifact), "utf8");
  try {
    const result = spawnSync(process.execPath, [
      runtimePath,
      "preflight",
      "--params", "{}",
      "--schema", "{}",
      "--artifact", artifactPath,
      "--estimate", JSON.stringify({ expectedRows: 0, expectedBillableQuantity: 0, creditsPerUnit: 0 }),
      "--budget", JSON.stringify({ max_calls: 1, max_credits: 1, max_rows: 1, max_billable_quantity: 1 }),
    ], { encoding: "utf8", env: { ...process.env, QVERIS_PROXY_REEXEC: "1" } });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).code, "budget_limited");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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

test("preserves every observed call when concurrent writers share one artifact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qveris-direct-artifact-"));
  const artifactPath = join(directory, "observed_calls.json");
  try {
    await Promise.all(Array.from({ length: 12 }, (_, index) => appendObservedCall(artifactPath, {
      skill: "test-skill",
      caseId: "concurrent-writes",
      call: createObservedCall({
        requestKind: "search",
        status: "success",
        response: { search_id: `search-${index}`, results: [] },
      }),
    })));
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    assert.equal(artifact.observed_call_count, 12);
    assert.deepEqual(new Set(artifact.observed_calls.map((call) => call.search_id)).size, 12);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("recovers an abandoned artifact lock before appending a new call", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qveris-direct-stale-lock-"));
  const artifactPath = join(directory, "observed_calls.json");
  const lockPath = `${artifactPath}.lock`;
  await mkdir(lockPath);
  const staleTime = new Date(Date.now() - 60_000);
  await utimes(lockPath, staleTime, staleTime);
  try {
    const artifact = await appendObservedCall(artifactPath, {
      skill: "test-skill",
      caseId: "stale-lock",
      call: createObservedCall({ requestKind: "search", status: "success", response: { search_id: "recovered", results: [] } }),
    });
    assert.equal(artifact.observed_call_count, 1);
    assert.equal(artifact.observed_calls[0].search_id, "recovered");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("records the search ID returned by a direct discovery response", () => {
  const call = createObservedCall({
    requestKind: "search",
    query: "A-share adjusted bars",
    status: "success",
    response: { search_id: "search-live-1", results: [] },
  });
  assert.equal(call.search_id, "search-live-1");
  assert.equal(call.trace.search_id, "search-live-1");
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
