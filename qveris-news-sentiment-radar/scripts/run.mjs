#!/usr/bin/env node

import {
  dateNDaysBefore,
  genericEvidence,
  runCli,
  toAlphaVantageTimestamp,
  usTicker,
} from "../../qveris-finance-common/runner.mjs";

function primaryTicker(opts) {
  return (opts.tickers?.[0] || opts.ticker || "NVDA").toUpperCase();
}

function extractSentimentLabels(calls) {
  const text = JSON.stringify(calls.map((call) => call.raw_result || call.error || ""));
  const positive = (text.match(/positive|bullish|optimistic/gi) || []).length;
  const negative = (text.match(/negative|bearish|pessimistic/gi) || []).length;
  const neutral = (text.match(/neutral/gi) || []).length;
  return { positive, negative, neutral };
}

function sentimentLevel(labels, totalRecords) {
  if (!totalRecords) return "insufficient_data";
  if (labels.positive > labels.negative * 1.25) return "positive";
  if (labels.negative > labels.positive * 1.25) return "negative";
  return "mixed";
}

function analyze({ opts, calls }) {
  const evidence = calls.map(genericEvidence);
  const labels = extractSentimentLabels(calls);
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const findings = [
    `Reviewed ${primaryTicker(opts)} over a ${opts.windowDays}-day window with ${calls.length} QVeris call attempts.`,
    `Observed ${totalRecords} raw records or nested payload rows across selected sources.`,
    `Sentiment text mentions in returned payload: ${labels.positive} positive, ${labels.negative} negative, ${labels.neutral} neutral.`,
    "Use strong labels only when news, filings, or quote reaction agree; otherwise mark the catalyst as weak or unresolved.",
  ];
  const risks = [
    "News volume is not the same as market relevance.",
    "Social or insider-sentiment signals need confirmation from filings, reputable news, or price reaction.",
    "Missing provider coverage should be shown explicitly rather than filled by model memory.",
  ];
  return {
    scope: {
      ticker: primaryTicker(opts),
      market: opts.market,
      window_days: opts.windowDays,
      from: dateNDaysBefore(opts.asOf, opts.windowDays),
      to: opts.asOf,
    },
    findings,
    evidence,
    risks,
    result: {
      ticker: primaryTicker(opts),
      sentiment_counts: labels,
      total_records: totalRecords,
      signal_level: sentimentLevel(labels, totalRecords),
      catalyst_status: totalRecords ? "needs_confirmation" : "insufficient_data",
      evidence_roles: evidence.map((row) => row.role),
      missing_data: evidence
        .filter((row) => row.ok === false || !row.record_count)
        .map((row) => `${row.role}: ${row.error || "no returned records or provider returned unsuccessful status"}`),
    },
  };
}

const config = {
  id: "qveris-news-sentiment-radar",
  title: "News Sentiment Radar",
  toolCategories: [
    {
      key: "news_sentiment",
      query: "stock news sentiment filings quote reaction API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "market_reaction",
      query: "real-time stock quote and historical OHLCV data API",
      limit: 5,
      inspectLimit: 4,
    },
    {
      key: "filings",
      query: "SEC filings company announcements stock API",
      limit: 5,
      inspectLimit: 4,
    },
  ],
  callPlan: [
    {
      role: "market_news_sentiment",
      category: "news_sentiment",
      preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0"],
      buildParams: (opts) => ({
        function: "NEWS_SENTIMENT",
        tickers: primaryTicker(opts),
        time_from: toAlphaVantageTimestamp(dateNDaysBefore(opts.asOf, opts.windowDays)),
        time_to: toAlphaVantageTimestamp(opts.asOf),
        sort: "LATEST",
        limit: String(opts.limit || 10),
      }),
    },
    {
      role: "aggregate_sentiment",
      category: "news_sentiment",
      preferredToolIds: ["eodhd.sentiments.list.v1.9ba159a0"],
      buildParams: (opts) => ({
        s: usTicker(primaryTicker(opts)),
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "filings_check",
      category: "filings",
      preferredToolIds: ["finnhub.stock.filings.retrieve.v1.b6619ba1"],
      buildParams: (opts) => ({
        symbol: primaryTicker(opts),
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "price_reaction",
      category: "market_reaction",
      preferredToolIds: ["finnhub_io_api.stock.quote", "eodhd.live_data.real_time.retrieve.v1.b60a4285"],
      buildParams: (opts, tool) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? { symbol: usTicker(primaryTicker(opts)), fmt: "json" }
          : { symbol: primaryTicker(opts) },
    },
  ],
  inputSummary: (opts) => ({
    ticker: primaryTicker(opts),
    market: opts.market,
    window_days: opts.windowDays,
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

runCli(config, {
  ticker: "NVDA",
  market: "US",
  windowDays: 7,
  maxPaidCalls: 4,
  maxCredits: 30,
  limit: 10,
});
