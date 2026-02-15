#!/usr/bin/env node
/**
 * Crypto Tracker – QVeris-powered crypto price, markets, conversion.
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "cryptocurrency price Bitcoin ETH market",
  "coinmarketcap coingecko price list",
  "crypto price conversion fiat",
];
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
  return (Number(s.success_rate) ?? 0) * 0.8 + (Number(s.avg_execution_time_ms) > 0 ? 1 / (1 + Number(s.avg_execution_time_ms)) : 0) * 0.2;
}

function buildParams(tool, symbol, limit, from, to, amount) {
  const names = paramNames(tool);
  const params = {};
  if (names.has("symbol") && symbol) params.symbol = String(symbol).toUpperCase();
  if (names.has("id") && symbol) params.id = symbol;
  if (names.has("slug") && symbol) params.slug = String(symbol).toLowerCase();
  if (names.has("limit") && limit) params.limit = Math.min(Number(limit) || 10, 100);
  if (names.has("vs_currency")) params.vs_currency = (to || "usd").toLowerCase();
  if (names.has("from") && from) params.from = String(from).toLowerCase();
  if (names.has("to") && to) params.to = String(to).toLowerCase();
  if (names.has("amount") && amount != null) params.amount = Number(amount) || 1;
  if (names.has("convert") && to) params.convert = String(to).toUpperCase();
  return params;
}

function isSuccess(result) {
  if (!result || result.success === false) return false;
  const d = result?.result?.data ?? result?.result ?? result?.data ?? result;
  if (Array.isArray(d)) return true;
  if (d?.status === "error") return false;
  return true;
}

async function runCommand(command, opts, timeoutMs) {
  const candidates = [];
  const seen = new Set();
  for (const q of SEARCH_QUERIES) {
    const searchResult = await searchTools(q, 12, timeoutMs + 2000);
    for (const tool of searchResult.results ?? []) {
      if (!tool?.tool_id || seen.has(tool.tool_id)) continue;
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No tools found." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  for (const tool of candidates) {
    const params = buildParams(tool, opts.symbol, opts.limit, opts.from, opts.to, opts.amount);
    try {
      const result = await executeTool(tool.tool_id, tool.search_id, params, MAX_RESPONSE_SIZE, timeoutMs);
      if (!isSuccess(result)) continue;
      const raw = result?.result ?? result;
      return { command, ...opts, data: raw, tool_id: tool.tool_id };
    } catch (_) {
      continue;
    }
  }
  return { command, ...opts, error: "All executions failed." };
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { command: null, symbol: null, limit: 20, from: null, to: null, amount: null, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["price", "markets", "convert"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--symbol" && i + 1 < a.length) out.symbol = a[++i];
    else if (a[i] === "--limit" && i + 1 < a.length) out.limit = a[++i];
    else if (a[i] === "--from" && i + 1 < a.length) out.from = a[++i];
    else if (a[i] === "--to" && i + 1 < a.length) out.to = a[++i];
    else if (a[i] === "--amount" && i + 1 < a.length) out.amount = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Crypto Tracker\n\nError: ${output.error}\n`;
  let md = `## Crypto Tracker (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Crypto Tracker (QVeris)

Usage:
  node scripts/crypto_tracker.mjs price --symbol BTC
  node scripts/crypto_tracker.mjs markets --limit 20
  node scripts/crypto_tracker.mjs convert --from BTC --to USD --amount 0.1

Options:
  --symbol, --from, --to, --amount, --limit
  --format markdown|json  --timeout N  --help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  if (args.command === "price" && !args.symbol) {
    console.error("price requires --symbol");
    process.exit(1);
  }
  if (args.command === "convert" && (!args.from || !args.to)) {
    console.error("convert requires --from and --to");
    process.exit(1);
  }
  const output = await runCommand(args.command, args, args.timeoutMs);
  if (args.format === "json") console.log(JSON.stringify(output, null, 2));
  else console.log(formatMarkdown(output));
}

main().catch((e) => {
  console.error(e.name === "AbortError" ? "Error: request timeout" : `Error: ${e.message}`);
  process.exit(1);
});
