#!/usr/bin/env node
/**
 * Location Service – QVeris-powered POI and IP location.
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "amap place around POI nearby",
  "amap place text keyword search",
  "place detail POI 详情",
  "IP location 归属地 baidu amap",
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

function buildParams(tool, opts) {
  const names = paramNames(tool);
  const params = {};
  if (names.has("location") && opts.location) params.location = opts.location;
  if (names.has("keywords") && opts.keyword) params.keywords = opts.keyword;
  if (names.has("keyword") && opts.keyword) params.keyword = opts.keyword;
  if (names.has("city") && opts.city) params.city = opts.city;
  if (names.has("id") && opts.id) params.id = opts.id;
  if (names.has("ip") && opts.ip) params.ip = opts.ip;
  if (names.has("query") && opts.keyword) params.query = opts.keyword;
  if (names.has("limit") && opts.limit) params.limit = Math.min(Number(opts.limit) || 10, 30);
  if (names.has("radius") && opts.radius) params.radius = Number(opts.radius) || 1000;
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
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No tools found." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  for (const tool of candidates) {
    const params = buildParams(tool, opts);
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
  const out = { command: null, location: null, keyword: null, city: null, id: null, ip: null, limit: 10, radius: 1000, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["around", "search", "detail", "ip"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--location" && i + 1 < a.length) out.location = a[++i];
    else if (a[i] === "--keyword" && i + 1 < a.length) out.keyword = a[++i];
    else if (a[i] === "--city" && i + 1 < a.length) out.city = a[++i];
    else if (a[i] === "--id" && i + 1 < a.length) out.id = a[++i];
    else if (a[i] === "--ip" && i + 1 < a.length) out.ip = a[++i];
    else if (a[i] === "--limit" && i + 1 < a.length) out.limit = a[++i];
    else if (a[i] === "--radius" && i + 1 < a.length) out.radius = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Location Service\n\nError: ${output.error}\n`;
  let md = `## Location Service (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Location Service (QVeris)

Usage:
  node scripts/location_service.mjs around --location 116.4,39.9 --keyword 餐厅
  node scripts/location_service.mjs search --keyword 加油站 --city 上海
  node scripts/location_service.mjs detail --id <poi_id>
  node scripts/location_service.mjs ip --ip 8.8.8.8

Options:
  --location, --keyword, --city, --id, --ip, --limit, --radius
  --format markdown|json  --timeout N  --help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  if (args.command === "detail" && !args.id) {
    console.error("detail requires --id");
    process.exit(1);
  }
  if (args.command === "ip" && !args.ip) {
    console.error("ip requires --ip");
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
