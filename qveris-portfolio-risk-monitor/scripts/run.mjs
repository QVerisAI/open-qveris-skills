#!/usr/bin/env node

import { dateNDaysBefore, genericEvidence, runCli, usTicker } from "../../qveris-finance-common/runner.mjs";

function holdings(opts) {
  if (opts.holdings?.length) return opts.holdings;
  const tickers = opts.tickers?.length ? opts.tickers : ["AAPL", "NVDA", "MSFT", "TSLA"];
  const weight = Number((100 / tickers.length).toFixed(2));
  return tickers.map((symbol) => ({ symbol, weight }));
}

function topHolding(rows) {
  return [...rows].sort((a, b) => b.weight - a.weight)[0] || { symbol: "N/A", weight: 0 };
}

function concentration(rows) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  return rows.reduce((sum, row) => sum + (row.weight / total) ** 2, 0);
}

function analyze({ opts, calls }) {
  const rows = holdings(opts);
  const top = topHolding(rows);
  const hhi = concentration(rows);
  const evidence = calls.map(genericEvidence);
  return {
    scope: {
      holdings: rows,
      market: opts.market,
      benchmark: opts.benchmark,
      window_days: opts.windowDays,
      from: dateNDaysBefore(opts.asOf, opts.windowDays),
      to: opts.asOf,
    },
    findings: [
      `Largest non-cash holding is ${top.symbol} at ${top.weight}%.`,
      `Portfolio concentration HHI is ${hhi.toFixed(3)}; values above 0.25 deserve concentration review.`,
      `Collected ${calls.length} QVeris call attempts across market, profile, historical, and news/catalyst roles.`,
      "Risk interpretation should separate measurable exposure from narrative catalyst risk.",
    ],
    evidence,
    risks: [
      "Weights must be normalized before comparing portfolios.",
      "Historical volatility and drawdown depend on lookback window and provider coverage.",
      "News/catalyst risk can be stale or incomplete without filings and earnings-calendar checks.",
    ],
  };
}

const config = {
  id: "qveris-portfolio-risk-monitor",
  title: "Portfolio Risk Monitor",
  toolCategories: [
    {
      key: "quote_history",
      query: "portfolio risk stock quote historical OHLCV volatility liquidity API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "profile_sector",
      query: "company fundamentals sector industry profile market data API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "news_calendar",
      query: "stock market news sentiment API by ticker",
      limit: 5,
      inspectLimit: 4,
    },
  ],
  callPlan: [
    {
      role: "quote_snapshot",
      category: "quote_history",
      preferredToolIds: ["finnhub_io_api.stock.quote", "eodhd.live_data.real_time.retrieve.v1.b60a4285"],
      buildParams: (opts, tool) => {
        const symbol = topHolding(holdings(opts)).symbol;
        return String(tool.tool_id).startsWith("eodhd.") ? { symbol: usTicker(symbol), fmt: "json" } : { symbol };
      },
    },
    {
      role: "historical_prices",
      category: "quote_history",
      preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      buildParams: (opts) => ({
        symbol: topHolding(holdings(opts)).symbol,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "profile_sector",
      category: "profile_sector",
      preferredToolIds: ["financialmodelingprep.stable.profile.retrieve.v1.0b443195"],
      buildParams: (opts) => ({ symbol: topHolding(holdings(opts)).symbol }),
    },
    {
      role: "news_catalyst",
      category: "news_calendar",
      preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0"],
      strictPreferred: true,
      buildParams: (opts) => ({
        function: "NEWS_SENTIMENT",
        tickers: topHolding(holdings(opts)).symbol,
        sort: "LATEST",
        limit: String(opts.limit || 10),
      }),
    },
  ],
  inputSummary: (opts) => ({
    holdings: holdings(opts),
    market: opts.market,
    benchmark: opts.benchmark,
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

runCli(config, {
  holdings: [
    { symbol: "AAPL", weight: 25 },
    { symbol: "NVDA", weight: 25 },
    { symbol: "MSFT", weight: 20 },
    { symbol: "TSLA", weight: 15 },
    { symbol: "CASH", weight: 15 },
  ],
  benchmark: "SPY",
  market: "US",
  windowDays: 30,
  maxPaidCalls: 4,
  maxCredits: 60,
});
