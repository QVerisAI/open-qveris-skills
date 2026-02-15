#!/usr/bin/env node
/**
 * Term Translation – QVeris-powered term/phrase translation.
 */

const BASE_URL = "https://qveris.ai/api/v1";
const SEARCH_QUERIES = [
  "term translation translate language",
  "data.gov term_translation",
  "vocabulary translation terms lang_codes",
];
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESPONSE_SIZE = 20480;

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

function buildParams(tool, terms, langCodes) {
  const names = paramNames(tool);
  const params = {};
  if (names.has("terms")) params.terms = Array.isArray(terms) ? terms : (terms || "").split(",").map((t) => t.trim()).filter(Boolean);
  if (names.has("lang_codes") && langCodes) params.lang_codes = Array.isArray(langCodes) ? langCodes : String(langCodes).split(",").map((c) => c.trim()).filter(Boolean);
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
      if (!paramNames(tool).has("terms")) continue;
      seen.add(tool.tool_id);
      candidates.push({ ...tool, search_id: searchResult.search_id });
    }
  }
  if (candidates.length === 0) return { command, error: "No translation tools found." };
  candidates.sort((a, b) => scoreTool(b) - scoreTool(a));

  const terms = opts.terms ? (Array.isArray(opts.terms) ? opts.terms : String(opts.terms).split(",").map((t) => t.trim()).filter(Boolean)) : [];
  const langs = opts.langs ? (Array.isArray(opts.langs) ? opts.langs : String(opts.langs).split(",").map((c) => c.trim()).filter(Boolean)) : [];
  if (terms.length === 0) return { command, error: "At least one term required (--terms)." };

  for (const tool of candidates) {
    const params = buildParams(tool, terms, langs.length ? langs : undefined);
    if (!params.terms || params.terms.length === 0) continue;
    try {
      const result = await executeTool(tool.tool_id, tool.search_id, params, MAX_RESPONSE_SIZE, timeoutMs);
      if (!isSuccess(result)) continue;
      const raw = result?.result ?? result;
      return { command, terms, lang_codes: langs, data: raw, tool_id: tool.tool_id };
    } catch (_) {
      continue;
    }
  }
  return { command, terms, error: "All executions failed." };
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { command: null, terms: null, langs: null, format: "markdown", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "translate") out.command = "translate";
    else if (a[i] === "--terms" && i + 1 < a.length) out.terms = a[++i];
    else if (a[i] === "--langs" && i + 1 < a.length) out.langs = a[++i];
    else if (a[i] === "--format" && i + 1 < a.length) out.format = a[++i];
    else if (a[i] === "--timeout" && i + 1 < a.length) out.timeoutMs = (Number(a[++i]) || 10) * 1000;
    else if (a[i] === "--help" || a[i] === "-h") out.help = true;
  }
  return out;
}

function formatMarkdown(output) {
  if (output.error) return `## Term Translation\n\nError: ${output.error}\n`;
  let md = `## Term Translation (${output.command})\n\n`;
  md += "```json\n" + JSON.stringify(output.data, null, 2) + "\n```\n";
  if (output.tool_id) md += `\n*(via ${output.tool_id})*\n`;
  return md;
}

function printHelp() {
  console.log(`Term Translation (QVeris)

Usage:
  node scripts/term_translation.mjs translate --terms hello,world --langs zh,es
  node scripts/term_translation.mjs translate --terms 碳中和 --langs en

Options:
  --terms  Comma-separated terms to translate
  --langs  Optional comma-separated target language codes
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
