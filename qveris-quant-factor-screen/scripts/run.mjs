#!/usr/bin/env node

import { countRecords, genericEvidence, resultPayload, runCli, usTicker } from "../../qveris-finance-common/runner.mjs";

function universe(opts) {
  return opts.universe?.length ? opts.universe : opts.tickers?.length ? opts.tickers : ["AAPL", "MSFT", "NVDA", "AMD", "AVGO"];
}

function payloadRecords(call) {
  const payload = resultPayload(call?.raw_result);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return payload && typeof payload === "object" ? [payload] : [];
}

function numberField(row, keys) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function findSuccessfulCall(calls, role) {
  return calls.find((call) => call.role === role && call.ok !== false && countRecords(resultPayload(call.raw_result)) > 0);
}

function roleSatisfied(calls, role) {
  return Boolean(findSuccessfulCall(calls, role));
}

function missingRole(calls, role) {
  if (roleSatisfied(calls, role)) return null;
  const last = [...calls].reverse().find((call) => call.role === role);
  return `${role}: ${last?.error || "provider returned unsuccessful status"}`;
}

function extractTechnicalValue(call) {
  const text = JSON.stringify(resultPayload(call?.raw_result));
  const rocr = Number(text.match(/"ROCR"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  if (Number.isFinite(rocr)) return { raw: rocr, score: Math.max(0, Math.min(1, (rocr - 0.9) / 0.25)) };
  const upper = Number(text.match(/Real Upper Band"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  const lower = Number(text.match(/Real Lower Band"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  if (Number.isFinite(upper) && Number.isFinite(lower) && upper > lower) {
    return { raw: Number((upper - lower).toFixed(4)), score: 0.5 };
  }
  return { raw: null, score: null };
}

function scoredRows(opts, calls) {
  const names = universe(opts);
  const scoredSymbol = names[0];
  const ratios = payloadRecords(findSuccessfulCall(calls, "valuation_ratios"))[0] || {};
  const floatData = payloadRecords(findSuccessfulCall(calls, "liquidity_float"))[0] || {};
  const quote = payloadRecords(findSuccessfulCall(calls, "quote_snapshot"))[0] || {};
  const technical = extractTechnicalValue(findSuccessfulCall(calls, "momentum_or_volatility"));
  const pe = numberField(ratios, ["priceEarningsRatio", "peRatio", "priceToEarningsRatio", "priceEarnings"]);
  const roe = numberField(ratios, ["returnOnEquity", "roe", "returnOnEquityRatio"]);
  const floatShares = numberField(floatData, ["floatShares", "freeFloat", "sharesFloat"]);
  const quoteChange = numberField(quote, ["dp", "change_p", "changePercent", "percent_change"]);
  const valuationScore = pe == null || pe <= 0 ? null : Math.max(0, Math.min(1, 1 - pe / 60));
  const qualityScore = roe == null ? null : Math.max(0, Math.min(1, roe > 2 ? roe / 200 : roe));
  const liquidityScore = floatShares == null ? null : Math.max(0, Math.min(1, Math.log10(Math.max(floatShares, 10)) / 10));
  const quoteScore = quoteChange == null ? null : Math.max(0, Math.min(1, 0.5 + quoteChange / 20));
  const components = {
    valuation: valuationScore,
    quality: qualityScore,
    liquidity: liquidityScore,
    momentum: technical.score,
    quote_reaction: quoteScore,
  };
  const weights = {
    valuation: 0.25,
    quality: 0.25,
    liquidity: 0.2,
    momentum: 0.2,
    quote_reaction: 0.1,
  };
  const present = Object.entries(components).filter(([, value]) => Number.isFinite(value));
  const weightedTotal = present.reduce((sum, [key, value]) => sum + value * weights[key], 0);
  const usedWeight = present.reduce((sum, [key]) => sum + weights[key], 0);
  const score = usedWeight ? Number((weightedTotal / usedWeight).toFixed(3)) : null;
  const firstRow = {
    rank: score == null ? null : 1,
    symbol: scoredSymbol,
    score,
    data_status: score == null ? "missing" : names.length === 1 ? "complete" : "partial",
    raw_fields: {
      pe,
      roe,
      float_shares: floatShares,
      quote_change_pct: quoteChange,
      technical: technical.raw,
    },
    normalized_scores: components,
    missing_factors: Object.entries(components).filter(([, value]) => !Number.isFinite(value)).map(([key]) => key),
  };
  const rows = [
    firstRow,
    ...names.slice(1).map((symbol) => ({
      rank: null,
      symbol,
      score: null,
      data_status: "not_fetched_under_budget",
      raw_fields: {},
      normalized_scores: {},
      missing_factors: ["valuation", "quality", "liquidity", "momentum", "quote_reaction"],
    })),
  ];
  return { rows, weights };
}

function analyze({ opts, calls }) {
  const names = universe(opts);
  const evidence = calls.map(genericEvidence);
  const calledRoles = new Set(calls.map((call) => call.role));
  const factorSet = ["momentum", "valuation", "liquidity", "volatility", "quality", "news_risk"];
  const { rows, weights } = scoredRows(opts, calls);
  const rankingReady = rows.length > 0 && rows.every((row) => row.data_status === "complete");
  const missingOutputs = [
    rankingReady ? null : "complete_universe_factor_panel",
    roleSatisfied(calls, "quote_snapshot") ? null : "quote_reaction_scores",
    "news_risk_factor",
  ].filter(Boolean);
  const missingData = ["valuation_ratios", "liquidity_float", "quote_snapshot", "momentum_or_volatility"]
    .map((role) => missingRole(calls, role))
    .filter(Boolean);
  const findings = [
    `Screen universe contains ${names.length} tickers: ${names.join(", ")}.`,
    `Factor coverage attempted: ${[...calledRoles].join(", ") || "none"}.`,
    `Generated a ${rows.length}-row ranking table with ${rows.filter((row) => row.score != null).length} scored ticker(s).`,
    "Ranking exposes raw fields, normalized scores, missing-field flags, factor weights, and tie-break rules.",
  ];
  return {
    scope: {
      universe: names,
      market: opts.market,
      window_days: opts.windowDays,
      factor_set: factorSet,
    },
    findings,
    evidence,
    risks: [
      "Do not rank missing fundamentals as neutral without flagging the gap.",
      "Provider coverage can vary by market and ticker.",
      "This is a research screen, not a buy/sell recommendation.",
    ],
    result: {
      universe: names,
      factor_set: factorSet,
      coverage_roles: [...calledRoles],
      scoring_version: "deterministic-preview-2026-07-03",
      ranking_ready: rankingReady,
      coverage_level: rankingReady ? "complete" : rows.some((row) => row.score != null) ? "partial" : "none",
      ranking_table: rows,
      factor_weights: weights,
      tie_break_rules: [
        "Prefer higher total score.",
        "If scores tie, prefer more non-missing factors.",
        "If still tied, prefer higher liquidity score.",
        "Do not promote a ticker with missing fundamentals above a fully covered ticker on model judgement alone.",
      ],
      missing_outputs: missingOutputs,
      missing_data: missingData,
    },
  };
}

const config = {
  id: "qveris-quant-factor-screen",
  title: "Quant Factor Screen",
  toolCategories: [
    {
      key: "fundamentals_valuation",
      query: "stock factor screening fundamentals valuation financial ratios API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "quote_liquidity",
      query: "stock quote OHLCV liquidity shares float API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "technical_momentum",
      query: "technical indicators momentum volatility stock API",
      limit: 5,
      inspectLimit: 5,
    },
  ],
  callPlan: [
    {
      role: "valuation_ratios",
      category: "fundamentals_valuation",
      preferredToolIds: ["financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef"],
      buildParams: (opts) => ({ symbol: universe(opts)[0], limit: 1, period: "annual" }),
    },
    {
      role: "liquidity_float",
      category: "quote_liquidity",
      preferredToolIds: ["financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f"],
      buildParams: (opts) => ({ symbol: universe(opts)[0] }),
    },
    {
      role: "quote_snapshot",
      category: "quote_liquidity",
      preferredToolIds: [
        "eodhd.live_v2.us_quote_delayed.retrieve.v1.f0e13d45",
        "eodhd.live_data.real_time.retrieve.v1.b60a4285",
        "finnhub_io_api.stock.quote",
      ],
      buildParams: (opts, tool) =>
        String(tool.tool_id).includes("live_v2")
          ? { s: usTicker(universe(opts)[0]), "page[limit]": 1, fmt: "json" }
          : String(tool.tool_id).startsWith("eodhd.")
          ? { symbol: usTicker(universe(opts)[0]), fmt: "json" }
          : { symbol: universe(opts)[0] },
    },
    {
      role: "momentum_or_volatility",
      category: "technical_momentum",
      preferredToolIds: ["alphavantage.technical-indicators.bbands.v1", "alphavantage.rocr.list.v1.467a92c0", "alphavantage.mom.retrieve.v1.467a92c0"],
      strictPreferred: true,
      buildParams: (opts, tool) =>
        String(tool.tool_id).includes("bbands")
          ? {
              function: "BBANDS",
              symbol: universe(opts)[0],
              interval: "daily",
              time_period: 20,
              series_type: "close",
            }
          : {
              function: "ROCR",
              symbol: universe(opts)[0],
              interval: "daily",
              time_period: 60,
              series_type: "close",
            },
    },
  ],
  inputSummary: (opts) => ({
    universe: universe(opts),
    market: opts.market,
    factor_set: ["momentum", "valuation", "liquidity", "volatility", "quality", "news_risk"],
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

runCli(config, {
  universe: ["AAPL", "MSFT", "NVDA", "AMD", "AVGO"],
  market: "US",
  windowDays: 90,
  maxPaidCalls: 4,
  maxCredits: 80,
});
