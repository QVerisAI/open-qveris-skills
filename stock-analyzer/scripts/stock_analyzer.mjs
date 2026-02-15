#!/usr/bin/env node
/**
 * Stock Analyzer – QVeris-powered quote, fundamentals, history, stock picking.
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES_BY_CMD = {
  quote: ["stock real-time quotation China A-share", "ths_ifind real_time_quotation"],
  fundamentals: ["company financial statements company basics", "ths_ifind financial_statements company_basics"],
  history: ["stock historical quotation OHLC", "ths_ifind history_quotation"],
  pick: ["smart stock picking industry concept", "ths_ifind smart_stock_picking"],
};
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESPONSE_SIZE = 30000;

function getApiKey() {
  const k = process.env.QVERIS_API_KEY;
  if (!k) {
    console.error("Error: QVERIS_API_KEY environment variable is required.");
    process.exit(1);
  }
  return k;
}

function timeoutSignal(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, cleanup: () => clearTimeout(t) };
}

async function searchTools(query, limit = 12, timeoutMs = 15000) {
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
      signal,
    });
    if (!res.ok) throw new Error(`Search failed (${res.status}): ${await res.text()}`);
    return await res.json();
  } finally {
    cleanup();
  }
}

async function executeTool(toolId, searchId, parameters, maxSize, timeoutMs) {
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  try {
    const url = new URL(`${BASE_URL}/tools/execute`);
    url.searchParams.set("tool_id", toolId);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${getApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ search_id: searchId, parameters, max_response_size: maxSize }),
      signal,
    });
    if (!res.ok) throw new Error(`Execute failed (${res.status}): ${await res.text()}`);
    return await res.json();
  } finally {
    cleanup();
  }
}

function paramNames(tool) {
  return new Set((tool?.params ?? []).map((p) => String(p?.name ?? "").toLowerCase().trim()).filter(Boolean));
}

function scoreTool(tool) {
  const s = tool?.stats ?? {};
  const rate = Number(s.success_rate) ?? 0;
  const lat = Number(s.avg_execution_time_ms);
  return rate * 0.8 + (lat > 0 ? 1 / (1 + lat) : 0) * 0.2;
}

function buildParams(tool, symbol, keyword) {
  const names = paramNames(tool);
  const params = {};
  const sym = normalizeSymbol(symbol);
  if (names.has("symbol")) params.symbol = sym;
  if (names.has("thscode")) params.thscode = sym;
  if (names.has("code")) params.code = sym;
  if (names.has("keyword") && keyword) params.keyword = keyword;
  if (names.has("query") && keyword) params.query = keyword;
  return params;
}

function normalizeSymbol(s) {
  if (!s) return "";
  const u = String(s).trim().toUpperCase();
  if (/^\d{6}$/.test(u)) return u.startsWith("6") ? `${u}.SH` : `${u}.SZ`;
  if (/^\d{4,5}$/.test(u)) return `${u.padStart(4, "0")}.HK`;
  return u;
}

function isSuccess(result) {
  if (!result || result.success === false) return false;
  const d = result?.result?.data ?? result?.result ?? result?.data ?? result;
  if (d?.status === "error") return false;
  if (typeof d?.["Error Message"] === "string") return false;
  return true;
}

function collectCandidates(queries, timeoutMs) {
  const seen = new Set();
  const list = [];
  return async function next() {
    for (const q of queries) {
      const searchResult = await searchTools(q, 12, timeoutMs + 2000);
      for (const tool of searchResult.results ?? []) {
        if (!tool?.tool_id || seen.has(tool.tool_id)) continue;
        seen.add(tool.tool_id);
        list.push({ ...tool, search_id: searchResult.search_id });
      }
    }
    return list;
  };
}

async function runCommand(command, symbol, keyword, format, timeoutMs) {
  const queries = SEARCH_QUERIES_BY_CMD[command] ?? [];
  if (queries.length === 0) return { error: `Unknown command: ${command}` };
  if (command !== "pick" && !symbol) return { error: `Command ${command} requires --symbol` };
  if (command === "pick" && !keyword) return { error: "Command pick requires --keyword" };

  const getCandidates = collectCandidates(queries, timeoutMs);
  const candidates = await getCandidates();
  if (candidates.length === 0) return { error: "No tools found." };

  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  for (const tool of candidates) {
    const params = buildParams(tool, symbol, keyword);
    if (command !== "pick" && Object.keys(params).length < 1) continue;
    try {
      const result = await executeTool(tool.tool_id, tool.search_id, params, MAX_RESPONSE_SIZE, timeoutMs);
      if (!isSuccess(result)) continue;
      const raw = result?.result ?? result;
      return { command, symbol: symbol || null, keyword: keyword || null, data: raw, tool_id: tool.tool_id };
    } catch (_) {
      continue;
    }
  }
  return { command, error: "All tool executions failed." };
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { command: null, symbol: null, keyword: null, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["quote", "fundamentals", "history", "pick"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--symbol" && i + 1 < a.length) out.symbol = a[++i];
    else if (a[i] === "--keyword" && i + 1 < a.length) out.keyword = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Stock Analyzer\n\nError: ${output.error}\n`;
  let md = `## Stock Analyzer (${output.command})\n\n`;
  if (output.symbol) md += `**Symbol:** ${output.symbol}\n`;
  if (output.keyword) md += `**Keyword:** ${output.keyword}\n`;
  md += "\n```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Stock Analyzer (QVeris)

Usage:
  node scripts/stock_analyzer.mjs quote --symbol 600519
  node scripts/stock_analyzer.mjs fundamentals --symbol 600519
  node scripts/stock_analyzer.mjs history --symbol 600519
  node scripts/stock_analyzer.mjs pick --keyword 新能源

Options:
  --symbol CODE   Stock symbol (e.g. 600519, 0700.HK)
  --keyword TEXT  Keyword for pick (e.g. 新能源)
  --format markdown|json
  --timeout N     Timeout seconds (default 10)
  --help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  const output = await runCommand(args.command, args.symbol, args.keyword, args.format, args.timeoutMs);
  if (args.format === "json") console.log(JSON.stringify(output, null, 2));
  else console.log(formatMarkdown(output));
}

main().catch((e) => {
  console.error(e.name === "AbortError" ? "Error: request timeout" : `Error: ${e.message}`);
  process.exit(1);
});
