#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  countRecords,
  dateNDaysBefore,
  genericEvidence,
  resultPayload,
  runCli,
  toAlphaVantageTimestamp,
  usTicker,
} from "./lib/qveris-runtime.mjs";

function normalizeTicker(symbol) {
  return String(symbol || "").trim().toUpperCase().replace(/\.US$/, "");
}

function tickers(opts) {
  const names = opts.tickers?.length ? opts.tickers : [opts.ticker || "NVDA"];
  return [...new Set(names.map(normalizeTicker).filter(Boolean))];
}

function primaryTicker(opts) {
  return tickers(opts)[0] || "NVDA";
}

function callTarget(call) {
  const value = call?.target || call?.parameters?.tickers || call?.parameters?.symbol || call?.parameters?.s || "";
  return normalizeTicker(String(value).split(",")[0]);
}

function callsForTicker(calls, symbol, allTickers) {
  const wanted = normalizeTicker(symbol);
  const targeted = calls.filter((call) => callTarget(call) === wanted);
  if (targeted.length || allTickers.length > 1) return targeted;
  return calls;
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

function anyRoleSatisfied(calls, roles) {
  return roles.some((role) => roleSatisfied(calls, role));
}

function missingRole(calls, role) {
  if (roleSatisfied(calls, role)) return null;
  const last = [...calls].reverse().find((call) => call.role === role);
  return `${role}: ${last?.error || "no returned records or provider returned unsuccessful status"}`;
}

function missingConfirmation(calls) {
  if (anyRoleSatisfied(calls, ["filings_check", "issuer_confirmation"])) return null;
  const last = [...calls].reverse().find((call) => ["filings_check", "issuer_confirmation"].includes(call.role));
  return `filings_or_issuer_confirmation: ${last?.error || "no filings, issuer-news, or press-release confirmation records returned"}`;
}

function catalystScore(labels, calls) {
  const sentimentTotal = labels.positive + labels.negative + labels.neutral;
  const sentimentBias = sentimentTotal ? (labels.positive - labels.negative) / sentimentTotal : 0;
  const evidenceScore =
    Number(roleSatisfied(calls, "market_news_sentiment")) * 0.35 +
    Number(roleSatisfied(calls, "aggregate_sentiment")) * 0.25 +
    Number(anyRoleSatisfied(calls, ["filings_check", "issuer_confirmation"])) * 0.2 +
    Number(roleSatisfied(calls, "price_reaction")) * 0.2;
  return Number(Math.max(0, Math.min(1, 0.5 + sentimentBias * 0.3 + evidenceScore * 0.2)).toFixed(3));
}

function analyze({ opts, calls }) {
  const names = tickers(opts);
  const evidence = calls.map(genericEvidence);
  const tickerRows = names.map((ticker) => {
    const tickerCalls = callsForTicker(calls, ticker, names);
    const tickerEvidence = tickerCalls.map(genericEvidence);
    const labels = extractSentimentLabels(tickerCalls);
    const totalRecords = tickerEvidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
    const missingData = [
      ...["market_news_sentiment", "aggregate_sentiment", "price_reaction"].map((role) => missingRole(tickerCalls, role)),
      missingConfirmation(tickerCalls),
    ].filter(Boolean);
    const requiredEvidenceReady =
      roleSatisfied(tickerCalls, "market_news_sentiment") &&
      roleSatisfied(tickerCalls, "aggregate_sentiment") &&
      anyRoleSatisfied(tickerCalls, ["filings_check", "issuer_confirmation"]) &&
      roleSatisfied(tickerCalls, "price_reaction");
    return {
      ticker,
      sentiment_counts: labels,
      total_records: totalRecords,
      signal_level: sentimentLevel(labels, totalRecords),
      catalyst_status: totalRecords && requiredEvidenceReady ? "confirmed_evidence_set" : totalRecords ? "needs_confirmation" : "insufficient_data",
      catalyst_confidence_score: catalystScore(labels, tickerCalls),
      corroborating_roles: ["market_news_sentiment", "aggregate_sentiment", "filings_check", "issuer_confirmation", "price_reaction"].filter((role) => roleSatisfied(tickerCalls, role)),
      confirmation_roles: ["filings_check", "issuer_confirmation"].filter((role) => roleSatisfied(tickerCalls, role)),
      evidence_roles: tickerEvidence.map((row) => row.role),
      missing_data: missingData,
    };
  });
  const primary = tickerRows[0] || {
    ticker: primaryTicker(opts),
    sentiment_counts: { positive: 0, negative: 0, neutral: 0 },
    total_records: 0,
    signal_level: "insufficient_data",
    catalyst_status: "insufficient_data",
    catalyst_confidence_score: 0,
    corroborating_roles: [],
    confirmation_roles: [],
    evidence_roles: [],
    missing_data: [],
  };
  const labels = {
    positive: tickerRows.reduce((sum, row) => sum + row.sentiment_counts.positive, 0),
    negative: tickerRows.reduce((sum, row) => sum + row.sentiment_counts.negative, 0),
    neutral: tickerRows.reduce((sum, row) => sum + row.sentiment_counts.neutral, 0),
  };
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const missingData = tickerRows.flatMap((row) => row.missing_data.map((item) => `${row.ticker}: ${item}`));
  const score = primary.catalyst_confidence_score;
  const findings = [
    `Reviewed ${names.join(", ")} over a ${opts.windowDays}-day window with ${calls.length} QVeris call attempts.`,
    `Observed ${totalRecords} raw records or nested payload rows across selected sources.`,
    `Sentiment text mentions in returned payload: ${labels.positive} positive, ${labels.negative} negative, ${labels.neutral} neutral.`,
    `Primary catalyst confidence score is ${score}; scores below 0.65 should stay in watchlist mode.`,
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
      tickers: names,
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
      tickers: names,
      watchlist: tickerRows,
      sentiment_counts: primary.sentiment_counts,
      total_records: totalRecords,
      signal_level: primary.signal_level,
      catalyst_status: primary.catalyst_status,
      catalyst_confidence_score: score,
      corroborating_roles: primary.corroborating_roles,
      confirmation_roles: primary.confirmation_roles,
      evidence_roles: evidence.map((row) => row.role),
      missing_data: missingData,
    },
  };
}

export const config = {
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
    {
      key: "issuer_confirmation",
      query: "company press release issuer news SEC filings earnings transcript API",
      limit: 5,
      inspectLimit: 5,
    },
  ],
  callPlan: [
    {
      role: "market_news_sentiment",
      category: "news_sentiment",
      preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0"],
      repeatFor: (opts) => tickers(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({
        function: "NEWS_SENTIMENT",
        tickers: symbol,
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
      repeatFor: (opts) => tickers(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({
        s: usTicker(symbol),
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
      repeatFor: (opts) => tickers(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({
        symbol,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "price_reaction",
      category: "market_reaction",
      preferredToolIds: ["eodhd.live_data.real_time.retrieve.v1.b60a4285", "finnhub_io_api.stock.quote", "finnhub.quote.retrieve.v1.f72cf5ef"],
      repeatFor: (opts) => tickers(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? { symbol: usTicker(symbol), fmt: "json" }
          : { symbol },
    },
    {
      role: "issuer_confirmation",
      category: "issuer_confirmation",
      preferredToolIds: ["eodhd.news.retrieve.v1.fe8bf94c", "alphavantage.news_sentiment.query.v1.467a92c0"],
      strictPreferred: true,
      fallbackOnEmpty: true,
      maxAttempts: 2,
      repeatFor: (opts) => tickers(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? {
              s: usTicker(symbol),
              from: dateNDaysBefore(opts.asOf, opts.windowDays),
              to: opts.asOf,
              limit: opts.limit || 10,
              fmt: "json",
            }
          : {
              function: "NEWS_SENTIMENT",
              tickers: symbol,
              time_from: toAlphaVantageTimestamp(dateNDaysBefore(opts.asOf, opts.windowDays)),
              time_to: toAlphaVantageTimestamp(opts.asOf),
              sort: "LATEST",
              limit: String(opts.limit || 10),
            },
    },
  ],
  inputSummary: (opts) => ({
    ticker: primaryTicker(opts),
    tickers: tickers(opts),
    market: opts.market,
    window_days: opts.windowDays,
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

export const defaults = {
  ticker: "NVDA",
  market: "US",
  windowDays: 7,
  maxPaidCalls: 20,
  maxCredits: 150,
  limit: 10,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(config, defaults);
}
