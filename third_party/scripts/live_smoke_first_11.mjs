#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { callTool, discoverTools } from "../../qveris-official/scripts/qveris_client.mjs";

const scenarios = [
  {
    skill: "qveris-01-financial-services",
    attempts: [
      {
        label: "earnings surprise",
        tool_id: "qveris_finance.earnings_actual_surprise",
        query: "qveris_finance earnings surprise NVDA",
        params: { symbol: "NVDA", market: "US" },
      },
      {
        label: "consensus estimates fallback",
        tool_id: "qveris_finance.estimates_consensus",
        query: "qveris_finance analyst estimates consensus",
        params: { symbol: "NVDA", market: "US" },
      },
    ],
  },
  {
    skill: "qveris-02-langalpha-dcf-earnings",
    attempts: [
      {
        label: "cash-flow fundamentals",
        tool_id: "qveris_finance.fundamentals_cf",
        query: "qveris_finance cash flow fundamentals statement",
        params: { symbol: "MSFT", market: "US", period: "annual" },
      },
      {
        label: "income-statement fundamentals fallback",
        tool_id: "qveris_finance.fundamentals_is",
        query: "qveris_finance income statement fundamentals",
        params: { symbol: "MSFT", market: "US", period: "annual" },
      },
    ],
  },
  {
    skill: "qveris-03-market-monitor",
    attempts: [
      {
        label: "company profile",
        tool_id: "qveris_finance.ref_company_profile",
        query: "qveris_finance company profile",
        params: { symbol: "AAPL", market: "US" },
      },
    ],
  },
  {
    skill: "qveris-04-factor-finance",
    attempts: [
      {
        label: "sentiment text signals",
        tool_id: "qveris_finance.sentiment_text_signals",
        query: "qveris_finance sentiment text signals TSLA",
        params: { symbol: "TSLA", market: "US", start_date: "2026-06-29", end_date: "2026-07-06" },
      },
      {
        label: "tagged news fallback",
        tool_id: "qveris_finance.news_fin_tagged",
        query: "qveris_finance tagged financial news TSLA",
        params: { symbol: "TSLA", market: "US", start_date: "2026-06-29", end_date: "2026-07-06" },
      },
    ],
  },
  {
    skill: "qveris-05-us-stock-research",
    attempts: [
      {
        label: "structured XBRL filings",
        tool_id: "qveris_finance.filings_structured_xbrl",
        query: "qveris_finance structured XBRL filings",
        params: { symbol: "AMZN", market: "US", form: "10-K" },
      },
      {
        label: "filing metadata fallback",
        tool_id: "qveris_finance.filings_regulatory_metadata",
        query: "qveris_finance regulatory filing metadata",
        params: { symbol: "AMZN", market: "US", form: "10-K" },
      },
    ],
  },
  {
    skill: "qveris-06-tech-earnings-deepdive",
    attempts: [
      {
        label: "segment fundamentals",
        tool_id: "qveris_finance.fundamentals_segment",
        query: "qveris_finance segment revenue fundamentals",
        params: { symbol: "NVDA", market: "US" },
      },
      {
        label: "tagged news fallback",
        tool_id: "qveris_finance.news_fin_tagged",
        query: "qveris_finance tagged financial news NVDA",
        params: { symbol: "NVDA", market: "US", start_date: "2026-06-29", end_date: "2026-07-06" },
      },
      {
        label: "consensus estimates fallback",
        tool_id: "qveris_finance.estimates_consensus",
        query: "qveris_finance analyst estimates consensus",
        params: { symbol: "NVDA", market: "US" },
      },
    ],
  },
  {
    skill: "qveris-07-global-tech-memo",
    attempts: [
      {
        label: "real-time market quote",
        tool_id: "qveris_finance.mkt_l1_rt",
        query: "qveris_finance real time market quote",
        params: { symbol: "ASML", market: "US" },
      },
    ],
  },
  {
    skill: "qveris-08-earnings-tracker",
    attempts: [
      {
        label: "earnings calendar",
        tool_id: "qveris_finance.event_calendar_earnings",
        query: "qveris_finance earnings calendar",
        params: { symbol: "AAPL", market: "US", start_date: "2026-07-06", end_date: "2026-08-06" },
      },
    ],
  },
  {
    skill: "qveris-09-a-share-market-snapshot",
    attempts: [
      {
        label: "A-share market breadth",
        tool_id: "qveris_finance.mkt_breadth_internals",
        query: "qveris_finance China A share market breadth",
        params: { market: "CN", date: "2026-07-06" },
      },
      {
        label: "A-share quote fallback",
        tool_id: "qveris_finance.mkt_l1_rt",
        query: "qveris_finance China A share real time quotation",
        params: { symbol: "000001.SH", market: "CN" },
      },
      {
        label: "A-share top movers fallback",
        tool_id: "qveris_finance.mkt_top_movers",
        query: "qveris_finance China A share top movers",
        params: { market: "CN", date: "2026-07-06" },
      },
    ],
  },
  {
    skill: "qveris-10-risk-regime-review",
    attempts: [
      {
        label: "VIX index",
        tool_id: "qveris_finance.index_vix",
        query: "qveris_finance VIX index levels market regime",
        params: { symbol: "VIX", region: "US", date: "2026-07-06" },
      },
      {
        label: "market breadth fallback",
        tool_id: "qveris_finance.mkt_breadth_internals",
        query: "qveris_finance US market breadth internals",
        params: { market: "US", date: "2026-07-06" },
      },
    ],
  },
  {
    skill: "qveris-11-financial-document-modeling",
    attempts: [
      {
        label: "filing metadata",
        tool_id: "qveris_finance.filings_regulatory_metadata",
        query: "qveris_finance regulatory filing metadata",
        params: { symbol: "META", market: "US", form: "10-K" },
      },
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(1000 * attempt);
      }
    }
  }
  const message = lastError?.message || String(lastError);
  throw new Error(`${label} failed after ${attempts} attempts: ${message}`);
}

function summarizeResult(result) {
  const payload = result?.result ?? {};
  const meta = payload?._meta ?? {};
  const data = payload?.data;
  let dataShape = typeof data;
  if (Array.isArray(data)) {
    dataShape = `array(${data.length})`;
  } else if (data && typeof data === "object") {
    dataShape = `object(${Object.keys(data).slice(0, 8).join(",")})`;
  }

  return {
    execution_id: result?.execution_id,
    success: Boolean(result?.success),
    outcome: result?.execution_outcome?.outcome ?? null,
    provider_status_code: result?.execution_outcome?.provider_status_code ?? payload?.status_code ?? null,
    capability_id: meta?.capability_id ?? null,
    source_provider: meta?.source_provider ?? null,
    source_tool_id: meta?.source_tool_id ?? null,
    elapsed_time_ms: result?.elapsed_time_ms ?? null,
    cost: result?.cost ?? null,
    data_shape: dataShape,
    synced_at: meta?.synced_at ?? null,
    defaults_applied: payload?._defaults_applied ?? [],
    failover_count: Array.isArray(meta?.failover_log) ? meta.failover_log.length : 0,
  };
}

async function runAttempt(apiKey, attempt) {
  let discovery = null;
  let exact = null;
  try {
    discovery = await withRetry(
      `${attempt.tool_id} discovery`,
      () => discoverTools({ apiKey, query: attempt.query ?? attempt.tool_id, limit: 8, timeoutMs: 45000 }),
      3,
    );
    exact = (discovery.results ?? []).find((tool) => tool.tool_id === attempt.tool_id) ?? null;
  } catch (error) {
    discovery = { search_id: null, error: error.message };
  }

  const execution = await withRetry(
    `${attempt.tool_id} execution`,
    () =>
      callTool({
        apiKey,
        toolId: attempt.tool_id,
        discoveryId: exact ? discovery.search_id : undefined,
        parameters: attempt.params,
        maxResponseSize: 4096,
        timeoutMs: 90000,
      }),
    3,
  );

  return {
    label: attempt.label,
    tool_id: attempt.tool_id,
    query: attempt.query ?? attempt.tool_id,
    params: attempt.params,
    discovery_id: discovery?.search_id ?? null,
    discovery_found_exact: Boolean(exact),
    discovery_error: discovery?.error ?? null,
    execution: summarizeResult(execution),
  };
}

async function runScenario(apiKey, scenario) {
  const attempts = [];
  for (const attempt of scenario.attempts) {
    try {
      const result = await runAttempt(apiKey, attempt);
      attempts.push(result);
      if (result.execution?.success) {
        return {
          skill: scenario.skill,
          success: true,
          selected_tool_id: result.tool_id,
          selected_label: result.label,
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        label: attempt.label,
        tool_id: attempt.tool_id,
        query: attempt.query ?? attempt.tool_id,
        params: attempt.params,
        discovery_found_exact: false,
        execution: { success: false, error: error.message },
      });
    }
  }

  return {
    skill: scenario.skill,
    success: false,
    selected_tool_id: null,
    selected_label: null,
    attempts,
  };
}

async function main() {
  const apiKey = process.env.QVERIS_API_KEY;
  if (!apiKey) {
    console.error("QVERIS_API_KEY is required.");
    process.exit(2);
  }

  const startedAt = new Date().toISOString();
  const results = [];
  for (const scenario of scenarios) {
    process.stderr.write(`Running ${scenario.skill}\n`);
    results.push(await runScenario(apiKey, scenario));
  }

  const report = {
    schema_version: "qveris_live_smoke.first_11.v2",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    scenario_count: scenarios.length,
    success_count: results.filter((result) => result.success).length,
    failure_count: results.filter((result) => !result.success).length,
    results,
  };

  await mkdir("reports", { recursive: true });
  const stamp = report.finished_at.replace(/[:.]/g, "-");
  const reportPath = join("reports", `qveris-live-smoke-first-11-${stamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2));
  if (report.failure_count > 0) {
    process.exit(1);
  }
}

main();
