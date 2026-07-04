#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { countRecords, dateNDaysBefore, genericEvidence, resultPayload, runCli, usTicker } from "./lib/qveris-runtime.mjs";

function holdings(opts) {
  if (opts.holdings?.length) return opts.holdings;
  const tickers = opts.tickers?.length ? opts.tickers : ["AAPL", "NVDA", "MSFT", "TSLA"];
  const weight = Number((100 / tickers.length).toFixed(2));
  return tickers.map((symbol) => ({ symbol, weight }));
}

function topHolding(rows) {
  const nonCash = rows.filter((row) => row.symbol.toUpperCase() !== "CASH");
  return [...(nonCash.length ? nonCash : rows)].sort((a, b) => b.weight - a.weight)[0] || { symbol: "N/A", weight: 0 };
}

function nonCashHoldings(rows) {
  return rows.filter((row) => row.symbol.toUpperCase() !== "CASH" && row.weight > 0);
}

function concentration(rows) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  return rows.reduce((sum, row) => sum + (row.weight / total) ** 2, 0);
}

function concentrationLevel(hhi) {
  if (hhi >= 0.25) return "high";
  if (hhi >= 0.15) return "medium";
  return "low";
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
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function callTarget(call) {
  return String(call?.target || call?.parameters?.symbol || "").toUpperCase();
}

function historicalCloses(calls, symbol = null) {
  const wanted = symbol ? String(symbol).toUpperCase() : null;
  const candidates = calls.filter((row) => row.role === "historical_prices" && row.ok !== false);
  const call = wanted ? candidates.find((row) => callTarget(row) === wanted) || candidates[0] : candidates[0];
  return payloadRecords(call)
    .map((row, index) => ({
      date: row.date || row.datetime || row.timestamp || String(index).padStart(5, "0"),
      close: numberField(row, ["adjClose", "close", "c", "price"]),
    }))
    .filter((row) => Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function closeReturns(closes) {
  const rows = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (prev.close > 0 && curr.close > 0) rows.push({ date: curr.date, value: curr.close / prev.close - 1 });
  }
  return rows;
}

function pearsonCorrelation(left, right) {
  const rightByDate = new Map(right.map((row) => [row.date, row.value]));
  const pairs = left
    .map((row) => [row.value, rightByDate.get(row.date)])
    .filter(([, b]) => Number.isFinite(b));
  if (pairs.length < 3) return null;
  const meanA = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
  const meanB = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (const [a, b] of pairs) {
    numerator += (a - meanA) * (b - meanB);
    denomA += (a - meanA) ** 2;
    denomB += (b - meanB) ** 2;
  }
  if (!denomA || !denomB) return null;
  return Number((numerator / Math.sqrt(denomA * denomB)).toFixed(4));
}

function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * pct)));
  return sorted[index];
}

function stddev(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function riskMetrics(closes, benchmarkCloses = []) {
  const returns = closeReturns(closes).map((row) => row.value);
  let peak = closes[0]?.close || 0;
  let maxDrawdown = 0;
  for (const row of closes) {
    peak = Math.max(peak, row.close);
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, row.close / peak - 1);
  }
  const dailyVol = stddev(returns);
  const var95 = percentile(returns, 0.05);
  if (!closes.length || !returns.length) return null;
  const correlationToBenchmark = pearsonCorrelation(closeReturns(closes), closeReturns(benchmarkCloses));
  return {
    observation_count: closes.length,
    latest_close: Number(closes.at(-1).close.toFixed(4)),
    daily_volatility: dailyVol == null ? null : Number(dailyVol.toFixed(4)),
    annualized_volatility: dailyVol == null ? null : Number((dailyVol * Math.sqrt(252)).toFixed(4)),
    max_drawdown: Number(maxDrawdown.toFixed(4)),
    historical_var_95: var95 == null ? null : Number(Math.min(0, var95).toFixed(4)),
    correlation_to_benchmark: correlationToBenchmark,
    benchmark_observation_count: benchmarkCloses.length,
  };
}

function riskMetricsFromReturns(returnRows, benchmarkRows = []) {
  const returns = returnRows.map((row) => row.value);
  if (!returns.length) return null;
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (const value of returns) {
    equity *= 1 + value;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity / peak - 1);
  }
  const dailyVol = stddev(returns);
  const var95 = percentile(returns, 0.05);
  return {
    observation_count: returns.length,
    cumulative_return: Number((equity - 1).toFixed(4)),
    daily_volatility: dailyVol == null ? null : Number(dailyVol.toFixed(4)),
    annualized_volatility: dailyVol == null ? null : Number((dailyVol * Math.sqrt(252)).toFixed(4)),
    max_drawdown: Number(maxDrawdown.toFixed(4)),
    historical_var_95: var95 == null ? null : Number(Math.min(0, var95).toFixed(4)),
    correlation_to_benchmark: pearsonCorrelation(returnRows, benchmarkRows),
    benchmark_observation_count: benchmarkRows.length,
  };
}

function portfolioReturnRows(rows, calls) {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 100;
  const seriesBySymbol = new Map();
  for (const holding of nonCashHoldings(rows)) {
    const returns = closeReturns(historicalCloses(calls, holding.symbol));
    if (returns.length) seriesBySymbol.set(holding.symbol.toUpperCase(), returns);
  }
  const dateSets = [...seriesBySymbol.values()].map((series) => new Set(series.map((row) => row.date)));
  if (!dateSets.length) return [];
  let dates = dateSets[0];
  for (const set of dateSets.slice(1)) {
    dates = new Set([...dates].filter((date) => set.has(date)));
  }
  if (!dates.size) return [];
  return [...dates]
    .sort()
    .map((date) => {
      let value = 0;
      for (const holding of nonCashHoldings(rows)) {
        const series = seriesBySymbol.get(holding.symbol.toUpperCase());
        const row = series?.find((item) => item.date === date);
        if (row) value += (holding.weight / totalWeight) * row.value;
      }
      return { date, value: Number(value.toFixed(6)) };
    });
}

function firstRecord(calls, role, symbol) {
  const wanted = String(symbol || "").toUpperCase();
  const call = calls.find((row) => row.role === role && row.ok !== false && (!wanted || callTarget(row) === wanted));
  const records = payloadRecords(call);
  return records.find((row) => !wanted || String(row.symbol || row.code || row.ticker || "").toUpperCase().replace(/\.US$/, "") === wanted) || records[0] || null;
}

function quoteSnapshot(calls, symbol) {
  const row = firstRecord(calls, "quote_snapshot", symbol);
  if (!row) return null;
  return {
    price: numberField(row, ["close", "c", "price", "last", "previousClose"]),
    change: numberField(row, ["change", "d"]),
    change_percent: numberField(row, ["change_p", "dp", "changesPercentage"]),
  };
}

function profileInfo(calls, symbol) {
  const row = firstRecord(calls, "profile_sector", symbol);
  if (!row) return { sector: null, industry: null, market_cap: null };
  return {
    sector: row.sector || row.gicSector || null,
    industry: row.industry || row.gicIndustry || null,
    market_cap: numberField(row, ["marketCap", "mktCap", "marketCapitalization"]),
  };
}

function newsRecordCount(calls, symbol) {
  const wanted = String(symbol || "").toUpperCase();
  return calls
    .filter((row) => row.role === "news_catalyst" && row.ok !== false && callTarget(row) === wanted)
    .reduce((sum, row) => sum + payloadRecords(row).length, 0);
}

function sectorExposure(rows, calls) {
  const exposure = new Map();
  for (const row of rows) {
    const sector =
      row.symbol.toUpperCase() === "CASH"
        ? "Cash"
        : profileInfo(calls, row.symbol).sector || "Unknown";
    exposure.set(sector, Number(((exposure.get(sector) || 0) + row.weight).toFixed(4)));
  }
  return [...exposure.entries()]
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);
}

function roleSatisfied(calls, role) {
  return calls.some((call) => call.role === role && call.ok !== false && countRecords(resultPayload(call.raw_result)) > 0);
}

function missingRole(calls, role) {
  if (roleSatisfied(calls, role)) return null;
  const last = [...calls].reverse().find((call) => call.role === role);
  return `${role}: ${last?.error || "provider returned unsuccessful status"}`;
}

function missingRoleTargets(calls, role, targets) {
  return targets
    .filter((target) => !roleSatisfied(calls.filter((call) => callTarget(call) === String(target).toUpperCase()), role))
    .map((target) => {
      const last = [...calls].reverse().find((call) => call.role === role && callTarget(call) === String(target).toUpperCase());
      return `${role}/${target}: ${last?.error || "provider returned no usable records"}`;
    });
}

function analyze({ opts, calls }) {
  const rows = holdings(opts);
  const investableRows = nonCashHoldings(rows);
  const top = topHolding(rows);
  const concentrationRows = investableRows.length ? investableRows : rows;
  const hhi = concentration(concentrationRows);
  const evidence = calls.map(genericEvidence);
  const topCloses = historicalCloses(calls, top.symbol);
  const benchmarkCloses = historicalCloses(calls, opts.benchmark);
  const metrics = riskMetrics(topCloses, benchmarkCloses);
  const benchmarkReturns = closeReturns(benchmarkCloses);
  const portfolioMetrics = riskMetricsFromReturns(portfolioReturnRows(rows, calls), benchmarkReturns);
  const holdingsRisk = investableRows.map((row) => {
    const closes = historicalCloses(calls, row.symbol);
    const rowMetrics = riskMetrics(closes, benchmarkCloses);
    const profile = profileInfo(calls, row.symbol);
    const quote = quoteSnapshot(calls, row.symbol);
    const newsCount = newsRecordCount(calls, row.symbol);
    const missing = [
      rowMetrics ? null : "historical_prices",
      profile.sector ? null : "profile_sector",
      quote ? null : "quote_snapshot",
      newsCount > 0 ? null : "news_catalyst",
    ].filter(Boolean);
    return {
      symbol: row.symbol,
      weight: row.weight,
      sector: profile.sector,
      industry: profile.industry,
      market_cap: profile.market_cap,
      quote,
      risk_metrics: rowMetrics,
      news_record_count: newsCount,
      data_status: missing.length ? "partial" : "complete",
      missing_data: missing,
    };
  });
  const riskLeaders = {
    volatility: [...holdingsRisk]
      .filter((row) => Number.isFinite(row.risk_metrics?.annualized_volatility))
      .sort((a, b) => b.risk_metrics.annualized_volatility - a.risk_metrics.annualized_volatility)
      .slice(0, 3)
      .map((row) => ({ symbol: row.symbol, weight: row.weight, annualized_volatility: row.risk_metrics.annualized_volatility })),
    drawdown: [...holdingsRisk]
      .filter((row) => Number.isFinite(row.risk_metrics?.max_drawdown))
      .sort((a, b) => a.risk_metrics.max_drawdown - b.risk_metrics.max_drawdown)
      .slice(0, 3)
      .map((row) => ({ symbol: row.symbol, weight: row.weight, max_drawdown: row.risk_metrics.max_drawdown })),
    var_95: [...holdingsRisk]
      .filter((row) => Number.isFinite(row.risk_metrics?.historical_var_95))
      .sort((a, b) => a.risk_metrics.historical_var_95 - b.risk_metrics.historical_var_95)
      .slice(0, 3)
      .map((row) => ({ symbol: row.symbol, weight: row.weight, historical_var_95: row.risk_metrics.historical_var_95 })),
  };
  const missingMetrics = [
    metrics?.annualized_volatility == null ? "volatility" : null,
    metrics?.max_drawdown == null ? "drawdown" : null,
    metrics?.correlation_to_benchmark == null ? "correlation" : null,
    metrics?.historical_var_95 == null ? "VaR" : null,
    portfolioMetrics ? null : "portfolio_metrics",
  ].filter(Boolean);
  const expectedHoldingTargets = investableRows.map((row) => row.symbol);
  const missingData = [
    ...missingRoleTargets(calls, "quote_snapshot", expectedHoldingTargets),
    ...missingRoleTargets(calls, "historical_prices", [...expectedHoldingTargets, opts.benchmark]),
    ...missingRoleTargets(calls, "profile_sector", expectedHoldingTargets),
    ...missingRoleTargets(calls, "news_catalyst", expectedHoldingTargets),
    ...["quote_snapshot", "historical_prices", "profile_sector", "news_catalyst"]
    .map((role) => missingRole(calls, role))
    .filter(Boolean),
  ];
  const coverageLevel =
    holdingsRisk.every((row) => row.data_status === "complete") && portfolioMetrics && missingData.length === 0
      ? "complete"
      : "partial";
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
      portfolioMetrics
        ? `Portfolio history produced ${portfolioMetrics.observation_count} aligned return observations, annualized volatility ${portfolioMetrics.annualized_volatility}, max drawdown ${portfolioMetrics.max_drawdown}, 95% historical VaR ${portfolioMetrics.historical_var_95}, and benchmark correlation ${portfolioMetrics.correlation_to_benchmark ?? "unavailable"}.`
        : "Portfolio-level historical risk metrics are unavailable because not enough holding histories aligned by date.",
      metrics
        ? `Top holding history produced ${metrics.observation_count} observations, annualized volatility ${metrics.annualized_volatility}, max drawdown ${metrics.max_drawdown}, 95% historical VaR ${metrics.historical_var_95}, and benchmark correlation ${metrics.correlation_to_benchmark ?? "unavailable"}.`
        : "Top holding historical risk metrics are unavailable because historical prices were missing or too sparse.",
      `Collected ${calls.length} QVeris call attempts across market, profile, historical, and news/catalyst roles.`,
      "Risk interpretation should separate measurable exposure from narrative catalyst risk.",
    ],
    evidence,
    risks: [
      "Weights must be normalized before comparing portfolios.",
      "Historical volatility and drawdown depend on lookback window and provider coverage.",
      "News/catalyst risk can be stale or incomplete without filings and earnings-calendar checks.",
    ],
    result: {
      top_holding: top,
      concentration_hhi: Number(hhi.toFixed(3)),
      concentration_scope: investableRows.length ? "non_cash_holdings" : "all_holdings",
      concentration_level: concentrationLevel(hhi),
      evidence_roles: evidence.map((row) => row.role),
      measurable_risks: [
        "concentration",
        "portfolio_volatility",
        "portfolio_drawdown",
        "portfolio_historical_var",
        "top_holding_exposure",
        "provider_coverage",
        ...(metrics ? ["top_holding_volatility", "top_holding_drawdown", "top_holding_historical_var"] : []),
        ...(metrics?.correlation_to_benchmark == null ? [] : ["benchmark_correlation"]),
      ],
      risk_metrics: metrics,
      portfolio_risk_metrics: portfolioMetrics,
      holdings_risk: holdingsRisk,
      sector_exposure: sectorExposure(rows, calls),
      risk_leaders: riskLeaders,
      coverage_level: coverageLevel,
      missing_metrics: missingMetrics,
      missing_data: missingData,
    },
  };
}

export const config = {
  id: "qveris-portfolio-risk-monitor",
  title: "Portfolio Risk Monitor",
  toolCategories: [
    {
      key: "quote_history",
      query: "portfolio risk real-time stock quote EODHD live data historical OHLCV volatility liquidity API",
      limit: 5,
      inspectLimit: 5,
    },
    {
      key: "historical_prices",
      query: "historical price EOD full chart stock OHLCV FMP API",
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
      preferredToolIds: [
        "eodhd.live_data.real_time.retrieve.v1.b60a4285",
        "eodhd.live_v2.us_quote_delayed.retrieve.v1.f0e13d45",
        "finnhub_io_api.stock.quote",
      ],
      repeatFor: (opts) => nonCashHoldings(holdings(opts)),
      target: (item) => item.symbol,
      buildParams: (opts, tool, item) => {
        const symbol = item.symbol;
        if (String(tool.tool_id).includes("live_v2")) return { s: usTicker(symbol), "page[limit]": 1, fmt: "json" };
        return String(tool.tool_id).startsWith("eodhd.") ? { symbol: usTicker(symbol), fmt: "json" } : { symbol };
      },
    },
    {
      role: "historical_prices",
      category: "historical_prices",
      preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
      strictPreferred: true,
      repeatFor: (opts) => [
        ...nonCashHoldings(holdings(opts)).map((row) => ({ symbol: row.symbol, kind: "holding" })),
        { symbol: opts.benchmark, kind: "benchmark" },
      ],
      target: (item) => item.symbol,
      buildParams: (opts, tool, item) => ({
        symbol: item.symbol,
        from: dateNDaysBefore(opts.asOf, opts.windowDays),
        to: opts.asOf,
      }),
    },
    {
      role: "profile_sector",
      category: "profile_sector",
      preferredToolIds: ["financialmodelingprep.stable.profile.retrieve.v1.0b443195"],
      repeatFor: (opts) => nonCashHoldings(holdings(opts)),
      target: (item) => item.symbol,
      buildParams: (opts, tool, item) => ({ symbol: item.symbol }),
    },
    {
      role: "news_catalyst",
      category: "news_calendar",
      preferredToolIds: ["eodhd.news.retrieve.v1.fe8bf94c", "alphavantage.news_sentiment.query.v1.467a92c0"],
      fallbackOnEmpty: true,
      repeatFor: (opts) => nonCashHoldings(holdings(opts)),
      target: (item) => item.symbol,
      buildParams: (opts, tool, item) => {
        const symbol = item.symbol;
        if (String(tool.tool_id).startsWith("eodhd.")) {
          return {
            s: usTicker(symbol),
            from: dateNDaysBefore(opts.asOf, opts.windowDays),
            to: opts.asOf,
            limit: opts.limit || 10,
            fmt: "json",
          };
        }
        return {
          function: "NEWS_SENTIMENT",
          tickers: symbol,
          sort: "LATEST",
          limit: String(opts.limit || 10),
        };
      },
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

export const defaults = {
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
  maxPaidCalls: 25,
  maxCredits: 520,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(config, defaults);
}
