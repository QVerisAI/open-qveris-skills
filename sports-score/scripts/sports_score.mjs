#!/usr/bin/env node
/**
 * Sports Score – QVeris-powered leagues, games, standings (API-Sports, Api-Football).
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "football leagues list api-football api_sports",
  "basketball leagues list api-sports",
  "football games fixtures score",
  "sports standings league season",
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
  if (names.has("id") && opts.league) params.id = Number(opts.league) || opts.league;
  if (names.has("league") && opts.league) params.league = Number(opts.league) || opts.league;
  if (names.has("name") && opts.search) params.name = opts.search;
  if (names.has("search") && opts.search) params.search = opts.search;
  if (names.has("country") && opts.country) params.country = opts.country;
  if (names.has("season") && opts.season) params.season = String(opts.season);
  if (names.has("date") && opts.date) params.date = opts.date;
  if (names.has("team") && opts.team) params.team = Number(opts.team) || opts.team;
  if (names.has("type") && opts.type) params.type = opts.type;
  return params;
}

function isSuccess(result) {
  if (!result || result.success === false) return false;
  const d = result?.result ?? result?.data ?? result?.response ?? result;
  if (d?.status === "error") return false;
  if (Array.isArray(d?.errors) && d.errors.length > 0) return false;
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
      const names = paramNames(tool);
      if (command === "leagues" && !id.includes("league") && !names.has("search")) continue;
      if (command === "games" && !id.includes("game") && !id.includes("fixture")) continue;
      if (command === "standings" && !id.includes("standing")) continue;
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No tools found for " + command + "." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  for (const tool of candidates) {
    const params = buildParams(tool, opts);
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
  const out = { command: null, sport: null, country: null, search: null, league: null, season: null, date: null, team: null, type: null, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (["leagues", "games", "standings"].includes(a[i])) out.command = a[i];
    else if (a[i] === "--sport" && i + 1 < a.length) out.sport = a[++i];
    else if (a[i] === "--country" && i + 1 < a.length) out.country = a[++i];
    else if (a[i] === "--search" && i + 1 < a.length) out.search = a[++i];
    else if (a[i] === "--league" && i + 1 < a.length) out.league = a[++i];
    else if (a[i] === "--season" && i + 1 < a.length) out.season = a[++i];
    else if (a[i] === "--date" && i + 1 < a.length) out.date = a[++i];
    else if (a[i] === "--team" && i + 1 < a.length) out.team = a[++i];
    else if (a[i] === "--type" && i + 1 < a.length) out.type = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Sports Score\n\nError: ${output.error}\n`;
  let md = `## Sports Score (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Sports Score (QVeris)

Usage:
  node scripts/sports_score.mjs leagues --sport football --country England
  node scripts/sports_score.mjs leagues --sport basketball --search NBA
  node scripts/sports_score.mjs games --league 39 --season 2024
  node scripts/sports_score.mjs standings --league 39 --season 2024

Options:
  --sport, --country, --search, --league, --season, --date, --team, --type
  --format markdown|json  --timeout N  --help
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
