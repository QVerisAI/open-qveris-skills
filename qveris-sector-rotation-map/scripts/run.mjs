#!/usr/bin/env node

import { countRecords, dateNDaysBefore, genericEvidence, resultPayload, runCli } from "../../qveris-finance-common/runner.mjs";

function sectors(opts) {
  return opts.sectors?.length ? opts.sectors : ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU"];
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
      return {
        proxy,
        sector: row.sector,
        performance_pct: Number(row.performance_pct.toFixed(4)),
        momentum_score: momentumScore,
        relative_strength_score: relativeStrength,
        quadrant: quadrant(relativeStrength, momentumScore),
        data_status: "snapshot_scored",
      };
    });
}

function analyze({ opts, calls }) {
  const proxies = sectors(opts);
  const evidence = calls.map(genericEvidence);
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const signalFramework = ["relative_strength", "momentum", "volatility", "drawdown", "liquidity", "catalyst_context"];
  const rows = rotationRows(opts, calls);
  const phaseLabelsReady = rows.some((row) => row.data_status === "snapshot_scored");
  const missingOutputs = [
    phaseLabelsReady ? null : "relative_strength_scores",
    phaseLabelsReady ? null : "momentum_scores",
    phaseLabelsReady ? null : "rotation_quadrants",
    roleSatisfied(calls, "etf_performance") ? null : "etf_price_history",
    "benchmark_relative_history",
    "flow_or_revision_confirmation",
  ].filter(Boolean);
  const missingData = ["sector_performance_snapshot", "available_sectors", "etf_performance", "etf_symbol_search"]
    .map((role) => missingRole(calls, role))
    .filter(Boolean);
  return {
    scope: {
      sector_proxies: proxies,
      benchmark: opts.benchmark,
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
      evidence_roles: evidence.map((row) => row.role),
      missing_outputs: missingOutputs,
      missing_data: missingData,
    },
  };
}

const config = {
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
      category: "sector_flows",
      preferredToolIds: ["twelvedata.etfs.world.performance.retrieve.v1.792b716e"],
      strictPreferred: true,
      fallbackOnEmpty: true,
      buildParams: (opts) => ({ symbol: sectors(opts)[0], dp: 2 }),
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
    benchmark: opts.benchmark,
    market: opts.market,
    window_days: opts.windowDays,
    max_paid_calls: opts.maxPaidCalls,
    max_credits: opts.maxCredits,
  }),
  analyze,
};

runCli(config, {
  sectors: ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU"],
  benchmark: "SPY",
  market: "US",
  windowDays: 30,
  maxPaidCalls: 4,
  maxCredits: 80,
});
