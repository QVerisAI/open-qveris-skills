#!/usr/bin/env node
/**
 * Content Discovery – QVeris-powered Taobao, Xiaohongshu, Kuaishou search.
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "taobao product search 商品搜索",
  "xiaohongshu note search 小红书",
  "kuaishou video search 快手",
  "justoneapi taobao xiaohongshu kuaishou",
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

function buildParams(tool, keyword, limit) {
  const names = paramNames(tool);
  const params = {};
  if (names.has("keyword") && keyword) params.keyword = keyword;
  if (names.has("q") && keyword) params.q = keyword;
  if (names.has("query") && keyword) params.query = keyword;
  if (names.has("search_keyword") && keyword) params.search_keyword = keyword;
  if (names.has("limit") && limit) params.limit = Math.min(Number(limit) || 10, 50);
  if (names.has("page_size") && limit) params.page_size = Math.min(Number(limit) || 10, 50);
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
      if (command === "taobao" && !id.includes("taobao")) continue;
      if (command === "xiaohongshu" && !id.includes("xiaohongshu")) continue;
      if (command === "kuaishou" && !id.includes("kuaishou")) continue;
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No tools found for " + command + "." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  const keyword = opts.keyword || "推荐";
  const limit = opts.limit || 10;
  for (const tool of candidates) {
    const params = buildParams(tool, keyword, limit);
    if (Object.keys(params).length < 1) continue;
    try {
      const result = await executeTool(tool.tool_id, tool.search_id, params, MAX_RESPONSE_SIZE, timeoutMs);
      if (!isSuccess(result)) continue;
      const raw = result?.result ?? result;
      return { command, keyword, data: raw, tool_id: tool.tool_id };
    } catch (_) {
      continue;
    }
  }
  return { command, error: "All executions failed." };
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { command: null, keyword: null, limit: 10, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["taobao", "xiaohongshu", "kuaishou"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--keyword" && i + 1 < a.length) out.keyword = a[++i];
    else if (a[i] === "--limit" && i + 1 < a.length) out.limit = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Content Discovery\n\nError: ${output.error}\n`;
  let md = `## Content Discovery (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Content Discovery (QVeris)

Usage:
  node scripts/content_discovery.mjs taobao --keyword 手机
  node scripts/content_discovery.mjs xiaohongshu --keyword 美妆
  node scripts/content_discovery.mjs kuaishou --keyword 美食

Options:
  --keyword, --limit  --format markdown|json  --timeout N  --help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  const output = await runCommand(args.command, args, args.timeoutMs);
  if (args.format === "json") console.log(JSON.stringify(output, null, 2));
  else console.log(formatMarkdown(output));
}

main().catch((e) => {
  console.error(e.name === "AbortError" ? "Error: request timeout" : `Error: ${e.message}`);
  process.exit(1);
});
