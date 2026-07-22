import assert from "node:assert/strict";
import test from "node:test";

import {
  ADAPTATION_SCHEMA_VERSION,
  CAPABILITY_FALLBACK_SCHEMA_VERSION,
  adaptFinanceParameters,
  executeFinanceCapability,
  executeFinanceCapabilityChain,
  resolveFinanceCapability,
  symbolsEquivalent,
} from "../scripts/qveris_finance_adapter.mjs";

function detail(overrides = {}) {
  return {
    capability_id: "FLOW.SECTOR.CAPITAL",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "market", type: "string", required: false },
      { name: "limit", type: "integer", required: false },
      { name: "adjusted", type: "boolean", required: false },
    ],
    field_spec: {
      required: [
        { name: "symbol", type: "string" },
        { name: "date", type: "date" },
        { name: "net_flow", type: "number" },
      ],
    },
    remaining_credits: 99,
    ...overrides,
  };
}

function transport({ registry, capabilityDetail = detail(), responses = [], fullContent } = {}) {
  const calls = [];
  const fullContentCalls = [];
  return {
    calls,
    fullContentCalls,
    async listCapabilities() {
      return { results: registry ?? [capabilityDetail], total: (registry ?? [capabilityDetail]).length };
    },
    async getCapability({ capabilityId }) {
      assert.equal(capabilityId, capabilityDetail.capability_id);
      return capabilityDetail;
    },
    async queryCapability(input) {
      calls.push(structuredClone(input));
      return structuredClone(responses[calls.length - 1] ?? responses.at(-1));
    },
    async fetchFullContent(input) {
      fullContentCalls.push(structuredClone(input));
      if (fullContent instanceof Error) throw fullContent;
      return structuredClone(fullContent);
    },
  };
}

function fallbackTransport(details, responses) {
  const calls = [];
  const queues = new Map(Object.entries(responses).map(([key, values]) => [key, [...values]]));
  return {
    calls,
    async listCapabilities() { return { results: Object.values(details), total: Object.keys(details).length }; },
    async getCapability({ capabilityId }) { return details[capabilityId]; },
    async queryCapability(input) {
      calls.push(structuredClone(input));
      const queue = queues.get(input.capabilityId) ?? [];
      return structuredClone(queue.length > 1 ? queue.shift() : queue[0]);
    },
  };
}

function success(data = [{ symbol: "600519.SH", date: "2026-07-17", net_flow: 1 }], id = "exec-1") {
  return { success: true, execution_id: id, result: { data } };
}

test("resolves canonical finance names from the live registry without a stale alias table", async () => {
  const live = detail();
  const client = transport({ registry: [live] });
  const resolved = await resolveFinanceCapability({
    capability: "qveris_finance.flow_sector_capital",
    transport: client,
  });
  assert.equal(resolved.capability_id, "FLOW.SECTOR.CAPITAL");
  assert.equal(resolved.canonical_name, "qveris_finance.flow_sector_capital");
  assert.match(resolved.detail_hash, /^sha256:[a-f0-9]{64}$/);
});

test("continues live registry pagination when the server returns fewer rows than requested", async () => {
  const live = detail();
  const pages = [];
  const client = transport({ registry: [] });
  client.listCapabilities = async ({ page }) => {
    pages.push(page);
    return page === 1
      ? { results: [{ capability_id: "MKT.L1.RT" }], total: 2 }
      : { results: [live], total: 2 };
  };
  const resolved = await resolveFinanceCapability({ capability: "qveris_finance.flow_sector_capital", transport: client });
  assert.equal(resolved.capability_id, "FLOW.SECTOR.CAPITAL");
  assert.deepEqual(pages, [1, 2]);
});

test("reports an absent live capability instead of inventing a route", async () => {
  const client = transport({ registry: [detail()] });
  await assert.rejects(
    resolveFinanceCapability({ capability: "qveris_finance.investor_qa", transport: client }),
    (error) => error.code === "capability_unavailable",
  );
});

test("filters unknown inputs, removes inner capability_id, and converts only lossless scalar types", () => {
  const adapted = adaptFinanceParameters({
    detail: detail(),
    parameters: {
      capability_id: "WRONG.ROUTE",
      symbol: 600519,
      market: "CN",
      limit: "20",
      adjusted: "true",
      provider: "do-not-forward",
    },
  });
  assert.deepEqual(adapted.parameters, {
    symbol: "600519",
    market: "CN",
    limit: 20,
    adjusted: true,
  });
  assert.deepEqual(adapted.dropped_parameters.sort(), ["capability_id", "provider"]);
  assert.deepEqual(adapted.missing_required, []);
});

test("fills required fields only from explicit context or safe equivalent names", () => {
  const adapted = adaptFinanceParameters({
    detail: detail(),
    parameters: { ticker: "600519.SH" },
    context: { market: "CN" },
  });
  assert.deepEqual(adapted.parameters, { symbol: "600519.SH" });

  const missing = adaptFinanceParameters({ detail: detail(), parameters: {} });
  assert.deepEqual(missing.missing_required, ["symbol"]);
  assert.equal("symbol" in missing.parameters, false);
});

test("maps an explicitly requested option underlying to the live symbol parameter", () => {
  const schema = detail({
    capability_id: "OPT.CHAIN",
    params: [{ name: "symbol", type: "string", required: true }],
  });
  const adapted = adaptFinanceParameters({
    detail: schema,
    parameters: { underlying: "510050.SH" },
  });
  assert.deepEqual(adapted.parameters, { symbol: "510050.SH" });
  assert.deepEqual(adapted.missing_required, []);
});

test("uses an error-named missing field when the value exists in explicit context", async () => {
  const schema = detail({
    capability_id: "FUNDAMENTALS.IS",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "period", type: "string", required: false },
    ],
    field_spec: { required: [{ name: "symbol" }, { name: "period" }, { name: "revenue" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [
      { success: false, execution_id: "exec-1", message: "missing_required_tool_input:period" },
      { success: true, execution_id: "exec-2", result: { data: [{ symbol: "600519.SH", period: "FY2025", revenue: 2 }] } },
    ],
  });
  const result = await executeFinanceCapability({
    capability: "qveris_finance.fundamentals_is",
    parameters: { symbol: "600519.SH" },
    context: { period: "FY2025" },
    transport: client,
  });
  assert.equal(result.success, true);
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[1].parameters, { symbol: "600519.SH", period: "FY2025" });
});

test("maps an FY request to the provider-declared year-end code after an explicit enum error", async () => {
  const schema = detail({
    capability_id: "FUNDAMENTALS.IS",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "period", type: "string", required: false },
    ],
    field_spec: { required: [{ name: "symbol" }, { name: "period" }, { name: "revenue" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [
      { success: false, execution_id: "exec-1", message: "missing_required_tool_input:period" },
      { success: false, execution_id: "exec-2", message: "Invalid period: annual. Must be one of: 0331, 0630, 0930, 1231 The call did not return valid data. Please verify the request parameters." },
      { success: true, execution_id: "exec-3", result: { data: [{ symbol: "600519.SH", period: "FY2025", revenue: 2 }] } },
    ],
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "600519.SH" },
    context: { period: "annual", fiscal_period: "FY", fiscal_year: 2025 },
    transport: client,
  });
  assert.equal(result.success, true);
  assert.deepEqual(client.calls.map((call) => call.parameters.period ?? null), [null, "annual", "1231"]);
});

test("does not apply A-share quarter-end period codes to a non-CN security", async () => {
  const schema = detail({
    capability_id: "FUNDAMENTALS.IS",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "period", type: "string", required: false },
    ],
    field_spec: { required: [{ name: "symbol" }, { name: "period" }, { name: "revenue" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [
      { success: false, execution_id: "exec-1", message: "missing_required_tool_input:period" },
      { success: false, execution_id: "exec-2", message: "Invalid period: annual. Must be one of: 0331, 0630, 0930, 1231" },
      { success: true, execution_id: "exec-3", result: { data: [{ symbol: "AAPL", period: "FY2025", revenue: 2 }] } },
    ],
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "AAPL" },
    context: { market: "US", period: "annual", fiscal_period: "FY", fiscal_year: 2025 },
    transport: client,
  });
  assert.equal(result.success, false);
  assert.deepEqual(client.calls.map((call) => call.parameters.period ?? null), [null, "annual"]);
});

test("uses daily granularity only when a provider requires it for an explicit single date", async () => {
  const schema = detail({
    capability_id: "FLOW.DRAGON_TIGER",
    params: [
      { name: "symbol", type: "string", required: false },
      { name: "date", type: "date", required: false },
      { name: "granularity", type: "string", required: false, enum: ["daily", "weekly", "monthly"] },
    ],
    one_of_required: [["symbol", "granularity"]],
    field_spec: { required: [{ name: "date" }, { name: "symbol" }, { name: "reason" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [
      { success: false, execution_id: "exec-1", message: "missing_required_tool_input:granularity" },
      { success: true, execution_id: "exec-2", result: { data: [{ date: "2025-01-15", symbol: "300750.SZ", reason: "turnover" }] } },
    ],
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "300750.SZ", date: "2025-01-15" },
    context: { market: "CN" },
    transport: client,
  });
  assert.equal(result.success, true);
  assert.deepEqual(client.calls[1].parameters, { symbol: "300750.SZ", date: "2025-01-15", granularity: "daily" });
});

test("maps a dragon-tiger edate error to the canonical end date without exposing provider fields", async () => {
  const schema = detail({
    capability_id: "FLOW.DRAGON_TIGER",
    params: [
      { name: "symbol", type: "string", required: false },
      { name: "date", type: "date", required: false },
      { name: "start_date", type: "date", required: false },
      { name: "end_date", type: "date", required: false },
      { name: "market", type: "string", required: false },
      { name: "granularity", type: "string", required: false, enum: ["daily", "weekly", "monthly"] },
    ],
    one_of_required: [["symbol", "granularity"]],
    field_spec: { required: [{ name: "date" }, { name: "symbol" }, { name: "reason" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [
      { success: false, execution_id: "exec-1", message: "Missing required parameter: edate (required for mode='detail')" },
      { success: true, execution_id: "exec-2", result: { data: [{ date: "2026-07-17", symbol: "300750.SZ", reason: "turnover" }] } },
    ],
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: {
      symbol: "300750.SZ",
      start_date: "2026-06-01",
      end_date: "2026-07-17",
      market: "CN",
      granularity: "daily",
    },
    context: { market: "CN", cut_off: "2026-07-17" },
    transport: client,
  });

  assert.equal(result.success, true);
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[1].parameters, {
    symbol: "300750.SZ",
    date: "2026-07-17",
    start_date: "2026-06-01",
    end_date: "2026-07-17",
    market: "CN",
    granularity: "daily",
  });
  assert.equal(Object.hasOwn(client.calls[1].parameters, "edate"), false);
});

test("retries only equivalent A-share symbol encodings and never changes the entity", async () => {
  const client = transport({
    responses: [
      { success: false, execution_id: "exec-1", message: "symbol format rejected" },
      { success: false, execution_id: "exec-2", message: "symbol format rejected" },
      success(undefined, "exec-3"),
    ],
  });
  const result = await executeFinanceCapability({
    capability: "qveris_finance.flow_sector_capital",
    parameters: { symbol: "600519.SH", market: "CN", extra: "drop" },
    transport: client,
  });
  assert.equal(client.calls.length, 3);
  assert.deepEqual(client.calls.map((call) => call.parameters.symbol), ["600519.SH", "600519.SS", "600519"]);
  assert.ok(client.calls.every((call) => symbolsEquivalent(call.parameters.symbol, "600519.SH")));
  assert.equal(result.adaptation.selected_attempt, 3);
});

test("never exceeds three actual attempts", async () => {
  const client = transport({ responses: [{ success: false, execution_id: "exec-x", message: "format rejected" }] });
  const result = await executeFinanceCapability({
    capability: "FLOW.SECTOR.CAPITAL",
    parameters: { symbol: "600519.SH" },
    transport: client,
  });
  assert.equal(client.calls.length, 3);
  assert.equal(result.success, false);
  assert.equal(result.adaptation.attempts.length, 3);
});

test("stops immediately on wrong-market semantic data", async () => {
  const client = transport({
    responses: [success([{ symbol: "BTC-USDT", market: "CRYPTO", date: "2026-07-17", net_flow: 1 }])],
  });
  const result = await executeFinanceCapability({
    capability: "FLOW.SECTOR.CAPITAL",
    parameters: { symbol: "600519.SH", market: "CN" },
    context: { market: "CN" },
    transport: client,
  });
  assert.equal(client.calls.length, 1);
  assert.equal(result.success, false);
  assert.equal(result.adaptation.attempts[0].reason_code, "semantic_market_mismatch");
});

test("accepts documented output aliases with data-first contract diagnostics", async () => {
  const schema = detail({
    capability_id: "FUNDAMENTALS.DERIVED_RATIOS",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [{ name: "symbol" }, { name: "pe" }, { name: "pb" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [{
      success: true,
      execution_id: "exec-ratios",
      result: { data: [{ symbol: "600519.SH", pe_ttm: 20, pb_ratio: 4 }] },
    }],
  });
  const result = await executeFinanceCapability({
    capability: "FUNDAMENTALS.DERIVED_RATIOS",
    parameters: { symbol: "600519.SH" },
    transport: client,
  });
  assert.equal(result.success, true);

  const failedClient = transport({ capabilityDetail: schema, responses: [{ success: false, execution_id: "exec-fail", result: { data: [{ symbol: "600519.SH", pe_ttm: 20, pb_ratio: 4 }] } }] });
  const acceptedDataFirst = await executeFinanceCapability({ capability: schema.capability_id, parameters: { symbol: "600519.SH" }, transport: failedClient });
  assert.equal(acceptedDataFirst.success, true);
  assert.equal(acceptedDataFirst.adaptation.attempts[0].envelope_success, false);
  assert.equal(acceptedDataFirst.adaptation.attempts[0].contract_clean, false);
});

test("hydrates full-content payloads before validating research rows", async () => {
  const schema = detail({
    capability_id: "RESEARCH.ANALYST_REPORTS",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "title" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [{
      success: true,
      execution_id: "research-full",
      full_content_file_url: "https://files.example.test/signed-result",
      result: { data: null },
    }],
    fullContent: {
      success: true,
      execution_id: "research-full",
      result: { data: [{ symbol: "600519", date: "2026-07-21", title: "贵州茅台研究报告" }] },
    },
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "600519.SH" },
    transport: client,
  });
  assert.equal(result.success, true);
  assert.equal(client.fullContentCalls.length, 1);
  assert.equal(result.full_content_audit.fetched, true);
  assert.match(result.full_content_audit.content_hash, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(result), /files\.example\.test|full_content_file_url/);
});

test("rejects present-but-null required outputs", async () => {
  const schema = detail({
    capability_id: "FLOW.LARGE_ORDER",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [
      { name: "symbol" }, { name: "date" }, { name: "super_large_net" },
      { name: "large_net" }, { name: "medium_net" }, { name: "small_net" },
    ] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [{ success: true, execution_id: "null-tiers", result: { data: [{
      symbol: "300750.SZ", date: "2026-07-20", super_large_net: null,
      large_net: null, medium_net: null, small_net: null, main_net: 10,
    }] } }],
  });
  const result = await executeFinanceCapability({ capability: schema.capability_id, parameters: { symbol: "300750.SZ" }, transport: client });
  assert.equal(result.success, false);
  assert.equal(result.adaptation.attempts[0].reason_code, "missing_required_output_fields");
});

test("rejects degenerate flow, empty sentiment semantics, and weekend daily flow", async () => {
  const flowSchema = detail({
    capability_id: "FLOW.NORTHBOUND",
    params: [{ name: "date", type: "date", required: true }],
    field_spec: { required: [{ name: "date" }, { name: "net_flow" }] },
  });
  const zeroFlow = await executeFinanceCapability({
    capability: flowSchema.capability_id,
    parameters: { date: "2026-07-20" },
    transport: transport({ capabilityDetail: flowSchema, responses: [{
      success: true, execution_id: "zero-flow", result: { data: [
        { date: "2026-07-20", net_flow: 0, inflow: 0, outflow: 0 },
        { date: "2026-07-21", net_flow: 0, inflow: 0, outflow: 0 },
      ] },
    }] }),
  });
  assert.equal(zeroFlow.success, false);
  assert.equal(zeroFlow.adaptation.attempts[0].reason_code, "semantic_degenerate_flow");

  const sentimentSchema = detail({
    capability_id: "SENTIMENT.TEXT_SIGNALS",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "source" }] },
  });
  const emptySentiment = await executeFinanceCapability({
    capability: sentimentSchema.capability_id,
    parameters: { symbol: "002594.SZ" },
    transport: transport({ capabilityDetail: sentimentSchema, responses: [{
      success: true, execution_id: "coverage-only", result: { data: [{ symbol: "002594.SZ", date: "2026-07-21", source: "research", article_count: 18 }] },
    }] }),
  });
  assert.equal(emptySentiment.success, false);
  assert.equal(emptySentiment.adaptation.attempts[0].reason_code, "semantic_sentiment_signal_empty");

  const largeOrderSchema = detail({
    capability_id: "FLOW.LARGE_ORDER",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "main_net" }] },
  });
  const weekend = await executeFinanceCapability({
    capability: largeOrderSchema.capability_id,
    parameters: { symbol: "300750.SZ" },
    context: { market: "CN" },
    transport: transport({ capabilityDetail: largeOrderSchema, responses: [{
      success: true, execution_id: "weekend-flow", result: { data: [{ symbol: "300750.SZ", date: "2026-07-18", main_net: 10 }] },
    }] }),
  });
  assert.equal(weekend.success, false);
  assert.equal(weekend.adaptation.attempts[0].reason_code, "semantic_non_trading_date");
});

test("rejects stale real-time data against the declared cutoff without extra freshness context", async () => {
  const schema = detail({
    capability_id: "MKT.L1.RT",
    params: [{ name: "symbol", type: "string", required: true }],
    field_spec: { required: [{ name: "symbol" }, { name: "timestamp" }, { name: "price" }] },
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "600519.SH" },
    context: { cut_off: "2026-07-22", maximum_age_days: 7 },
    transport: transport({ capabilityDetail: schema, responses: [{
      success: true, execution_id: "stale-quote", result: { data: [{ symbol: "600519.SH", timestamp: "2025-01-15T00:00:00Z", price: 1400 }] },
    }] }),
  });
  assert.equal(result.success, false);
  assert.equal(result.adaptation.attempts[0].reason_code, "semantic_stale_data");
});

test("validates fiscal years while treating annual and FY labels as equivalent", async () => {
  const schema = detail({
    capability_id: "FUNDAMENTALS.IS",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "period", type: "string", required: false },
    ],
    field_spec: { required: [{ name: "symbol" }, { name: "period" }, { name: "revenue" }] },
  });
  const client = transport({
    capabilityDetail: schema,
    responses: [{ success: true, execution_id: "exec-fy", result: { data: [{ symbol: "600519.SH", period: "FY2025", revenue: 2 }] } }],
  });
  const result = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { symbol: "600519.SH", period: "annual" },
    context: { fiscal_year: 2025 },
    transport: client,
  });
  assert.equal(result.success, true);
});

test("accepts CN sector identifiers but rejects data outside an explicit date window", async () => {
  const schema = detail({
    params: [
      { name: "sector", type: "string", required: true },
      { name: "market", type: "string", required: false },
      { name: "start_date", type: "date", required: false },
      { name: "end_date", type: "date", required: false },
    ],
  });
  const sectorClient = transport({
    capabilityDetail: schema,
    responses: [{ success: true, execution_id: "exec-sector", result: { data: [{ symbol: "801010.SL", date: "2026-07-17", net_flow: 1, market: "CN" }] } }],
  });
  const accepted = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { sector: "银行", market: "CN" },
    transport: sectorClient,
  });
  assert.equal(accepted.success, true);

  const windowClient = transport({
    capabilityDetail: schema,
    responses: [{ success: true, execution_id: "exec-window", result: { data: [{ symbol: "801010.SL", date: "2026-06-30", net_flow: 1, market: "CN" }] } }],
  });
  const rejected = await executeFinanceCapability({
    capability: schema.capability_id,
    parameters: { sector: "银行", market: "CN", start_date: "2026-07-01", end_date: "2026-07-17" },
    transport: windowClient,
  });
  assert.equal(rejected.success, false);
  assert.equal(rejected.adaptation.attempts[0].reason_code, "semantic_date_window_mismatch");
});

test("allows disclosed future event dates only inside an explicit event-calendar horizon", async () => {
  const eventSchema = detail({
    capability_id: "EVENT.CALENDAR.EARNINGS",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "start_date", type: "date", required: false },
      { name: "end_date", type: "date", required: false },
    ],
    field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "event_type" }] },
  });
  const parameters = { symbol: "688981.SH", start_date: "2026-06-01", end_date: "2026-09-15" };
  const response = { success: true, execution_id: "exec-event", result: { data: [{ symbol: "688981.SH", date: "2026-08-30", event_type: "earnings_release" }] } };

  const rejected = await executeFinanceCapability({
    capability: eventSchema.capability_id,
    parameters,
    context: { cut_off: "2026-07-17" },
    transport: transport({ capabilityDetail: eventSchema, responses: [response] }),
  });
  assert.equal(rejected.success, false);
  assert.equal(rejected.adaptation.attempts[0].reason_code, "semantic_future_data");

  const accepted = await executeFinanceCapability({
    capability: eventSchema.capability_id,
    parameters,
    context: { cut_off: "2026-07-17", future_event_end_date: "2026-09-15" },
    transport: transport({ capabilityDetail: eventSchema, responses: [response] }),
  });
  assert.equal(accepted.success, true);

  const lockUpSchema = { ...eventSchema, capability_id: "MKT.CN.LOCK_UP" };
  const lockUpAccepted = await executeFinanceCapability({
    capability: lockUpSchema.capability_id,
    parameters,
    context: { cut_off: "2026-07-17", future_event_end_date: "2026-09-15" },
    transport: transport({ capabilityDetail: lockUpSchema, responses: [response] }),
  });
  assert.equal(lockUpAccepted.success, true);

  const marketSchema = { ...eventSchema, capability_id: "MKT.BARS.ADJUSTED" };
  const marketRejected = await executeFinanceCapability({
    capability: marketSchema.capability_id,
    parameters,
    context: { cut_off: "2026-07-17", future_event_end_date: "2026-09-15" },
    transport: transport({ capabilityDetail: marketSchema, responses: [response] }),
  });
  assert.equal(marketRejected.success, false);
  assert.equal(marketRejected.adaptation.attempts[0].reason_code, "semantic_future_data");
});

test("emits a sanitized, hash-backed adaptation audit", async () => {
  const client = transport({
    responses: [{
      ...success(),
      provider: "secret-provider",
      route: "secret-route",
      credential: "secret-token",
      result: { data: [{ symbol: "600519.SH", date: "2026-07-17", net_flow: 1 }], provider_id: "hidden" },
    }],
  });
  const result = await executeFinanceCapability({
    capability: "qveris_finance.flow_sector_capital",
    parameters: { symbol: "600519.SH" },
    transport: client,
  });
  assert.equal(result.adaptation.schema_version, ADAPTATION_SCHEMA_VERSION);
  assert.match(result.adaptation.detail_hash, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.adaptation.attempts[0].parameters_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.adaptation.attempts[0].execution_id, "exec-1");
  assert.equal(result.observed_calls.length, 1);
  assert.equal(result.observed_calls[0].response_sha256, result.adaptation.attempts[0].response_hash);
  assert.deepEqual(result.qveris_trace[0], {
    tool_name: "qveris_finance.flow_sector_capital",
    params: { symbol: "600519.SH" },
    status: "success",
    execution_id: "exec-1",
    fallback_used: false,
    missing_fields: [],
  });
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /secret-provider|secret-route|secret-token|provider_id/);
});

test("uses an explicit second CAP and marks the result as degraded fallback evidence", async () => {
  const details = {
    "MKT.L1.RT": detail({
      capability_id: "MKT.L1.RT",
      params: [{ name: "symbol", type: "string", required: true }],
      field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "price" }] },
    }),
    "MKT.BARS.ADJUSTED": detail({
      capability_id: "MKT.BARS.ADJUSTED",
      params: [
        { name: "symbol", type: "string", required: true },
        { name: "start_date", type: "date", required: false },
        { name: "end_date", type: "date", required: false },
      ],
      field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "close" }] },
    }),
  };
  const client = fallbackTransport(details, {
    "MKT.L1.RT": [{ success: false, execution_id: "quote-failed", reason_code: "provider_business_error" }],
    "MKT.BARS.ADJUSTED": [{ success: true, execution_id: "bars-ok", result: { data: [{ symbol: "600519.SH", date: "2026-07-17", close: 1400 }] } }],
  });
  const result = await executeFinanceCapabilityChain({
    requests: [
      { capability: "qveris_finance.mkt_l1_rt", parameters: { symbol: "600519.SH" }, evidence_status: "complete" },
      {
        capability: "qveris_finance.mkt_bars_adjusted",
        parameters: { symbol: "600519.SH", start_date: "2026-07-17", end_date: "2026-07-17" },
        evidence_status: "proxy_only",
        degradation_reason: "latest_completed_session_close_not_realtime",
      },
    ],
    transport: client,
  });
  assert.equal(result.success, true);
  assert.equal(result.canonical_name, "qveris_finance.mkt_bars_adjusted");
  assert.equal(result.evidence_status, "proxy_only");
  assert.equal(result.fallback_audit.schema_version, CAPABILITY_FALLBACK_SCHEMA_VERSION);
  assert.equal(result.fallback_audit.selected_capability_index, 2);
  assert.equal(result.fallback_audit.degradation_reason, "latest_completed_session_close_not_realtime");
  assert.deepEqual(result.observed_calls.map((call) => call.execution_id), ["quote-failed", "quote-failed", "quote-failed", "bars-ok"]);
  assert.equal(result.qveris_trace.at(-1).fallback_used, true);
});

test("does not cross to another CAP after a semantic failure unless explicitly allowed", async () => {
  const details = {
    "MKT.L1.RT": detail({
      capability_id: "MKT.L1.RT",
      params: [{ name: "symbol", type: "string", required: true }],
      field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "price" }] },
    }),
    "MKT.BARS.ADJUSTED": detail({
      capability_id: "MKT.BARS.ADJUSTED",
      params: [{ name: "symbol", type: "string", required: true }],
      field_spec: { required: [{ name: "symbol" }, { name: "date" }, { name: "close" }] },
    }),
  };
  const client = fallbackTransport(details, {
    "MKT.L1.RT": [{ success: true, execution_id: "wrong-entity", result: { data: [{ symbol: "000001.SZ", date: "2026-07-17", price: 1 }] } }],
    "MKT.BARS.ADJUSTED": [{ success: true, execution_id: "must-not-run", result: { data: [{ symbol: "600519.SH", date: "2026-07-17", close: 1400 }] } }],
  });
  const result = await executeFinanceCapabilityChain({
    requests: [
      { capability: "qveris_finance.mkt_l1_rt", parameters: { symbol: "600519.SH" } },
      { capability: "qveris_finance.mkt_bars_adjusted", parameters: { symbol: "600519.SH" }, evidence_status: "proxy_only" },
    ],
    transport: client,
  });
  assert.equal(result.success, false);
  assert.equal(result.fallback_audit.attempts.length, 1);
  assert.equal(client.calls.length, 1);
});

test("rejects implicit, duplicate, or overlong CAP fallback chains", async () => {
  const client = fallbackTransport({}, {});
  await assert.rejects(executeFinanceCapabilityChain({ requests: [], transport: client }), (error) => error.code === "fallback_chain_required");
  await assert.rejects(executeFinanceCapabilityChain({
    requests: [
      { capability: "qveris_finance.mkt_l1_rt" },
      { capability: "qveris_finance.mkt_l1_rt" },
    ],
    transport: client,
  }), (error) => error.code === "duplicate_fallback_capability");
  await assert.rejects(executeFinanceCapabilityChain({
    requests: [1, 2, 3, 4].map((value) => ({ capability: `qveris_finance.test_${value}` })),
    transport: client,
  }), (error) => error.code === "fallback_chain_limit");
});
