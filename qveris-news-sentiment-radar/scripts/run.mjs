#!/usr/bin/env node

import {
  countRecords,
  dateNDaysBefore,
  genericEvidence,
  resultPayload,
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

function roleSatisfied(calls, role) {
  return calls.some((call) => call.role === role && call.ok !== false && countRecords(resultPayload(call.raw_result)) > 0);
}

function missingRole(calls, role) {
  if (roleSatisfied(calls, role)) return null;
  const last = [...calls].reverse().find((call) => call.role === role);
  return `${role}: ${last?.error || "no returned records or provider returned unsuccessful status"}`;
}

function catalystScore(labels, calls) {
  const sentimentTotal = labels.positive + labels.negative + labels.neutral;
  const sentimentBias = sentimentTotal ? (labels.positive - labels.negative) / sentimentTotal : 0;
  const evidenceScore =
    Number(roleSatisfied(calls, "market_news_sentiment")) * 0.35 +
    Number(roleSatisfied(calls, "aggregate_sentiment")) * 0.25 +
    Number(roleSatisfied(calls, "filings_check")) * 0.2 +
    Number(roleSatisfied(calls, "price_reaction")) * 0.2;
  return Number(Math.max(0, Math.min(1, 0.5 + sentimentBias * 0.3 + evidenceScore * 0.2)).toFixed(3));
}

function analyze({ opts, calls }) {
  const evidence = calls.map(genericEvidence);
  const labels = extractSentimentLabels(calls);
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const missingData = ["market_news_sentiment", "aggregate_sentiment", "filings_check", "price_reaction"]
    .map((role) => missingRole(calls, role))
    .filter(Boolean);
  const score = catalystScore(labels, calls);
  const findings = [
    `Reviewed ${primaryTicker(opts)} over a ${opts.windowDays}-day window with ${calls.length} QVeris call attempts.`,
    `Observed ${totalRecords} raw records or nested payload rows across selected sources.`,
    `Sentiment text mentions in returned payload: ${labels.positive} positive, ${labels.negative} negative, ${labels.neutral} neutral.`,
    `Composite catalyst confidence score is ${score}; scores below 0.65 should stay in watchlist mode.`,
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
      catalyst_status: totalRecords && !missingData.length ? "confirmed_evidence_set" : totalRecords ? "needs_confirmation" : "insufficient_data",
      catalyst_confidence_score: score,
      corroborating_roles: ["market_news_sentiment", "aggregate_sentiment", "filings_check", "price_reaction"].filter((role) => roleSatisfied(calls, role)),
      evidence_roles: evidence.map((row) => row.role),
      missing_data: missingData,
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
      preferredToolIds: [
        "finnhub.stock.filings.retrieve.v1",
        "finnhub.stock.filings.retrieve.v1.27aa1125",
        "finnhub.stock.filings.retrieve.v1.b6619ba1",
      ],
      fallbackOnEmpty: true,
      maxAttempts: 2,
      buildParams: (opts) => ({
        symbol: primaryTicker(opts),
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "price_reaction",
      category: "market_reaction",
      preferredToolIds: ["eodhd.live_data.real_time.retrieve.v1.b60a4285", "finnhub_io_api.stock.quote", "finnhub.quote.retrieve.v1.f72cf5ef"],
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
