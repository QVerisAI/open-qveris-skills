#!/usr/bin/env node

import { genericEvidence, runCli, usTicker } from "../../qveris-finance-common/runner.mjs";

function universe(opts) {
  return opts.universe?.length ? opts.universe : opts.tickers?.length ? opts.tickers : ["AAPL", "MSFT", "NVDA", "AMD", "AVGO"];
}

function analyze({ opts, calls }) {
  const names = universe(opts);
  const evidence = calls.map(genericEvidence);
  const calledRoles = new Set(calls.map((call) => call.role));
  const findings = [
    `Screen universe contains ${names.length} tickers: ${names.join(", ")}.`,
    `Factor coverage attempted: ${[...calledRoles].join(", ") || "none"}.`,
    "Initial deterministic factor set is momentum, valuation, liquidity, volatility, quality, and news-risk penalty.",
    "Ranking must expose raw fields, normalized scores, missing-field flags, factor weights, and tie-break rules.",
  ];
  return {
    scope: {
      universe: names,
      market: opts.market,
      window_days: opts.windowDays,
      factor_set: ["momentum", "valuation", "liquidity", "volatility", "quality", "news_risk"],
    },
    findings,
    evidence,
    risks: [
      "Do not rank missing fundamentals as neutral without flagging the gap.",
      "Provider coverage can vary by market and ticker.",
      "This is a research screen, not a buy/sell recommendation.",
    ],
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
      preferredToolIds: ["finnhub_io_api.stock.quote", "eodhd.live_data.real_time.retrieve.v1.b60a4285"],
      buildParams: (opts, tool) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? { symbol: usTicker(universe(opts)[0]), fmt: "json" }
          : { symbol: universe(opts)[0] },
    },
    {
      role: "momentum_or_volatility",
      category: "technical_momentum",
      preferredToolIds: ["alphavantage.rocr.list.v1.467a92c0", "alphavantage.technical-indicators.bbands.v1"],
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
