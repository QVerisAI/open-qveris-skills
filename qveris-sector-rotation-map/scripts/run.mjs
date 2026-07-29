#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { countRecords, dateNDaysBefore, genericEvidence, resultPayload, runCli, toAlphaVantageTimestamp, usTicker } from "./lib/qveris-runtime.mjs";

const DEFAULT_SECTOR_PROXIES = ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU"];

const TICKER_SECTOR_PROXY_MAP = {
  AAPL: "XLK",
  MSFT: "XLK",
  NVDA: "XLK",
  AMD: "XLK",
  AVGO: "XLK",
  GOOGL: "XLC",
  GOOG: "XLC",
  META: "XLC",
  NFLX: "XLC",
  TSLA: "XLY",
  AMZN: "XLY",
  HD: "XLY",
  MCD: "XLY",
  JPM: "XLF",
  BAC: "XLF",
  GS: "XLF",
  V: "XLF",
  MA: "XLF",
  JNJ: "XLV",
  LLY: "XLV",
  UNH: "XLV",
  PFE: "XLV",
  XOM: "XLE",
  CVX: "XLE",
  COP: "XLE",
  CAT: "XLI",
  GE: "XLI",
  HON: "XLI",
  PG: "XLP",
  KO: "XLP",
  COST: "XLP",
  WMT: "XLP",
  NEE: "XLU",
  DUK: "XLU",
  SO: "XLU",
};

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase().replace(/\.US$/, "");
}

function sectors(opts) {
  if (opts.sectors?.length) return [...new Set(opts.sectors.map(normalizeSymbol).filter(Boolean))];
  if (opts.tickers?.length) {
    const mapped = opts.tickers.map((ticker) => TICKER_SECTOR_PROXY_MAP[normalizeSymbol(ticker)]).filter(Boolean);
    if (mapped.length) return [...new Set(mapped)];
  }
  return DEFAULT_SECTOR_PROXIES;
}

function previousBusinessDate(asOf) {
  const date = new Date(`${asOf}T00:00:00Z`);
  const day = date.getUTCDay();
  if (day === 0) date.setUTCDate(date.getUTCDate() - 2);
  else if (day === 6) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const SECTOR_PROXY_MAP = {
  XLK: "Technology",
  XLF: "Financial Services",
  XLV: "Healthcare",
  XLE: "Energy",
  XLI: "Industrials",
  XLY: "Consumer Cyclical",
  XLP: "Consumer Defensive",
  XLU: "Utilities",
  XLB: "Basic Materials",
  XLC: "Communication Services",
};

const SECTOR_ALIASES = {
  "Technology": ["Technology", "Information Technology"],
  "Financial Services": ["Financial Services", "Financials", "Financial"],
  "Healthcare": ["Healthcare", "Health Care"],
  "Energy": ["Energy"],
  "Industrials": ["Industrials", "Industrial"],
  "Consumer Cyclical": ["Consumer Cyclical", "Consumer Discretionary"],
  "Consumer Defensive": ["Consumer Defensive", "Consumer Staples"],
  "Utilities": ["Utilities"],
  "Basic Materials": ["Basic Materials", "Materials"],
};

function normalizeSectorName(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sectorKeys(value) {
  const normalized = normalizeSectorName(value);
  for (const [canonical, aliases] of Object.entries(SECTOR_ALIASES)) {
    if (aliases.map(normalizeSectorName).includes(normalized)) return aliases.map(normalizeSectorName).concat(normalizeSectorName(canonical));
  }
  return [normalized];
}

function nestedArrays(value, depth = 0, out = []) {
  if (depth > 4 || value == null) return out;
  if (Array.isArray(value)) {
    out.push(value);
    return out;
  }
  if (typeof value !== "object") return out;
  for (const child of Object.values(value)) {
    nestedArrays(child, depth + 1, out);
  }
  return out;
}

function sectorArrayScore(rows) {
  return rows.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      (row.sector || row.name || row.label) &&
      numeric(row, ["averageChange", "changesPercentage", "changePercentage", "changesPercentageTTM", "performance", "change"]) != null,
  ).length;
}

function payloadRecords(call) {
  const payload = resultPayload(call?.raw_result);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  const nested = nestedArrays(payload)
    .filter((rows) => rows.length)
    .sort((a, b) => sectorArrayScore(b) - sectorArrayScore(a) || b.length - a.length);
  if (nested.length) return nested[0];
  return payload && typeof payload === "object" ? [payload] : [];
}

function numeric(row, keys) {
  for (const key of keys) {
    const raw = row?.[key];
    const value = Number(typeof raw === "string" ? raw.replace("%", "") : raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function callTarget(call) {
  return String(call?.target || call?.parameters?.symbol || call?.parameters?.s || "").replace(".US", "").toUpperCase();
}

function historicalCloses(calls, symbol) {
  const wanted = String(symbol || "").toUpperCase();
  const call = calls.find(
    (row) =>
      ["proxy_price_history", "benchmark_price_history", "etf_performance"].includes(row.role) &&
      row.ok !== false &&
      callTarget(row) === wanted,
  );
  return payloadRecords(call)
    .map((row, index) => ({
      date: row.date || row.datetime || row.timestamp || String(index).padStart(5, "0"),
      close: numeric(row, ["adjClose", "close", "c", "price"]),
    }))
    .filter((row) => Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function totalReturnPct(closes) {
  if (closes.length < 2) return null;
  const first = closes[0].close;
  const last = closes.at(-1).close;
  if (!first || !last) return null;
  return Number(((last / first - 1) * 100).toFixed(4));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.floor(sorted.length / 2)];
}

function quadrant(relativeStrength, momentum) {
  if (relativeStrength >= 0 && momentum >= 0) return "leading";
  if (relativeStrength < 0 && momentum >= 0) return "improving";
  if (relativeStrength < 0 && momentum < 0) return "lagging";
  return "weakening";
}

function roleSatisfied(calls, role) {
  return calls.some((call) => call.role === role && call.ok !== false && countRecords(resultPayload(call.raw_result)) > 0);
}

function missingRole(calls, role) {
  if (roleSatisfied(calls, role)) return null;
  const last = [...calls].reverse().find((call) => call.role === role);
  return `${role}: ${last?.error || "provider returned unsuccessful status"}`;
}

function roleSatisfiedAny(calls, roles) {
  return roles.some((role) => roleSatisfied(calls, role));
}

function skippedTraceRows(trace, role) {
  return (trace || []).filter((row) => row.role === role && ["call_skipped", "fallback_skipped"].includes(row.type));
}

function rotationRows(opts, calls) {
  const snapshotCall = calls.find((call) => call.role === "sector_performance_snapshot" && call.ok !== false);
  const rows = payloadRecords(snapshotCall)
    .map((row) => ({
      sector: row.sector || row.name || row.label,
      performance_pct: numeric(row, ["averageChange", "changesPercentage", "changePercentage", "changesPercentageTTM", "performance", "change"]),
    }))
    .filter((row) => row.sector && Number.isFinite(row.performance_pct));
  const rowsWithKeys = rows.map((row) => ({ ...row, keys: sectorKeys(row.sector) }));
  const benchmark = median(rows.map((row) => row.performance_pct));
  return sectors(opts)
    .map((proxy) => {
      const sector = SECTOR_PROXY_MAP[proxy] || proxy;
      const wantedKeys = sectorKeys(sector);
      const row =
        rowsWithKeys.find((item) => wantedKeys.some((key) => item.keys.includes(key))) ||
        rowsWithKeys.find((item) => wantedKeys.some((key) => item.keys.some((candidate) => candidate.includes(key) || key.includes(candidate))));
      if (!row) {
        const closes = historicalCloses(calls, proxy);
        const historyReturn = totalReturnPct(closes);
        const benchmarkReturn = totalReturnPct(historicalCloses(calls, opts.benchmark));
        if (historyReturn != null) {
          const relativeStrength = benchmarkReturn == null ? historyReturn : Number((historyReturn - benchmarkReturn).toFixed(4));
          return {
            proxy,
            sector,
            performance_pct: historyReturn,
            benchmark_return_pct: benchmarkReturn,
            momentum_score: historyReturn,
            relative_strength_score: relativeStrength,
            quadrant: quadrant(relativeStrength, historyReturn),
            data_status: benchmarkReturn == null ? "history_scored_without_benchmark" : "history_relative_scored",
          };
        }
        return {
          proxy,
          sector,
          performance_pct: null,
          momentum_score: null,
          relative_strength_score: null,
          quadrant: "unknown",
          data_status: "missing_sector_snapshot",
        };
      }
      const relativeStrength = Number((row.performance_pct - benchmark).toFixed(4));
      const momentumScore = Number(row.performance_pct.toFixed(4));
      const closes = historicalCloses(calls, proxy);
      const historyReturn = totalReturnPct(closes);
      const benchmarkReturn = totalReturnPct(historicalCloses(calls, opts.benchmark));
      const finalMomentum = historyReturn ?? momentumScore;
      const finalRelative = historyReturn == null ? relativeStrength : Number((historyReturn - (benchmarkReturn ?? 0)).toFixed(4));
      return {
        proxy,
        sector: row.sector,
        performance_pct: Number(row.performance_pct.toFixed(4)),
        benchmark_return_pct: benchmarkReturn,
        momentum_score: finalMomentum,
        relative_strength_score: finalRelative,
        quadrant: quadrant(finalRelative, finalMomentum),
        data_status: historyReturn == null ? "snapshot_scored" : benchmarkReturn == null ? "snapshot_and_history_scored" : "benchmark_relative_scored",
      };
    });
}

function analyze({ opts, calls, trace = [] }) {
  const proxies = sectors(opts);
  const evidence = calls.map(genericEvidence);
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const signalFramework = ["relative_strength", "momentum", "volatility", "drawdown", "liquidity", "catalyst_context"];
  const rows = rotationRows(opts, calls);
  const signaledRows = rows.filter((row) => row.data_status !== "missing_sector_snapshot");
  const anyPhaseLabelsReady = signaledRows.length > 0;
  const phaseLabelsReady = rows.length > 0 && signaledRows.length === rows.length;
  const proxyHistoryReady = proxies.every((proxy) => historicalCloses(calls, proxy).length > 1);
  const benchmarkHistoryReady = historicalCloses(calls, opts.benchmark).length > 1;
  const relativeHistoryReady = proxyHistoryReady && benchmarkHistoryReady;
  const newsConfirmationReady = roleSatisfiedAny(calls, ["news_catalyst_confirmation", "flow_or_revision_confirmation"]);
  const etfPerformanceSkipped = skippedTraceRows(trace, "etf_performance");
  const missingOutputs = [
    phaseLabelsReady ? null : anyPhaseLabelsReady ? "partial_relative_strength_scores" : "relative_strength_scores",
    phaseLabelsReady ? null : anyPhaseLabelsReady ? "partial_momentum_scores" : "momentum_scores",
    phaseLabelsReady ? null : anyPhaseLabelsReady ? "partial_rotation_quadrants" : "rotation_quadrants",
    proxyHistoryReady ? null : "etf_price_history",
    relativeHistoryReady ? null : "benchmark_relative_history",
    newsConfirmationReady ? null : "news_catalyst_confirmation",
    etfPerformanceSkipped.length ? "etf_performance_source" : null,
  ].filter(Boolean);
  const missingData = ["sector_performance_snapshot", "available_sectors", "etf_symbol_search", "benchmark_price_history"]
    .map((role) => missingRole(calls, role))
    .filter(Boolean);
  if (!newsConfirmationReady) {
    missingData.push("news_catalyst_confirmation: provider returned unsuccessful status");
  }
  missingData.push(
    ...rows
      .filter((row) => row.data_status === "missing_sector_snapshot")
      .map((row) => `sector_signal/${row.proxy}: no sector snapshot or proxy price history returned usable records`),
    ...etfPerformanceSkipped.map(
      (row) =>
        `etf_performance/${row.target || proxies[0] || "proxy"}: skipped (${row.reason || "no compatible tool"}); proxy_price_history may still provide benchmark-relative signals`,
    ),
  );
  if (!roleSatisfied(calls, "etf_performance") && !roleSatisfied(calls, "proxy_price_history")) {
    missingData.push("etf_performance: no ETF performance or proxy price history returned usable records");
  }
  return {
    scope: {
      sector_proxies: proxies,
      benchmark: opts.benchmark,
      requested_tickers: opts.tickers || [],
      market: opts.market,
      window_days: opts.windowDays,
      from: dateNDaysBefore(opts.asOf, opts.windowDays),
      to: opts.asOf,
    },
    findings: [
      `Rotation proxy set contains ${proxies.length} sectors or ETFs.`,
      `Collected ${totalRecords} raw records or nested payload rows across selected sector/market sources.`,
      phaseLabelsReady
        ? `Generated snapshot rotation quadrants for ${rows.filter((row) => row.data_status === "snapshot_scored").length} sector proxies.`
        : "Snapshot rotation quadrants are unavailable because sector performance records were missing.",
      "Initial deterministic signals are relative strength, momentum, volatility, drawdown, liquidity, and catalyst context.",
      "Phase labels should be treated as research labels until verified against benchmark-relative history.",
    ],
    evidence,
    risks: [
      "Sector ETF proxies may not match local-market sector indices.",
      "Flow, earnings-revision, and valuation coverage can be provider-dependent.",
      "Rotation labels are not trading instructions.",
    ],
    result: {
      sector_proxies: proxies,
      benchmark: opts.benchmark,
      total_records: totalRecords,
      signal_framework: signalFramework,
      phase_labels_ready: phaseLabelsReady,
      rotation_quadrants: rows.map(({ proxy, sector, quadrant, data_status }) => ({ proxy, sector, quadrant, data_status })),
      momentum_scores: rows.map(({ proxy, sector, momentum_score }) => ({ proxy, sector, score: momentum_score })),
      relative_strength_scores: rows.map(({ proxy, sector, relative_strength_score }) => ({ proxy, sector, score: relative_strength_score })),
      benchmark_relative_history: rows.map(({ proxy, sector, momentum_score, benchmark_return_pct, relative_strength_score, data_status }) => ({
        proxy,
        sector,
        proxy_return_pct: momentum_score,
        benchmark_return_pct: benchmark_return_pct ?? null,
        relative_return_pct: relative_strength_score,
        data_status,
      })),
      evidence_roles: evidence.map((row) => row.role),
      missing_outputs: missingOutputs,
      missing_data: missingData,
    },
  };
}

export const config = {
  id: "qveris-sector-rotation-map",
  title: "Sector Rotation Map",
  toolCategories: [
    {
      key: "sector_performance",
      query: "sector ETF price history benchmark volume API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "sector_price_history",
      query: "historical price EOD full chart stock ETF OHLCV FMP API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "sector_snapshot",
      query: "market sector performance snapshot available sectors API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "sector_flows",
      query: "sector performance ETF flows earnings revisions valuation API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "sector_confirmation",
      query: "sector ETF news sentiment flow earnings revision confirmation API",
      limit: 5,
      inspectLimit: 5,
    },
  ],
  callPlan: [
    {
      role: "sector_performance_snapshot",
      category: "sector_snapshot",
      preferredToolIds: ["financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159"],
      buildParams: (opts) => ({ date: previousBusinessDate(opts.asOf), exchange: "NASDAQ" }),
    },
    {
      role: "available_sectors",
      category: "sector_snapshot",
      preferredToolIds: ["financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9"],
      strictPreferred: true,
      buildParams: () => ({}),
    },
    {
      role: "etf_performance",
      category: "sector_performance",
      preferredToolIds: ["twelvedata.etfs.world.performance.retrieve.v1.792b716e", "financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      strictPreferred: true,
      fallbackOnEmpty: true,
      maxAttempts: 2,
      target: (item, index, opts) => sectors(opts)[0],
      buildParams: (opts, tool) =>
        String(tool.tool_id).includes("historicalprice")
          ? { symbol: sectors(opts)[0], from: dateNDaysBefore(opts.asOf, opts.windowDays), to: opts.asOf }
          : { symbol: sectors(opts)[0], dp: 2 },
    },
    {
      role: "proxy_price_history",
      category: "sector_price_history",
      preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      strictPreferred: true,
      repeatFor: (opts) => sectors(opts),
      target: (proxy) => proxy,
      buildParams: (opts, tool, proxy) => ({
        symbol: proxy,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "benchmark_price_history",
      category: "sector_price_history",
      preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      strictPreferred: true,
      target: (item, index, opts) => opts.benchmark,
      buildParams: (opts) => ({
        symbol: opts.benchmark,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "news_catalyst_confirmation",
      category: "sector_confirmation",
      preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0", "eodhd.news.retrieve.v1.fe8bf94c"],
      fallbackOnEmpty: true,
      buildParams: (opts, tool) =>
        String(tool.tool_id).startsWith("eodhd.")
          ? {
              s: usTicker(sectors(opts)[0]),
              from: dateNDaysBefore(opts.asOf, opts.windowDays),
              to: opts.asOf,
              limit: opts.limit || 10,
              fmt: "json",
            }
          : {
              function: "NEWS_SENTIMENT",
              tickers: sectors(opts).slice(0, 6).join(","),
              time_from: toAlphaVantageTimestamp(dateNDaysBefore(opts.asOf, opts.windowDays)),
              time_to: toAlphaVantageTimestamp(opts.asOf),
              sort: "LATEST",
              limit: String(opts.limit || 10),
            },
    },
    {
      role: "etf_symbol_search",
      category: "sector_performance",
      preferredToolIds: ["financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31"],
      buildParams: () => ({}),
    },
  ],
  inputSummary: (opts) => ({
    sector_proxies: sectors(opts),
    requested_tickers: opts.tickers || [],
    benchmark: opts.benchmark,
    market: opts.market,
    window_days: opts.windowDays,
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

export const defaults = {
  sectors: ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU"],
  benchmark: "SPY",
  market: "US",
  windowDays: 30,
  maxPaidCalls: 15,
  maxCredits: 360,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(config, defaults);
}
