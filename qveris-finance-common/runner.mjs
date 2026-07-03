import { promises as fs } from "node:fs";
import path from "node:path";

const BASE_URL = "https://qveris.ai/api/v1";

function isoNow() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usage() {
  return `Usage:
  node scripts/run.mjs [--dry-run | --live] [options]

Common options:
  --ticker SYMBOL              Single ticker, default from skill config
  --tickers A,B,C              Ticker list
  --holdings AAPL:25,NVDA:25   Portfolio weights, percent units
  --universe AAPL,NVDA,MSFT    Factor universe
  --sectors XLK,XLF,XLV        Sector ETF/proxy list
  --market MARKET              Market code, default US
  --benchmark SYMBOL           Benchmark/proxy
  --window-days N              Lookback window, default from skill config
  --max-paid-calls N           Paid call cap
  --max-credits N              Credit cap
  --output PATH                Markdown report path
  --json-output PATH           Business result JSON path
  --trace PATH                 JSON trace path
  --fixture PATH               Use saved fixture instead of QVeris
  --as-of YYYY-MM-DD           As-of date for date-sensitive tools
`;
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseHoldings(value) {
  const out = [];
  for (const part of parseList(value)) {
    const [symbol, rawWeight] = part.split(":");
    const weight = Number(rawWeight);
    if (symbol && Number.isFinite(weight)) out.push({ symbol: symbol.trim(), weight });
  }
  return out;
}

export function parseArgs(argv = process.argv.slice(2), defaults = {}) {
  const opts = {
    dryRun: false,
    live: false,
    ticker: defaults.ticker || "NVDA",
    tickers: defaults.tickers || [],
    holdings: defaults.holdings || [],
    universe: defaults.universe || [],
    sectors: defaults.sectors || [],
    market: defaults.market || "US",
    benchmark: defaults.benchmark || "SPY",
    windowDays: defaults.windowDays || 7,
    maxPaidCalls: defaults.maxPaidCalls || 3,
    maxCredits: defaults.maxCredits || 30,
    output: defaults.output || null,
    jsonOutput: defaults.jsonOutput || null,
    trace: defaults.trace || null,
    fixture: null,
    asOf: defaults.asOf || new Date().toISOString().slice(0, 10),
    limit: defaults.limit || 5,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--live") opts.live = true;
    else if (arg === "--ticker") opts.ticker = argv[++i];
    else if (arg === "--tickers") opts.tickers = parseList(argv[++i]);
    else if (arg === "--holdings") opts.holdings = parseHoldings(argv[++i]);
    else if (arg === "--universe") opts.universe = parseList(argv[++i]);
    else if (arg === "--sectors") opts.sectors = parseList(argv[++i]);
    else if (arg === "--market") opts.market = argv[++i];
    else if (arg === "--benchmark") opts.benchmark = argv[++i];
    else if (arg === "--window-days") opts.windowDays = Number(argv[++i]);
    else if (arg === "--max-paid-calls") opts.maxPaidCalls = Number(argv[++i]);
    else if (arg === "--max-credits") opts.maxCredits = Number(argv[++i]);
    else if (arg === "--output") opts.output = argv[++i];
    else if (arg === "--json-output") opts.jsonOutput = argv[++i];
    else if (arg === "--trace") opts.trace = argv[++i];
    else if (arg === "--fixture") opts.fixture = argv[++i];
    else if (arg === "--as-of") opts.asOf = argv[++i];
    else if (arg === "--limit") opts.limit = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!opts.dryRun && !opts.live && !opts.fixture) opts.dryRun = true;
  return opts;
}

export function dateNDaysBefore(asOf, days) {
  const date = new Date(`${asOf}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function toAlphaVantageTimestamp(date) {
  return String(date || "").replaceAll("-", "") + "T0000";
}

export function usTicker(symbol) {
  const s = String(symbol || "").trim().toUpperCase();
  if (!s) return s;
  if (s.includes(".") || s.includes("-")) return s;
  return `${s}.US`;
}

function apiKey() {
  const key = process.env.QVERIS_API_KEY;
  if (!key) throw new Error("QVERIS_API_KEY is required for live QVeris operations");
  return key;
}

async function qverisPost(pathname, body, query = {}, timeoutMs = 90_000) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(`${BASE_URL}${pathname}`);
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 1000)}`);
      return text ? JSON.parse(text) : {};
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function costOf(tool) {
  const raw = tool?.billing_rule?.price?.amount_credits ?? tool?.expected_cost ?? 0;
  const number = Number(String(raw).match(/[0-9.]+/)?.[0] ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function summarizeTool(tool) {
  return {
    tool_id: tool.tool_id || tool.id,
    name: tool.name || "",
    provider: String(tool.tool_id || tool.id || "").split(".")[0] || "unknown",
    expected_cost: tool.expected_cost ?? tool.billing_rule?.price?.amount_credits ?? null,
    success_rate: tool.stats?.success_rate ?? null,
    avg_execution_time_ms: tool.stats?.avg_execution_time_ms ?? null,
    billing_rule: tool.billing_rule || null,
    params: (tool.params || []).map((param) => ({
      name: param.name,
      type: param.type,
      required: Boolean(param.required),
      enum: param.enum || undefined,
    })),
  };
}

function normalizeInspectResults(result) {
  if (Array.isArray(result?.results)) return result.results;
  if (Array.isArray(result?.tools)) return result.tools;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
}

function toolId(tool) {
  return tool?.tool_id || tool?.id || "";
}

function uniqueTools(tools) {
  const seen = new Set();
  const out = [];
  for (const tool of tools) {
    const id = toolId(tool);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(tool);
  }
  return out;
}

function chooseTools(category, plan) {
  const inspected = category.inspected || [];
  const discovered = category.discovered || [];
  const all = [...inspected, ...discovered];
  const candidates = [];
  for (const preferred of plan.preferredToolIds || []) {
    const hit = all.find((tool) => toolId(tool) === preferred);
    if (hit) candidates.push(hit);
  }
  if (plan.strictPreferred) return uniqueTools(candidates);
  if (plan.provider) {
    const hits = all.filter((tool) => String(toolId(tool)).startsWith(`${plan.provider}.`));
    candidates.push(...hits);
  }
  candidates.push(...all);
  return uniqueTools(candidates);
}

export async function preflight(config, opts) {
  const categories = {};
  const trace = [];
  for (const category of config.toolCategories) {
    const started = isoNow();
    const discovery = await qverisPost("/search", {
      query: category.query,
      limit: category.limit || 5,
    });
    const discovered = discovery.results || [];
    const toolIds = discovered.slice(0, category.inspectLimit || 5).map((tool) => tool.tool_id).filter(Boolean);
    let inspected = [];
    if (toolIds.length) {
      const inspectResult = await qverisPost("/tools/by-ids", { tool_ids: toolIds, search_id: discovery.search_id });
      inspected = normalizeInspectResults(inspectResult);
    }
    categories[category.key] = {
      key: category.key,
      query: category.query,
      search_id: discovery.search_id,
      discovered: discovered.map(summarizeTool),
      inspected: inspected.map(summarizeTool),
    };
    trace.push({
      type: "preflight",
      category: category.key,
      query: category.query,
      search_id: discovery.search_id,
      started_at: started,
      finished_at: isoNow(),
      inspected_tool_ids: toolIds,
    });
  }
  return { categories, trace };
}

export function resultPayload(raw) {
  return raw?.result?.data ?? raw?.data ?? raw?.result ?? raw ?? {};
}

export function countRecords(value, depth = 0) {
  if (depth > 4 || value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") {
    let total = 0;
    for (const v of Object.values(value)) total += countRecords(v, depth + 1);
    return total || (Object.keys(value).length ? 1 : 0);
  }
  return 0;
}

export function genericEvidence(result) {
  const payload = resultPayload(result.raw_result);
  return {
    role: result.role,
    tool_id: result.tool_id,
    ok: result.ok,
    cost: result.cost,
    execution_id: result.execution_id || null,
    record_count: countRecords(payload),
    error: result.error || null,
  };
}

function hasUsablePayload(call, plan) {
  if (call.ok === false) return false;
  if (!plan.fallbackOnEmpty) return true;
  return countRecords(resultPayload(call.raw_result)) > 0;
}

export async function executePlan(config, opts, preflightResult) {
  const calls = [];
  const trace = [];
  let paidCalls = 0;
  let credits = 0;

  for (const plan of config.callPlan) {
    if (paidCalls >= opts.maxPaidCalls) break;
    const category = preflightResult.categories[plan.category];
    if (!category) {
      trace.push({ type: "call_skipped", role: plan.role, reason: `missing category ${plan.category}` });
      continue;
    }
    const candidates = chooseTools(category, plan);
    if (!candidates.length) {
      trace.push({ type: "call_skipped", role: plan.role, reason: "no inspected tool candidate" });
      continue;
    }

    let completedRole = false;
    const maxAttempts = Math.min(candidates.length, plan.maxAttempts ?? candidates.length);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (paidCalls >= opts.maxPaidCalls) {
        trace.push({ type: "call_skipped", role: plan.role, reason: "paid call budget exhausted before fallback" });
        break;
      }
      const tool = { ...candidates[attempt], tool_id: toolId(candidates[attempt]) };
      const expectedCost = costOf(tool);
      if (credits + expectedCost > opts.maxCredits) {
        trace.push({
          type: "call_skipped",
          role: plan.role,
          tool_id: tool.tool_id,
          reason: "credit budget would be exceeded",
          expected_cost: expectedCost,
        });
        continue;
      }
      const params = plan.buildParams(opts, tool);
      const started = isoNow();
      let call = null;
      try {
        const raw = await qverisPost(
          "/tools/execute",
          { search_id: category.search_id, parameters: params, max_response_size: plan.maxResponseSize || 30_000 },
          { tool_id: tool.tool_id },
          plan.timeoutMs || 120_000,
        );
        const actualCost = Number(raw.cost ?? raw.credits ?? expectedCost ?? 0) || expectedCost;
        paidCalls += 1;
        credits += actualCost;
        call = {
          role: plan.role,
          category: plan.category,
          tool_id: tool.tool_id,
          provider: tool.provider,
          parameters: params,
          expected_cost: expectedCost,
          cost: actualCost,
          ok: raw.success !== false,
          execution_id: raw.execution_id || raw.id || raw.request_id || null,
          raw_result: raw,
        };
        calls.push(call);
        trace.push({ type: "call", started_at: started, finished_at: isoNow(), ...genericEvidence(call) });
      } catch (error) {
        paidCalls += 1;
        credits += expectedCost;
        call = {
          role: plan.role,
          category: plan.category,
          tool_id: tool.tool_id,
          provider: tool.provider,
          parameters: params,
          expected_cost: expectedCost,
          cost: expectedCost,
          ok: false,
          execution_id: null,
          error: error?.message || String(error),
          raw_result: null,
        };
        calls.push(call);
        trace.push({ type: "call_error", started_at: started, finished_at: isoNow(), ...genericEvidence(call) });
      }

      if (hasUsablePayload(call, plan)) {
        completedRole = true;
        break;
      }
      const shouldFallback =
        (plan.fallbackOnUnsuccessful !== false && call.ok === false) ||
        (plan.fallbackOnEmpty && countRecords(resultPayload(call.raw_result)) === 0);
      if (!shouldFallback) {
        break;
      }
      if (attempt < maxAttempts - 1) {
        trace.push({
          type: "fallback_attempt",
          role: plan.role,
          failed_tool_id: call.tool_id,
          next_tool_id: candidates[attempt + 1].tool_id,
        });
      }
    }
    if (!completedRole && maxAttempts < candidates.length) {
      trace.push({
        type: "fallback_skipped",
        role: plan.role,
        reason: "role fallback attempt cap reached",
        max_attempts: maxAttempts,
        remaining_candidates: candidates.length - maxAttempts,
      });
    }
    if (!completedRole && paidCalls >= opts.maxPaidCalls) break;
  }

  return { calls, trace, usage: { paid_calls: paidCalls, estimated_credits: Number(credits.toFixed(2)) } };
}

function inputSummary(config, opts) {
  return config.inputSummary ? config.inputSummary(opts) : {
    ticker: opts.ticker,
    tickers: opts.tickers,
    market: opts.market,
    window_days: opts.windowDays,
  };
}

function defaultAnalysis(config, opts, calls) {
  return {
    title: config.title,
    scope: inputSummary(config, opts),
    evidence: calls.map(genericEvidence),
    findings: ["QVeris calls completed. Review evidence rows and missing-data notes before acting."],
    risks: ["Not investment advice.", "Signals depend on selected providers and coverage."],
  };
}

export function renderMarkdown(config, opts, analysis, context) {
  const lines = [
    `# ${config.title}`,
    "",
    `Skill: \`${config.id}\``,
    `Mode: ${context.mode}`,
    `Generated at: ${context.generated_at}`,
    "",
    "## Scope",
    "```json",
    JSON.stringify(analysis.scope || inputSummary(config, opts), null, 2),
    "```",
    "",
    "## Findings",
  ];
  for (const item of analysis.findings || []) lines.push(`- ${item}`);
  lines.push("", "## Evidence");
  lines.push("| Role | Tool | OK | Records | Cost |");
  lines.push("| --- | --- | --- | ---: | ---: |");
  for (const row of analysis.evidence || []) {
    lines.push(`| ${row.role || ""} | \`${row.tool_id || ""}\` | ${row.ok === false ? "no" : "yes"} | ${row.record_count ?? 0} | ${row.cost ?? 0} |`);
  }
  lines.push("", "## Missing Data And Risks");
  for (const item of analysis.risks || []) lines.push(`- ${item}`);
  lines.push("", "## QVeris Usage");
  lines.push(`- Paid calls: ${context.usage?.paid_calls ?? 0}`);
  lines.push(`- Estimated credits: ${context.usage?.estimated_credits ?? 0}`);
  lines.push("- Not investment advice.");
  lines.push("");
  return lines.join("\n");
}

export function buildBusinessOutput(config, opts, analysis, context) {
  return {
    schema_version: config.outputSchemaVersion || "2026-07-03",
    skill_id: config.id,
    generated_at: context.generated_at,
    mode: context.mode,
    scope: analysis.scope || inputSummary(config, opts),
    findings: analysis.findings || [],
    evidence: analysis.evidence || [],
    risks: analysis.risks || [],
    usage: context.usage || { paid_calls: 0, estimated_credits: 0 },
    result: analysis.result || {},
  };
}

export async function runSkill(config, opts) {
  const generatedAt = isoNow();
  let mode = opts.fixture ? "fixture" : opts.live ? "live" : "dry-run";
  let preflightResult = { categories: {}, trace: [] };
  let callResult = { calls: [], trace: [], usage: { paid_calls: 0, estimated_credits: 0 } };
  let fixture = null;

  if (opts.fixture) {
    fixture = JSON.parse(await fs.readFile(opts.fixture, "utf8"));
    opts = { ...opts, ...(fixture.inputs || {}) };
    callResult = {
      calls: fixture.calls || [],
      trace: fixture.trace || [],
      usage: fixture.usage || { paid_calls: 0, estimated_credits: 0 },
    };
  } else {
    preflightResult = await preflight(config, opts);
    if (opts.live) {
      callResult = await executePlan(config, opts, preflightResult);
    }
  }

  const analysis = config.analyze
    ? config.analyze({ opts, calls: callResult.calls, preflight: preflightResult, fixture })
    : defaultAnalysis(config, opts, callResult.calls);
  const context = {
    skill_id: config.id,
    mode,
    generated_at: generatedAt,
    usage: callResult.usage,
    preflight: preflightResult.categories,
    calls: callResult.calls.map((call) => ({ ...call, raw_result: undefined })),
    trace: [...preflightResult.trace, ...callResult.trace],
  };
  const markdown = renderMarkdown(config, opts, analysis, context);
  const businessOutput = buildBusinessOutput(config, opts, analysis, context);

  if (opts.output) {
    await fs.mkdir(path.dirname(opts.output), { recursive: true });
    await fs.writeFile(opts.output, markdown, "utf8");
  }
  if (opts.jsonOutput) {
    await fs.mkdir(path.dirname(opts.jsonOutput), { recursive: true });
    await fs.writeFile(opts.jsonOutput, JSON.stringify(businessOutput, null, 2), "utf8");
  }
  if (opts.trace) {
    await fs.mkdir(path.dirname(opts.trace), { recursive: true });
    await fs.writeFile(opts.trace, JSON.stringify(context, null, 2), "utf8");
  }
  return { markdown, trace: context, analysis, businessOutput };
}

export async function runCli(config, defaults = {}) {
  try {
    const opts = parseArgs(process.argv.slice(2), defaults);
    const result = await runSkill(config, opts);
    if (!opts.output) console.log(result.markdown);
    else console.log(`Wrote report: ${opts.output}`);
    if (opts.jsonOutput) console.log(`Wrote business JSON: ${opts.jsonOutput}`);
    if (opts.trace) console.log(`Wrote trace: ${opts.trace}`);
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  }
}
