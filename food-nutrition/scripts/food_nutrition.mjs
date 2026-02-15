#!/usr/bin/env node
/**
 * Food Nutrition – QVeris-powered food search and nutrition (USDA FoodData Central).
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "USDA FoodData Central search foods",
  "food nutrition query search",
  "food retrieve by FDC ID",
];
const DEFAULT_TIMEOUT_MS = 15000;
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

async function searchTools(query, limit = 12, timeoutMs = 20000) {
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

function buildParams(tool, query, fdcId) {
  const names = paramNames(tool);
  const params = {};
  if (names.has("query") && query) params.query = query;
  if (names.has("q") && query) params.q = query;
  if (names.has("fdcid") && fdcId) params.fdcId = String(fdcId);
  if (names.has("fdc_id") && fdcId) params.fdc_id = String(fdcId);
  return params;
}

function isSuccess(result) {
  if (!result || result.success === false) return false;
  const d = result?.result ?? result?.data ?? result;
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
      const id = String(tool.tool_id).toLowerCase();
      if (!id.includes("usda") && !id.includes("fdc") && !id.includes("food")) continue;
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No food/nutrition tools found." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  for (const tool of candidates) {
    const params = buildParams(tool, opts.query, opts.fdcId);
    if (command === "search" && !params.query && !params.q) continue;
    if (command === "get" && !params.fdcId && !params.fdc_id) continue;
    if (Object.keys(params).length < 1) continue;
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
  const out = { command: null, query: null, fdcId: null, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["search", "get"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--query" && i + 1 < a.length) out.query = a[++i];
    else if ((a[i] === "--fdc-id" || a[i] === "--fdcid") && i + 1 < a.length) out.fdcId = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 15) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Food Nutrition\n\nError: ${output.error}\n`;
  let md = `## Food Nutrition (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Food Nutrition (QVeris)

Usage:
  node scripts/food_nutrition.mjs search --query apple
  node scripts/food_nutrition.mjs get --fdc-id 174486

Options:
  --query     Search keyword (for search)
  --fdc-id    FoodData Central ID (for get)
  --format markdown|json  --timeout N  --help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  if (args.command === "search" && !args.query) {
    console.error("search requires --query");
    process.exit(1);
  }
  if (args.command === "get" && !args.fdcId) {
    console.error("get requires --fdc-id");
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
