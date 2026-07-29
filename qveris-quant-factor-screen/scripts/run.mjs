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

function universe(opts) {
  return opts.universe?.length ? opts.universe : opts.tickers?.length ? opts.tickers : ["AAPL", "MSFT", "NVDA", "AMD", "AVGO"];
}

function payloadRecords(call) {
  const payload = resultPayload(call?.raw_result);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.historical)) return payload.historical;
  if (Array.isArray(payload?.prices)) return payload.prices;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return payload && typeof payload === "object" ? [payload] : [];
}

function numberField(row, keys) {
  for (const key of keys) {
    const raw = row?.[key];
    const value = Number(typeof raw === "string" ? raw.replace("%", "") : raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function callTarget(call) {
  return String(call?.target || call?.parameters?.symbol || call?.parameters?.s || call?.parameters?.tickers || "").replace(".US", "").toUpperCase();
}

function findSuccessfulCall(calls, role, symbol = null) {
  const wanted = symbol ? String(symbol).toUpperCase() : null;
  return calls.find(
    (call) =>
      call.role === role &&
      call.ok !== false &&
      countRecords(resultPayload(call.raw_result)) > 0 &&
      (!wanted || callTarget(call) === wanted),
  );
}

function roleSatisfied(calls, role, symbol = null) {
  return Boolean(findSuccessfulCall(calls, role, symbol));
}

function missingRole(calls, role, symbol) {
  if (roleSatisfied(calls, role, symbol)) return null;
  const last = [...calls].reverse().find((call) => call.role === role && (!symbol || callTarget(call) === String(symbol).toUpperCase()));
  return `${role}${symbol ? `:${symbol}` : ""}: ${last?.error || "provider returned unsuccessful status"}`;
}

function extractTechnicalValue(call) {
  const text = JSON.stringify(resultPayload(call?.raw_result));
  const rocr = Number(text.match(/"ROCR"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  if (Number.isFinite(rocr)) return { raw: rocr, score: Math.max(0, Math.min(1, (rocr - 0.9) / 0.25)) };
  const momentum = Number(text.match(/"(?:MOM|CMO|MACD|MACD_Hist|histogram)"\s*:\s*"?(?<value>[0-9.-]+)/i)?.groups?.value);
  if (Number.isFinite(momentum)) {
    return { raw: momentum, score: Number(Math.max(0, Math.min(1, 0.5 + momentum / 20)).toFixed(3)) };
  }
  const upper = Number(text.match(/Real Upper Band"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  const lower = Number(text.match(/Real Lower Band"\s*:\s*"?(?<value>[0-9.-]+)/)?.groups?.value);
  if (Number.isFinite(upper) && Number.isFinite(lower) && upper > lower) {
    return { raw: Number((upper - lower).toFixed(4)), score: 0.5 };
  }
  return { raw: null, score: null };
}

function sentimentScore(call) {
  const text = JSON.stringify(resultPayload(call?.raw_result));
  const positive = (text.match(/positive|bullish|optimistic|outperform/gi) || []).length;
  const negative = (text.match(/negative|bearish|pessimistic|downgrade|risk/gi) || []).length;
  const total = positive + negative;
  if (!total) return { raw: null, score: null };
  return {
    raw: { positive, negative },
    score: Number(Math.max(0, Math.min(1, 0.5 + (positive - negative) / total / 2)).toFixed(3)),
  };
}

function priceMomentum(call) {
  const closes = payloadRecords(call)
    .map((row, index) => ({
      date: row.date || row.datetime || row.timestamp || String(index).padStart(5, "0"),
      close: numberField(row, ["adjClose", "close", "c", "price"]),
    }))
    .filter((row) => Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (closes.length < 2) return { raw: null, score: null };
  const raw = Number(((closes.at(-1).close / closes[0].close - 1) * 100).toFixed(4));
  return { raw, score: Number(Math.max(0, Math.min(1, 0.5 + raw / 30)).toFixed(3)) };
}

const REQUIRED_FACTOR_ROLES = ["valuation", "quality", "liquidity", "momentum", "news_risk"];

function minimumPaidCallsForCompletePanel(opts) {
  return universe(opts).length * REQUIRED_FACTOR_ROLES.length;
}

function validateOptions(opts, { mode } = {}) {
  if (mode !== "live") return;
  const required = minimumPaidCallsForCompletePanel(opts);
  if (opts.maxPaidCalls < required) {
    throw new Error(
      `Budget too low for complete quant factor screen: ${universe(opts).length} tickers require at least ${required} paid calls (${REQUIRED_FACTOR_ROLES.length} factor roles per ticker), but --max-paid-calls is ${opts.maxPaidCalls}. Reduce --universe or raise --max-paid-calls before live execution.`,
    );
  }
}

function scoredRows(opts, calls) {
  const names = universe(opts);
  const weights = {
    valuation: 0.25,
    quality: 0.25,
    liquidity: 0.15,
    momentum: 0.2,
    news_risk: 0.15,
  };
  const rows = names.map((symbol) => {
    const ratios = payloadRecords(findSuccessfulCall(calls, "valuation_ratios", symbol))[0] || {};
    const overview = payloadRecords(findSuccessfulCall(calls, "quality_overview", symbol))[0] || {};
    const floatData = payloadRecords(findSuccessfulCall(calls, "liquidity_float", symbol))[0] || {};
    const quote = payloadRecords(findSuccessfulCall(calls, "quote_snapshot", symbol))[0] || {};
    const technical = extractTechnicalValue(findSuccessfulCall(calls, "momentum_or_volatility", symbol));
    const historyMomentum = priceMomentum(findSuccessfulCall(calls, "price_momentum", symbol));
    const news = sentimentScore(findSuccessfulCall(calls, "news_risk", symbol));
    const pe = numberField(ratios, ["priceEarningsRatio", "peRatio", "priceToEarningsRatio", "priceEarnings"]);
    const roe =
      numberField(ratios, ["returnOnEquity", "roe", "returnOnEquityRatio"]) ??
      numberField(overview, ["ReturnOnEquityTTM", "returnOnEquityTTM", "returnOnEquity", "roe"]);
    const profitMargin = numberField(overview, ["ProfitMargin", "profitMargin", "NetProfitMarginTTM", "netProfitMarginTTM"]);
    const floatShares = numberField(floatData, ["floatShares", "freeFloat", "sharesFloat"]);
    const volume = numberField(quote, ["volume", "v"]);
    const quoteChange = numberField(quote, ["dp", "change_p", "changePercent", "percent_change", "change_p"]);
    const valuationScore = pe == null || pe <= 0 ? null : Math.max(0, Math.min(1, 1 - pe / 60));
    const qualityScore =
      roe != null
        ? Math.max(0, Math.min(1, roe > 2 ? roe / 200 : roe))
        : profitMargin == null
        ? null
        : Math.max(0, Math.min(1, profitMargin > 2 ? profitMargin / 100 : profitMargin));
    const liquidityBase = floatShares ?? volume;
    const liquidityScore = liquidityBase == null ? null : Math.max(0, Math.min(1, Math.log10(Math.max(liquidityBase, 10)) / 10));
    const quoteMomentumScore = quoteChange == null ? null : Math.max(0, Math.min(1, 0.5 + quoteChange / 20));
    const components = {
      valuation: valuationScore,
      quality: qualityScore,
      liquidity: liquidityScore,
      momentum: historyMomentum.score ?? technical.score ?? quoteMomentumScore,
      news_risk: news.score,
    };
    const present = Object.entries(components).filter(([, value]) => Number.isFinite(value));
    const weightedTotal = present.reduce((sum, [key, value]) => sum + value * weights[key], 0);
    const usedWeight = present.reduce((sum, [key]) => sum + weights[key], 0);
    const score = usedWeight ? Number((weightedTotal / usedWeight).toFixed(3)) : null;
    const missingFactors = Object.entries(components).filter(([, value]) => !Number.isFinite(value)).map(([key]) => key);
    return {
      rank: null,
      symbol,
      score,
      non_missing_factor_count: present.length,
      data_status: score == null ? "missing" : missingFactors.length ? "partial" : "complete",
      raw_fields: {
        pe,
        roe,
        profit_margin: profitMargin,
        float_shares: floatShares,
        volume,
        quote_change_pct: quoteChange,
        technical: technical.raw,
        price_momentum_return_pct: historyMomentum.raw,
        news_sentiment: news.raw,
      },
      normalized_scores: components,
      missing_factors: missingFactors,
    };
  });
  const componentScore = (row, key) => {
    const value = row.normalized_scores?.[key];
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  };
  rows
    .filter((row) => row.score != null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.non_missing_factor_count - a.non_missing_factor_count ||
        componentScore(b, "liquidity") - componentScore(a, "liquidity") ||
        componentScore(b, "news_risk") - componentScore(a, "news_risk") ||
        a.symbol.localeCompare(b.symbol),
    )
    .forEach((row, index) => {
      row.rank = index + 1;
    });
  rows.sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.symbol.localeCompare(b.symbol));
  return { rows, weights };
}

function analyze({ opts, calls }) {
  const names = universe(opts);
  const evidence = calls.map(genericEvidence);
  const calledRoles = new Set(calls.map((call) => call.role));
  const factorSet = ["valuation", "quality", "liquidity", "momentum", "news_risk"];
  const { rows, weights } = scoredRows(opts, calls);
  const rankingReady = rows.length > 0 && rows.every((row) => row.data_status === "complete");
  const missingOutputs = [
    rankingReady ? null : "complete_universe_factor_panel",
    rows.every((row) => Number.isFinite(row.normalized_scores?.momentum)) ? null : "momentum_scores",
    rows.every((row) => Number.isFinite(row.normalized_scores?.news_risk)) ? null : "news_risk_factor",
  ].filter(Boolean);
  const missingData = rows
    .flatMap((row) =>
      row.missing_factors.map((factor) => {
        const roleByFactor = {
          valuation: "valuation_ratios",
          quality: "quality_overview",
          liquidity: "liquidity_float",
          momentum: "price_momentum",
          news_risk: "news_risk",
        };
        const role = roleByFactor[factor];
        return missingRole(calls, role, row.symbol) || `${factor}:${row.symbol}: returned payload lacked comparable field`;
      }),
    )
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
        "If still tied, prefer lower news-risk burden.",
        "Do not promote a ticker with missing fundamentals above a fully covered ticker on model judgement alone.",
      ],
      missing_outputs: missingOutputs,
      missing_data: missingData,
    },
  };
}

export const config = {
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
      key: "price_history",
      query: "historical price EOD full chart stock OHLCV FMP API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "news_risk",
      query: "stock news sentiment catalyst risk API",
      limit: 5,
      inspectLimit: 5,
    },
  ],
  callPlan: [
    {
      role: "valuation_ratios",
      category: "fundamentals_valuation",
      preferredToolIds: ["financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef"],
      repeatFor: (opts) => universe(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({ symbol, limit: 1, period: "annual" }),
    },
    {
      role: "quality_overview",
      category: "fundamentals_valuation",
      preferredToolIds: ["alphavantage.fundamentals.income_statement.retrieve.v1.7aca3c4a", "caidazi.analyze_fundamentals_financial.execute.v1.7a43f96e"],
      fallbackOnEmpty: true,
      repeatFor: (opts) => universe(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) =>
        String(tool.tool_id).startsWith("alphavantage.")
          ? { function: "OVERVIEW", symbol, datatype: "json" }
          : { symbol },
    },
    {
      role: "liquidity_float",
      category: "quote_liquidity",
      preferredToolIds: ["financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f"],
      repeatFor: (opts) => universe(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({ symbol }),
    },
    {
      role: "price_momentum",
      category: "price_history",
      preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      strictPreferred: true,
      repeatFor: (opts) => universe(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) => ({
        symbol,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "news_risk",
      category: "news_risk",
      preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0", "eodhd.news.retrieve.v1.fe8bf94c"],
      fallbackOnEmpty: true,
      repeatFor: (opts) => universe(opts),
      target: (symbol) => symbol,
      buildParams: (opts, tool, symbol) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? {
              s: usTicker(symbol),
              from: dateNDaysBefore(opts.asOf, opts.windowDays),
              to: opts.asOf,
              limit: opts.limit || 5,
              fmt: "json",
            }
          : {
              function: "NEWS_SENTIMENT",
              tickers: symbol,
              time_from: toAlphaVantageTimestamp(dateNDaysBefore(opts.asOf, opts.windowDays)),
              time_to: toAlphaVantageTimestamp(opts.asOf),
              sort: "LATEST",
              limit: String(opts.limit || 5),
            },
    },
  ],
  inputSummary: (opts) => ({
    universe: universe(opts),
    market: opts.market,
    factor_set: ["valuation", "quality", "liquidity", "momentum", "news_risk"],
    minimum_paid_calls_for_complete_panel: minimumPaidCallsForCompletePanel(opts),
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
  validateOptions,
};

export const defaults = {
  universe: ["AAPL", "MSFT", "NVDA", "AMD", "AVGO"],
  market: "US",
  windowDays: 90,
  maxPaidCalls: 25,
  maxCredits: 520,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(config, defaults);
}
