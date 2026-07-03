#!/usr/bin/env node

import { dateNDaysBefore, genericEvidence, runCli } from "../../qveris-finance-common/runner.mjs";

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

function analyze({ opts, calls }) {
  const proxies = sectors(opts);
  const evidence = calls.map(genericEvidence);
  const totalRecords = evidence.reduce((sum, row) => sum + (row.record_count || 0), 0);
  const signalFramework = ["relative_strength", "momentum", "volatility", "drawdown", "liquidity", "catalyst_context"];
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
      phase_labels_ready: false,
      evidence_roles: evidence.map((row) => row.role),
      missing_outputs: ["relative_strength_scores", "momentum_scores", "rotation_quadrants"],
      missing_data: evidence
        .filter((row) => row.ok === false)
        .map((row) => `${row.role}: ${row.error || "provider returned unsuccessful status"}`),
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
      category: "sector_performance",
      preferredToolIds: ["twelvedata.etfs.world.performance.retrieve.v1.792b716e"],
      strictPreferred: true,
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
