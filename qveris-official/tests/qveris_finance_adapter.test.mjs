import assert from "node:assert/strict";
import test from "node:test";

import {
  executeFinanceCapability,
  inspectFinanceCapability,
  normalizeCnSymbol,
  prepareCapabilityParameters,
  resolveFinanceCapability,
} from "../scripts/qveris_finance_adapter.mjs";

const BARS_DETAIL = {
  capability_id: "MKT.BARS.EOD",
  params: [
    { name: "symbol", type: "string", required: true },
    { name: "start_date", type: "date", required: true },
    { name: "end_date", type: "date", required: true },
    { name: "limit", type: "integer", required: false },
    { name: "adjusted", type: "boolean", required: false },
  ],
  examples: {
    sample_parameters: {
      start_date: "2026-07-01",
      end_date: "2026-07-18",
    },
  },
};

test("resolves logical and stale CAP names from the live catalog without a static ID map", () => {
  const capabilities = [
    { capability_id: "MKT.L1.RT" },
    { capability_id: "SENTIMENT.TEXT_SIGNALS" },
    { capability_id: "EARNINGS.ACTUAL.SURPRISE" },
  ];

  assert.equal(
    resolveFinanceCapability({
      requestedCapability: "qveris_finance.sentiment_text_signals",
      capabilities,
    }).capability_id,
    "SENTIMENT.TEXT_SIGNALS",
  );
  assert.equal(
    resolveFinanceCapability({
      requestedCapability: "EARNINGS.ACTUAL_SURPRISE",
      capabilities,
    }).capability_id,
    "EARNINGS.ACTUAL.SURPRISE",
  );
});

test("reads live cap-detail and falls back only to the matching live catalog row", async () => {
  let detailCalls = 0;
  const catalogRow = { ...BARS_DETAIL, description: "live catalog" };
  const client = {
    async listCapabilities() {
      return { results: [catalogRow], total: 1 };
    },
    async getCapability({ capabilityId }) {
      detailCalls += 1;
      assert.equal(capabilityId, "MKT.BARS.EOD");
      const error = new Error("detail endpoint unavailable");
      error.status = 404;
      throw error;
    },
  };

  const inspected = await inspectFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.mkt_bars_eod",
  });

  assert.equal(detailCalls, 1);
  assert.equal(inspected.capability_id, "MKT.BARS.EOD");
  assert.equal(inspected.detail_source, "live_catalog_fallback");
  assert.match(inspected.detail_warning, /404/);
});

test("retries one transient control-plane fetch failure and records the recovery", async () => {
  let catalogCalls = 0;
  let detailCalls = 0;
  const client = {
    async listCapabilities() {
      catalogCalls += 1;
      if (catalogCalls === 1) throw new TypeError("fetch failed");
      return { results: [BARS_DETAIL], total: 1 };
    },
    async getCapability() {
      detailCalls += 1;
      return BARS_DETAIL;
    },
  };

  const inspected = await inspectFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.mkt_bars_eod",
    controlPlaneRetryDelayMs: 0,
  });

  assert.equal(catalogCalls, 2);
  assert.equal(detailCalls, 1);
  assert.deepEqual(inspected.control_plane_retry_events, [{
    phase: "capability_catalog_page_1",
    reason: "transient_fetch_failure",
    attempt: 2,
  }]);
});

test("retries a transient cap-detail fetch failure without reloading the catalog", async () => {
  let catalogCalls = 0;
  let detailCalls = 0;
  const client = {
    async listCapabilities() {
      catalogCalls += 1;
      return { results: [BARS_DETAIL], total: 1 };
    },
    async getCapability() {
      detailCalls += 1;
      if (detailCalls === 1) throw new TypeError("fetch failed");
      return BARS_DETAIL;
    },
  };

  const inspected = await inspectFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.mkt_bars_eod",
    controlPlaneRetryDelayMs: 0,
  });

  assert.equal(catalogCalls, 1);
  assert.equal(detailCalls, 2);
  assert.deepEqual(inspected.control_plane_retry_events, [{
    phase: "capability_detail",
    reason: "transient_fetch_failure",
    attempt: 2,
  }]);
});

test("does not retry non-network control-plane errors", async () => {
  let catalogCalls = 0;
  const client = {
    async listCapabilities() {
      catalogCalls += 1;
      const error = new Error("unauthorized");
      error.status = 401;
      throw error;
    },
  };

  await assert.rejects(
    () => inspectFinanceCapability({
      client,
      apiKey: "test-key",
      requestedCapability: "qveris_finance.mkt_bars_eod",
      controlPlaneRetryDelayMs: 0,
    }),
    /unauthorized/,
  );
  assert.equal(catalogCalls, 1);
});

test("normalizes Shanghai and Shenzhen symbol forms without guessing ambiguous exchanges", () => {
  assert.equal(normalizeCnSymbol("600519.SS"), "600519.SH");
  assert.equal(normalizeCnSymbol("600519.sh"), "600519.SH");
  assert.equal(normalizeCnSymbol("000001.sz"), "000001.SZ");
  assert.equal(normalizeCnSymbol("600519"), "600519.SH");
  assert.equal(normalizeCnSymbol("000001"), "000001.SZ");
  assert.equal(normalizeCnSymbol("sh600519"), "600519.SH");
  assert.throws(() => normalizeCnSymbol("830799"), /explicit exchange suffix/i);
});

test("filters unknown params, fills required params from live detail, and coerces declared types", () => {
  const prepared = prepareCapabilityParameters({
    detail: BARS_DETAIL,
    parameters: {
      symbol: "600519.SS",
      limit: "5",
      adjusted: "true",
      provider: "must-not-leak",
      route: "must-not-leak",
    },
  });

  assert.deepEqual(prepared.parameters, {
    symbol: "600519.SH",
    start_date: "2026-07-01",
    end_date: "2026-07-18",
    limit: 5,
    adjusted: true,
  });
  assert.deepEqual(
    prepared.dropped_params.map(({ name, reason }) => ({ name, reason })),
    [
      { name: "provider", reason: "not_in_cap_detail" },
      { name: "route", reason: "not_in_cap_detail" },
    ],
  );
  assert.deepEqual(
    prepared.filled_params.map(({ name, source }) => ({ name, source })),
    [
      { name: "start_date", source: "cap_detail_example" },
      { name: "end_date", source: "cap_detail_example" },
    ],
  );
});

test("rejects calls when live cap-detail cannot define an allow-list", () => {
  assert.throws(
    () => prepareCapabilityParameters({
      detail: { capability_id: "MKT.L1.RT", params: [] },
      parameters: { symbol: "AAPL" },
    }),
    /parameter schema.*unavailable/i,
  );
});

test("reports missing required params with accepted names and types", () => {
  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "FUNDAMENTALS.IS",
        params: [
          { name: "symbol", type: "string", required: true },
          { name: "period", type: "string", required: true },
        ],
      },
      parameters: { symbol: "NVDA" },
    }),
    /Missing required CAP parameters: period.*symbol:string.*period:string/is,
  );
});

test("normalizes market case before enforcing live enum values and rejects invalid calendar dates", () => {
  const prepared = prepareCapabilityParameters({
    detail: {
      capability_id: "MKT.L1.RT",
      params: [
        { name: "symbol", type: "string", required: true },
        { name: "market", type: "string", required: false, enum: ["CN", "US"] },
      ],
    },
    parameters: { symbol: "NVDA", market: "us" },
  });
  assert.deepEqual(prepared.parameters, { symbol: "NVDA", market: "US" });

  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "MKT.BARS.EOD",
        params: [
          { name: "symbol", type: "string", required: true },
          { name: "start_date", type: "date", required: true },
        ],
      },
      parameters: { symbol: "NVDA", start_date: "2026-02-30" },
    }),
    /ISO date/i,
  );
});

test("never fills a missing security identity from a cap-detail example", () => {
  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "MKT.L1.RT",
        params: [{ name: "symbol", type: "string", required: true }],
        examples: { sample_parameters: { symbol: "AAPL" } },
      },
      parameters: {},
    }),
    /Missing required CAP parameters: symbol/i,
  );
});

test("never fills crypto address, chain, network, or pair identity from examples", () => {
  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "CRYPTO.WHALE",
        params: [
          { name: "symbol", type: "string", required: true },
          { name: "address", type: "string", required: true },
          { name: "network", type: "string", required: true },
        ],
        examples: {
          sample_parameters: {
            symbol: "ETH",
            address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
            network: "ETH",
          },
        },
      },
      parameters: { symbol: "BTC" },
    }),
    /Missing required CAP parameters: address, network/i,
  );

  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "CRYPTO.SPOT.RT",
        params: [{ name: "pair", type: "string", required: true }],
        examples: { sample_parameters: { pair: "BTCUSDT" } },
      },
      parameters: {},
    }),
    /Missing required CAP parameters: pair/i,
  );
});

test("rejects a normalized A-share symbol paired with a conflicting market", () => {
  assert.throws(
    () => prepareCapabilityParameters({
      detail: {
        capability_id: "MKT.L1.RT",
        params: [
          { name: "symbol", type: "string", required: true },
          { name: "market", type: "string", required: false },
        ],
      },
      parameters: { symbol: "600519.SS", market: "US" },
    }),
    /conflicts with market 'US'/i,
  );
});

test("retries parameter failures once with minimal params and records exact observed trace", async () => {
  const queryParams = [];
  const client = {
    async listCapabilities() {
      return {
        results: [{
          capability_id: "MKT.L1.RT",
          params: [
            { name: "symbol", type: "string", required: true },
            { name: "market", type: "string", required: false },
            { name: "limit", type: "integer", required: false },
          ],
        }],
        total: 1,
      };
    },
    async getCapability() {
      return {
        capability_id: "MKT.L1.RT",
        params: [
          { name: "symbol", type: "string", required: true },
          { name: "market", type: "string", required: false },
          { name: "limit", type: "integer", required: false },
        ],
      };
    },
    async queryCapability({ parameters }) {
      queryParams.push(parameters);
      if (queryParams.length === 1) {
        return {
          success: false,
          execution_id: "attempt-1",
          error_message: "18 candidates exhausted; dominant_error=missing_required_input:market",
          result: { error_type: "all_candidates_failed", provider: "hidden" },
        };
      }
      return {
        success: true,
        execution_id: "attempt-2",
        data: { price: 1500, route: "hidden" },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.mkt_l1_rt",
    parameters: {
      symbol: "600519.SS",
      market: "CN",
      limit: "5",
      candidate: "must-not-leak",
    },
    now: () => "2026-07-18T00:00:00.000Z",
  });

  assert.deepEqual(queryParams, [
    { symbol: "600519.SH", market: "CN", limit: 5 },
    { symbol: "600519.SH", limit: 5 },
  ]);
  assert.deepEqual(execution.final_params, { symbol: "600519.SH", limit: 5 });
  assert.equal(execution.observed_calls.length, 2);
  assert.deepEqual(execution.qveris_trace, [
    {
      tool_name: "qveris_finance.mkt_l1_rt",
      params: { symbol: "600519.SH", market: "CN", limit: 5 },
      status: "failed",
      execution_id: "attempt-1",
      fallback_used: false,
      missing_fields: ["all_candidates_failed"],
    },
    {
      tool_name: "qveris_finance.mkt_l1_rt",
      params: { symbol: "600519.SH", limit: 5 },
      status: "success",
      execution_id: "attempt-2",
      fallback_used: true,
      missing_fields: [],
    },
  ]);
  assert.equal(execution.parameter_audit.dropped_params[0].name, "candidate");
  assert.equal("provider" in execution.observed_calls[0].response.result, false);
  assert.equal("route" in execution.response.data, false);
});

test("honors a one-attempt budget and suppresses an otherwise valid retry", async () => {
  let calls = 0;
  const detail = {
    capability_id: "CRYPTO.SPOT.RT",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "limit", type: "integer", required: false },
    ],
  };
  const client = {
    async listCapabilities() {
      return { results: [detail], total: 1 };
    },
    async getCapability() {
      return detail;
    },
    async queryCapability() {
      calls += 1;
      return {
        success: false,
        execution_id: "crypto-budget-1",
        result: { error_type: "invalid_parameters" },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.crypto_spot_rt",
    parameters: { symbol: "BTC", limit: 1 },
    maxAttempts: 1,
  });

  assert.equal(calls, 1);
  assert.equal(execution.observed_calls.length, 1);
  assert.deepEqual(execution.retry_events, []);
});

test("uses required-plus-identity minimal params when the error names no optional field", async () => {
  const queryParams = [];
  const detail = {
    capability_id: "MKT.L1.RT",
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "market", type: "string", required: false },
      { name: "limit", type: "integer", required: false },
    ],
  };
  const client = {
    async listCapabilities() {
      return { results: [detail], total: 1 };
    },
    async getCapability() {
      return detail;
    },
    async queryCapability({ parameters }) {
      queryParams.push(parameters);
      return queryParams.length === 1
        ? { success: false, execution_id: "minimal-1", result: { error_type: "invalid_parameters" } }
        : { success: true, execution_id: "minimal-2", data: { price: 1 } };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.mkt_l1_rt",
    parameters: { symbol: "NVDA", market: "US", limit: 3 },
  });

  assert.deepEqual(queryParams, [
    { symbol: "NVDA", market: "US", limit: 3 },
    { symbol: "NVDA" },
  ]);
  assert.equal(execution.retry_events[0].reason, "minimal_parameters_after_parameter_error");
});

test("does not retry non-parameter failures", async () => {
  let calls = 0;
  const detail = {
    capability_id: "NEWS.FIN.TAGGED",
    params: [{ name: "symbol", type: "string", required: true }],
  };
  const client = {
    async listCapabilities() {
      return { results: [detail], total: 1 };
    },
    async getCapability() {
      return detail;
    },
    async queryCapability() {
      calls += 1;
      return {
        success: false,
        execution_id: "news-1",
        error_message: "upstream temporarily unavailable",
        result: { error_type: "provider_error" },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.news_fin_tagged",
    parameters: { symbol: "NVDA" },
  });

  assert.equal(calls, 1);
  assert.equal(execution.observed_calls.length, 1);
  assert.equal(execution.qveris_trace[0].status, "failed");
});

test("retries once when a transient failure is explicitly marked retryable", async () => {
  let calls = 0;
  const detail = {
    capability_id: "CRYPTO.SPOT.RT",
    params: [{ name: "symbol", type: "string", required: true }],
  };
  const client = {
    async listCapabilities() {
      return { results: [detail], total: 1 };
    },
    async getCapability() {
      return detail;
    },
    async queryCapability({ parameters }) {
      calls += 1;
      if (calls === 1) {
        return {
          success: false,
          execution_id: "transient-1",
          parameters,
          error_message: "upstream timeout",
          execution_outcome: {
            retryable: true,
            reason_code: "provider.timeout",
          },
        };
      }
      return {
        success: true,
        execution_id: "transient-2",
        parameters,
        result: { data: { symbol: "BTC", price: 65000 } },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.crypto_spot_rt",
    parameters: { symbol: "BTC" },
    maxAttempts: 2,
    now: () => "2026-07-24T00:00:00.000Z",
  });

  assert.equal(calls, 2);
  assert.deepEqual(execution.retry_events, [{
    reason: "explicitly_retryable_transient_failure",
    reason_code: "provider.timeout",
  }]);
  assert.deepEqual(execution.qveris_trace.map(({ status, fallback_used }) => ({ status, fallback_used })), [
    { status: "failed", fallback_used: false },
    { status: "success", fallback_used: true },
  ]);
});

test("does not retry a deterministic invalid value even when the server marks it retryable", async () => {
  let calls = 0;
  const detail = {
    capability_id: "RATES.INTERBANK.BENCHMARK",
    params: [{ name: "rate_type", type: "string", required: true }],
  };
  const client = {
    async listCapabilities() { return { results: [detail], total: 1 }; },
    async getCapability() { return detail; },
    async queryCapability({ parameters }) {
      calls += 1;
      return {
        success: false,
        execution_id: "invalid-rate-type",
        parameters,
        error_message: "Invalid rate_type 'sofr'. Must be one of: treasury, shibor, fx",
        result: { status_code: 503, error_type: "all_candidates_failed" },
        execution_outcome: { retryable: true, reason_code: "all_candidates_failed" },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.rates_interbank_benchmark",
    parameters: { rate_type: "sofr" },
    maxAttempts: 2,
  });

  assert.equal(calls, 1);
  assert.deepEqual(execution.retry_events, []);
  assert.equal(execution.observed_calls.length, 1);
});

test("retries once when the capability query throws fetch failed", async () => {
  let calls = 0;
  const detail = {
    capability_id: "CRYPTO.SPOT.RT",
    params: [{ name: "symbol", type: "string", required: true }],
  };
  const client = {
    async listCapabilities() {
      return { results: [detail], total: 1 };
    },
    async getCapability() {
      return detail;
    },
    async queryCapability({ parameters }) {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return {
        success: true,
        execution_id: "fetch-recovered-2",
        parameters,
        result: { data: { symbol: "BTC", price: 65000 } },
      };
    },
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.crypto_spot_rt",
    parameters: { symbol: "BTC" },
    maxAttempts: 2,
    now: () => "2026-07-24T00:00:00.000Z",
  });

  assert.equal(calls, 2);
  assert.deepEqual(execution.retry_events, [{
    reason: "explicitly_retryable_transient_failure",
    reason_code: "transport_error",
  }]);
  assert.deepEqual(execution.qveris_trace.map(({ status, fallback_used }) => ({ status, fallback_used })), [
    { status: "failed", fallback_used: false },
    { status: "success", fallback_used: true },
  ]);
});

test("retrieves approved full content with one fetch-failed retry", async () => {
  const detail = { capability_id: "MACRO.INDICATORS", params: [{ name: "country", type: "string", required: false }] };
  const client = {
    async listCapabilities() { return { results: [detail], total: 1 }; },
    async getCapability() { return detail; },
    async queryCapability() {
      return {
        success: true,
        execution_id: "large-result",
        result: {
          truncated_content: "[{\"date\":",
          full_content_file_url: "https://oss.qveris.cloud/tool_result_cache/result.json?signature=secret",
        },
      };
    },
  };
  let fetches = 0;
  const fullContentFetch = async () => {
    fetches += 1;
    if (fetches === 1) throw new TypeError("fetch failed");
    return new Response(JSON.stringify([{ date: "2026-07-01", value: 1 }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const execution = await executeFinanceCapability({
    client,
    apiKey: "test-key",
    requestedCapability: "qveris_finance.macro_indicators",
    parameters: {},
    retrieveFullContent: true,
    fullContentFetch,
  });

  assert.equal(fetches, 2);
  assert.deepEqual(execution.response.result.data, [{ date: "2026-07-01", value: 1 }]);
  assert.equal(execution.response.result.content_retrieval.status, "success");
  assert.equal(execution.response.result.content_retrieval.attempts, 2);
  assert.equal(JSON.stringify(execution).includes("signature=secret"), false);
});
