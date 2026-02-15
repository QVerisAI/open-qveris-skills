#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://qveris.ai/api/v1";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, "..");
const EVOLUTION_DIR = path.join(SKILL_ROOT, ".evolution");
const EVOLUTION_FILE = path.join(EVOLUTION_DIR, "tool-evolution.json");
const EVOLUTION_VERSION = 1;

const CAPABILITY_QUERIES = {
  quote: "real-time stock quote and historical OHLCV data API",
  fundamentals: "company financial statements and valuation metrics API",
  technicals: "technical indicators RSI MACD moving average API",
  sentiment: "stock news sentiment and market headlines API",
  x_sentiment: "X Twitter stock sentiment API by ticker",
};

const CN_HK_QUERY_HINTS = {
  quote: "China and Hong Kong stock real-time quotation API",
  fundamentals: "China and Hong Kong stock company basics API",
  technicals: "China and Hong Kong stock historical quotation API",
};

const X_SENTIMENT_TOOL_PREFIXES = [
  "x_developer.2.tweets.search.recent",
  "qveris_social.x_domain_new_posts",
  "qveris_social.x_domain_hot_topics",
  "qveris_social.x_domain_hot_events",
];

function redactSecrets(text) {
  if (!text) return text;
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, "Bearer [REDACTED]")
    .replace(/QVERIS_API_KEY\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, "QVERIS_API_KEY=[REDACTED]")
    .replace(/[A-Za-z0-9_-]{24,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}/g, "[REDACTED_TOKEN]");
}

function isoNow() {
  return new Date().toISOString();
}

function getApiKey() {
  const key = process.env.QVERIS_API_KEY;
  if (!key) {
    console.error("Error: QVERIS_API_KEY environment variable is required.");
    process.exit(1);
  }
  return key;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

function emptyEvolutionState() {
  return {
    version: EVOLUTION_VERSION,
    updated_at: isoNow(),
    capability_buckets: {},
  };
}

function ensureBucket(state, capability) {
  if (!state.capability_buckets[capability]) {
    state.capability_buckets[capability] = {
      tools: {},
      priority_queue: [],
    };
  }
  return state.capability_buckets[capability];
}

async function loadEvolutionState() {
  try {
    const content = await fs.readFile(EVOLUTION_FILE, "utf8");
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") return emptyEvolutionState();
    if (!parsed.capability_buckets || typeof parsed.capability_buckets !== "object") {
      return emptyEvolutionState();
    }
    return parsed;
  } catch {
    return emptyEvolutionState();
  }
}

async function saveEvolutionState(state) {
  const payload = {
    version: EVOLUTION_VERSION,
    updated_at: isoNow(),
    capability_buckets: state.capability_buckets || {},
  };
  await fs.mkdir(EVOLUTION_DIR, { recursive: true });
  await fs.writeFile(EVOLUTION_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function pickProvider(toolId) {
  if (!toolId) return "unknown";
  const first = String(toolId).split(".")[0];
  return first || "unknown";
}

function scoreEvolutionRecord(record, market) {
  const success = Number(record.success_count || 0);
  const fail = Number(record.fail_count || 0);
  const ratio = (success + 1) / (success + fail + 1);
  const elapsed = Number(record.avg_elapsed_ms || 10000);
  const speedScore = elapsed > 0 ? 1 / (1 + elapsed) : 0;
  const marketMatch = Array.isArray(record.markets) && record.markets.includes(market) ? 0.1 : 0;
  return ratio * 0.85 + speedScore * 0.05 + marketMatch;
}

function refreshBucketPriority(state, capability, market) {
  const bucket = ensureBucket(state, capability);
  bucket.priority_queue = Object.values(bucket.tools)
    .sort((a, b) => scoreEvolutionRecord(b, market) - scoreEvolutionRecord(a, market))
    .map((x) => x.tool_id);
}

function getEvolutionCandidates(state, capability, market) {
  const bucket = ensureBucket(state, capability);
  refreshBucketPriority(state, capability, market);
  const candidates = [];
  for (const toolId of bucket.priority_queue.slice(0, 5)) {
    const record = bucket.tools[toolId];
    if (!record) continue;
    candidates.push({
      tool_id: record.tool_id,
      stats: {
        success_rate: (record.success_count + 1) / (record.success_count + record.fail_count + 1),
        avg_execution_time_ms: record.avg_elapsed_ms || 9999,
      },
      _fromEvolution: true,
      _cachedSearchId: record.last_search_id || null,
    });
  }
  return candidates;
}

function updateEvolutionOnAttempt(state, meta) {
  const {
    capability,
    market,
    symbol,
    toolId,
    elapsedMs,
    success,
    searchId,
    newlyLearnedCollector,
  } = meta;
  if (!toolId || !capability) return;
  const bucket = ensureBucket(state, capability);
  if (!bucket.tools[toolId]) {
    bucket.tools[toolId] = {
      tool_id: toolId,
      provider: pickProvider(toolId),
      first_seen_at: isoNow(),
      last_success_at: null,
      success_count: 0,
      fail_count: 0,
      avg_elapsed_ms: 0,
      markets: [],
      symbols_sample: [],
      last_search_id: null,
    };
  }
  const record = bucket.tools[toolId];
  if (!record.markets.includes(market)) record.markets.push(market);
  if (symbol && !record.symbols_sample.includes(symbol) && record.symbols_sample.length < 10) {
    record.symbols_sample.push(symbol);
  }
  if (searchId) record.last_search_id = searchId;

  if (success) {
    record.success_count += 1;
    record.last_success_at = isoNow();
    const prev = Number(record.avg_elapsed_ms || 0);
    const n = record.success_count;
    record.avg_elapsed_ms = n === 1 ? elapsedMs : Math.round((prev * (n - 1) + elapsedMs) / n);
    if (newlyLearnedCollector && n === 1) {
      newlyLearnedCollector.push(toolId);
    }
  } else {
    record.fail_count += 1;
  }
  refreshBucketPriority(state, capability, market);
}

async function searchTools(query, limit, timeoutMs) {
  const apiKey = getApiKey();
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Search failed (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  } finally {
    cleanup();
  }
}

async function executeTool(toolId, searchId, parameters, maxResponseSize, timeoutMs) {
  const apiKey = getApiKey();
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  try {
    const url = new URL(`${BASE_URL}/tools/execute`);
    url.searchParams.set("tool_id", toolId);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search_id: searchId,
        parameters,
        max_response_size: maxResponseSize,
      }),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Execute failed (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  } finally {
    cleanup();
  }
}

function isToolCallSuccessful(result) {
  if (!result || typeof result !== "object") return false;
  if (result.success === false) return false;
  const payload = result?.result ?? result;
  const data = payload?.data ?? payload;
  if (data?.status === "error") return false;
  if (typeof data?.code === "number" && data.code >= 400) return false;
  if (typeof data?.["Error Message"] === "string") return false;
  if (typeof data?.Information === "string" && data.Information.toLowerCase().includes("burst pattern")) return false;
  return true;
}

function scoreTool(tool) {
  const stats = tool?.stats || {};
  const successRate = toNumber(stats.success_rate) ?? 0;
  const latency = toNumber(stats.avg_execution_time_ms);
  const latencyScore = latency && latency > 0 ? 1 / (1 + latency) : 0;
  const hasExamples = tool?.examples?.sample_parameters ? 0.03 : 0;
  return successRate * 0.8 + latencyScore * 0.17 + hasExamples;
}

function rankTools(results) {
  return [...(results || [])]
    .sort((a, b) => scoreTool(b) - scoreTool(a))
    .map((tool) => ({
      ...tool,
      _score: scoreTool(tool),
    }));
}

function normalizeSymbols(input, market) {
  const raw = (input || "").trim();
  if (!raw) return [];
  const candidates = new Set([raw.toUpperCase()]);
  const upper = raw.toUpperCase();

  if (market === "US") {
    candidates.add(upper.replace(/\.US$/, ""));
    candidates.add(`${upper.replace(/\.US$/, "")}.US`);
  } else if (market === "HK") {
    const core = upper.replace(/\.HK$/, "").replace(/^0+/, "") || "0";
    candidates.add(`${core}.HK`);
    candidates.add(`${core.padStart(4, "0")}.HK`);
    candidates.add(core.padStart(4, "0"));
  } else if (market === "CN") {
    const core = upper.replace(/\.(SS|SH|SZ)$/, "");
    candidates.add(`${core}.SS`);
    candidates.add(`${core}.SH`);
    candidates.add(`${core}.SZ`);
  } else {
    candidates.add(`${upper}.US`);
    if (/^\d+$/.test(upper)) {
      candidates.add(`${upper}.HK`);
      candidates.add(`${upper}.SS`);
      candidates.add(`${upper}.SZ`);
    }
  }

  return [...candidates];
}

function toThsCode(symbol, market) {
  const upper = (symbol || "").toUpperCase();
  if (upper.includes(".")) return upper;
  if (market === "CN") {
    if (upper.startsWith("6")) return `${upper}.SH`;
    return `${upper}.SZ`;
  }
  if (market === "HK") {
    return `${upper.replace(/^0+/, "").padStart(4, "0")}.HK`;
  }
  return upper;
}

function extractJSONFromTruncatedContent(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseDateLike(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const normalized = value.includes("T") ? value : `${value}T00:00:00Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function isStale(value, days = 5) {
  const date = parseDateLike(value);
  if (!date) return false;
  const diffMs = Date.now() - date.getTime();
  return diffMs > days * 24 * 60 * 60 * 1000;
}

function pickQuoteData(raw) {
  const data = raw?.result?.data || raw?.data || raw || {};
  if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) {
    const row = data[0][0];
    return {
      symbol: row.thscode ?? null,
      price: toNumber(row.latest),
      open: toNumber(row.open),
      high: toNumber(row.high),
      low: toNumber(row.low),
      volume: toNumber(row.volume),
      percentChange: toNumber(row.changeRatio),
      timestamp: row.time ?? row.tradeDate ?? null,
      raw: row,
    };
  }
  return {
    symbol: data.symbol ?? data.Symbol ?? null,
    price: toNumber(data.close ?? data.price ?? data.latestPrice),
    open: toNumber(data.open),
    high: toNumber(data.high),
    low: toNumber(data.low),
    volume: toNumber(data.volume),
    percentChange: toNumber(data.percent_change ?? data.changePercent),
    timestamp: data.datetime ?? data.timestamp ?? data["07. latest trading day"] ?? null,
    raw: data,
  };
}

function pickFundamentalData(raw) {
  const data = raw?.result?.data || raw?.data || raw || {};
  if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) {
    const row = data[0][0];
    return {
      symbol: row.ths_thscode_stock ?? row.thscode ?? null,
      name: row.ths_corp_cn_name_stock ?? null,
      marketCap: null,
      pe: null,
      forwardPe: null,
      pb: null,
      ps: null,
      profitMargin: null,
      revenueGrowthYoy: null,
      earningsGrowthYoy: null,
      week52High: null,
      week52Low: null,
      latestQuarter: null,
      raw: row,
    };
  }
  return {
    symbol: data.Symbol ?? data.symbol ?? null,
    name: data.Name ?? data.name ?? null,
    marketCap: toNumber(data.MarketCapitalization ?? data.marketCap),
    pe: toNumber(data.PERatio ?? data.pe ?? data.TrailingPE),
    forwardPe: toNumber(data.ForwardPE),
    pb: toNumber(data.PriceToBookRatio),
    ps: toNumber(data.PriceToSalesRatioTTM),
    profitMargin: toNumber(data.ProfitMargin),
    revenueGrowthYoy: toNumber(data.QuarterlyRevenueGrowthYOY),
    earningsGrowthYoy: toNumber(data.QuarterlyEarningsGrowthYOY),
    week52High: toNumber(data["52WeekHigh"] ?? data.fifty_two_week?.high),
    week52Low: toNumber(data["52WeekLow"] ?? data.fifty_two_week?.low),
    latestQuarter: data.LatestQuarter ?? null,
    raw: data,
  };
}

function pickTechnicalData(raw) {
  const result = raw?.result || raw || {};
  const data = result?.data || result;
  if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) {
    const rows = data[0];
    const row = rows[rows.length - 1];
    return {
      latestDate: row.time ?? null,
      rsi: null,
      close: toNumber(row.close),
      changeRatio: toNumber(row.changeRatio),
      raw: row,
    };
  }
  if (data?.["Technical Analysis: RSI"]) {
    const entries = Object.entries(data["Technical Analysis: RSI"]);
    if (entries.length > 0) {
      const [date, value] = entries[0];
      return {
        latestDate: date,
        rsi: toNumber(value?.RSI),
        raw: data,
      };
    }
  }
  return {
    latestDate: null,
    rsi: null,
    raw: data,
  };
}

function pickSentimentData(raw) {
  const payload = raw?.result || raw || {};
  const data = payload?.data || payload;
  const content = data?.truncated_content ? extractJSONFromTruncatedContent(data.truncated_content) : data;
  if (Array.isArray(content)) {
    const latest = content[0] || null;
    return {
      itemCount: content.length,
      latestHeadline: latest?.headline ?? null,
      latestTime: latest?.datetime ?? null,
      latestTickerSentiment: null,
      fullContentFileUrl: data?.full_content_file_url ?? null,
      raw: content,
    };
  }
  const feed = content?.feed || [];
  const latest = feed[0] || null;
  return {
    itemCount: toNumber(content?.items) ?? feed.length,
    latestHeadline: latest?.title ?? null,
    latestTime: latest?.time_published ?? null,
    latestTickerSentiment: latest?.ticker_sentiment?.[0]?.ticker_sentiment_label ?? null,
    fullContentFileUrl: data?.full_content_file_url ?? null,
    raw: content,
  };
}

function pickXSentimentData(raw) {
  const payload = raw?.result || raw || {};
  const data = payload?.data ?? payload;
  const content = data?.truncated_content ? extractJSONFromTruncatedContent(data.truncated_content) : data;

  let posts = [];
  if (Array.isArray(content)) posts = content;
  else if (Array.isArray(content?.data)) posts = content.data;
  else if (Array.isArray(content?.posts)) posts = content.posts;
  else if (Array.isArray(content?.results)) posts = content.results;

  const first = posts[0] || null;
  return {
    itemCount: posts.length || toNumber(content?.total) || 0,
    topPostText: first?.text ?? first?.full_text ?? first?.title ?? first?.headline ?? null,
    topPostTime: first?.created_at ?? first?.time ?? first?.datetime ?? null,
    sourceMode: Array.isArray(content) ? "fallback" : "direct",
    fullContentFileUrl: data?.full_content_file_url ?? null,
    raw: content,
  };
}

async function executeWithFallback(candidates, searchId, paramBuilder, options, executionMeta = {}) {
  const attempts = [];
  const maxAttempts = options.maxAttemptsPerPhase || 3;
  for (const tool of candidates.slice(0, maxAttempts)) {
    const params = paramBuilder(tool);
    try {
      const sid = tool?._cachedSearchId || searchId;
      const startedAt = Date.now();
      const result = await executeTool(tool.tool_id, sid, params, options.maxSize, options.timeoutMs);
      const ok = isToolCallSuccessful(result);
      const elapsed = Date.now() - startedAt;
      attempts.push({ toolId: tool.tool_id, ok, result, params, elapsed_ms: elapsed });
      if (options.evolutionState) {
        updateEvolutionOnAttempt(options.evolutionState, {
          ...executionMeta,
          toolId: tool.tool_id,
          elapsedMs: elapsed,
          success: ok,
          searchId: sid,
          newlyLearnedCollector: options.newlyLearnedTools,
        });
      }
      if (ok) {
        return { success: true, selectedTool: tool, attempts };
      }
    } catch (error) {
      attempts.push({ toolId: tool.tool_id, ok: false, error: redactSecrets(error.message), params });
      if (options.evolutionState) {
        updateEvolutionOnAttempt(options.evolutionState, {
          ...executionMeta,
          toolId: tool.tool_id,
          elapsedMs: 0,
          success: false,
          searchId,
          newlyLearnedCollector: options.newlyLearnedTools,
        });
      }
    }
  }
  return { success: false, selectedTool: null, attempts };
}

function summarizeQuality(payload) {
  const warnings = [];
  const quote = payload.quote?.parsed;
  const fundamentals = payload.fundamentals?.parsed;
  const technicals = payload.technicals?.parsed;
  const sentiment = payload.sentiment?.parsed;

  if (!quote?.price) warnings.push("行情缺少最新价格字段");
  if (!fundamentals?.pe && !fundamentals?.marketCap) warnings.push("基本面关键估值字段缺失");
  if (technicals && technicals.rsi == null && technicals.changeRatio == null) warnings.push("技术指标缺少 RSI/趋势字段");
  if (sentiment && !sentiment.itemCount) warnings.push("情绪数据缺少新闻条目");

  if (quote?.timestamp && typeof quote.timestamp === "string" && quote.timestamp.length < 8) {
    warnings.push("行情时间戳格式异常");
  }
  if (isStale(quote?.timestamp, 5)) warnings.push("行情数据可能已过期（超过 5 天）");
  if (isStale(fundamentals?.latestQuarter, 220)) warnings.push("基本面季度数据较旧");

  if (quote?.price != null && fundamentals?.week52High != null && quote.price > fundamentals.week52High * 1.08) {
    warnings.push("行情价格明显高于 52 周高点，可能存在跨源不一致");
  }
  if (quote?.price != null && fundamentals?.week52Low != null && quote.price < fundamentals.week52Low * 0.92) {
    warnings.push("行情价格明显低于 52 周低点，可能存在跨源不一致");
  }

  let confidence = "high";
  if (warnings.length >= 2) confidence = "medium";
  if (warnings.length >= 4) confidence = "low";
  return { confidence, warnings };
}

function formatMarkdown(result) {
  const { symbol, market, mode, data, quality, evolution } = result;
  const q = data.quote?.parsed || {};
  const f = data.fundamentals?.parsed || {};
  const t = data.technicals?.parsed || {};
  const s = data.sentiment?.parsed || {};
  const x = data.x_sentiment?.parsed || {};
  const lines = [];

  lines.push(`# Stock Copilot Pro Report: ${symbol}`);
  lines.push("");
  lines.push("## summary");
  lines.push(`- Market: ${market}`);
  lines.push(`- Mode: ${mode}`);
  lines.push(`- Confidence: ${quality.confidence}`);
  lines.push(`- Latest Price: ${q.price ?? "N/A"}`);
  lines.push(`- Change(%): ${q.percentChange ?? "N/A"}`);
  lines.push("");

  lines.push("## fundamentals");
  lines.push(`- Name: ${f.name ?? "N/A"}`);
  lines.push(`- Market Cap: ${f.marketCap ?? "N/A"}`);
  lines.push(`- PE / Forward PE: ${f.pe ?? "N/A"} / ${f.forwardPe ?? "N/A"}`);
  lines.push(`- Profit Margin: ${f.profitMargin ?? "N/A"}`);
  lines.push(`- Revenue Growth YoY: ${f.revenueGrowthYoy ?? "N/A"}`);
  lines.push(`- 52W Range: ${f.week52Low ?? "N/A"} - ${f.week52High ?? "N/A"}`);
  lines.push("");

  lines.push("## technicals");
  lines.push(`- Latest RSI: ${t.rsi ?? "N/A"} (${t.latestDate ?? "N/A"})`);
  if (t.rsi != null) {
    lines.push(`- RSI View: ${t.rsi > 70 ? "overbought risk" : t.rsi < 30 ? "oversold rebound zone" : "neutral momentum"}`);
  }
  lines.push("");

  lines.push("## sentiment");
  lines.push(`- News Items: ${s.itemCount ?? "N/A"}`);
  lines.push(`- Latest Headline: ${s.latestHeadline ?? "N/A"}`);
  lines.push(`- Latest Ticker Sentiment: ${s.latestTickerSentiment ?? "N/A"}`);
  if (s.fullContentFileUrl) lines.push(`- Full Content URL: ${s.fullContentFileUrl}`);
  lines.push(`- X Posts: ${x.itemCount ?? "N/A"} (${x.sourceMode ?? "N/A"})`);
  lines.push(`- X Top Post: ${x.topPostText ?? "N/A"}`);
  lines.push("");

  lines.push("## risks");
  if (quality.warnings.length === 0) {
    lines.push("- No critical data quality warnings.");
  } else {
    for (const warning of quality.warnings) lines.push(`- ${warning}`);
  }
  lines.push(`- Evolution cached hits: ${evolution?.used_from_cache ?? 0}`);
  lines.push(`- New tools learned: ${evolution?.new_tools_learned?.length ?? 0}`);
  lines.push("- This output is for research only, not investment advice.");
  lines.push("");

  lines.push("## conclusion");
  if (q.percentChange != null && t.rsi != null) {
    const view = q.percentChange > 0 && t.rsi < 70 ? "偏正向，但需持续跟踪事件风险" : "信号存在分歧，建议观望或分批评估";
    lines.push(`- Consolidated view: ${view}`);
  } else {
    lines.push("- Consolidated view: 数据有限，建议补齐后再决策。");
  }

  return lines.join("\n");
}

function capabilitiesForMode(mode) {
  if (mode === "basic") return ["quote", "fundamentals"];
  if (mode === "fundamental") return ["quote", "fundamentals", "sentiment", "x_sentiment"];
  if (mode === "technical") return ["quote", "technicals", "sentiment", "x_sentiment"];
  return ["quote", "fundamentals", "technicals", "sentiment", "x_sentiment"];
}

function historyDateRange(days = 45) {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function capabilityQueries(capability, market) {
  const queries = [CAPABILITY_QUERIES[capability]];
  if (capability === "x_sentiment") {
    queries.push("X Finance domain hot topics API");
  }
  if (["CN", "HK"].includes(market) && CN_HK_QUERY_HINTS[capability]) {
    queries.push(CN_HK_QUERY_HINTS[capability]);
  }
  return queries;
}

async function searchAndRankByCapability(capability, options) {
  const all = [];
  let chosenSearchId = null;
  for (const query of capabilityQueries(capability, options.market)) {
    const res = await searchTools(query, options.limit, options.timeoutMs);
    chosenSearchId = chosenSearchId || res.search_id;
    for (const tool of res.results || []) {
      all.push(tool);
    }
  }
  const bestById = new Map();
  for (const tool of all) {
    const key = tool.tool_id;
    if (!bestById.has(key) || scoreTool(tool) > scoreTool(bestById.get(key))) {
      bestById.set(key, tool);
    }
  }
  let ranked = rankTools([...bestById.values()]);
  if (capability === "x_sentiment") {
    ranked = ranked.filter((tool) => {
      const id = tool?.tool_id || "";
      return X_SENTIMENT_TOOL_PREFIXES.some((prefix) => id.startsWith(prefix));
    });
    ranked = ranked.sort((a, b) => {
      const aId = a.tool_id || "";
      const bId = b.tool_id || "";
      const aPrimary = aId.startsWith("x_developer.2.tweets.search.recent") ? 1 : 0;
      const bPrimary = bId.startsWith("x_developer.2.tweets.search.recent") ? 1 : 0;
      if (aPrimary !== bPrimary) return bPrimary - aPrimary;
      return (b._score || 0) - (a._score || 0);
    });
  }
  return { ranked, searchId: chosenSearchId };
}

async function runSingleAnalysis(symbol, options) {
  const candidates = normalizeSymbols(symbol, options.market);
  let selectedSymbol = candidates[0];
  const output = { quote: null, fundamentals: null, technicals: null, sentiment: null, x_sentiment: null };
  const evolutionSummary = {
    used_from_cache: 0,
    new_tools_learned: [],
    queue_top3: {},
  };

  const activeCapabilities = capabilitiesForMode(options.mode);

  for (const candidate of candidates) {
    selectedSymbol = candidate;
    let foundAny = false;
    for (const capability of activeCapabilities) {
      const evolvedCandidates = options.evolutionState ? getEvolutionCandidates(options.evolutionState, capability, options.market) : [];
      evolutionSummary.queue_top3[capability] = evolvedCandidates.slice(0, 3).map((x) => x.tool_id);
      if (evolvedCandidates.length === 0) {
        evolutionSummary.queue_top3[capability] = [];
      }
      let ranked = [];
      let searchId = null;
      if (evolvedCandidates.length === 0) {
        const search = await searchAndRankByCapability(capability, options);
        ranked = search.ranked;
        searchId = search.searchId;
      }
      if (ranked.length === 0 && evolvedCandidates.length === 0) {
        output[capability] = { success: false, reason: "no tools found", attempts: [] };
        continue;
      }
      foundAny = true;
      let executed = null;
      let cachedAttempt = null;
      if (evolvedCandidates.length > 0) {
        cachedAttempt = await executeWithFallback(
          evolvedCandidates,
          null,
          (tool) => buildParamsForCapability(capability, candidate, options.mode, tool, options.market),
          options,
          { capability, market: options.market, symbol: candidate },
        );
        if (cachedAttempt.success) {
          evolutionSummary.used_from_cache += 1;
          executed = { ...cachedAttempt, fromEvolutionQueue: true };
        }
      }
      if (!executed) {
        if (ranked.length === 0) {
          const search = await searchAndRankByCapability(capability, options);
          ranked = search.ranked;
          searchId = search.searchId;
        }
        const freshAttempt = await executeWithFallback(
          ranked,
          searchId,
          (tool) => buildParamsForCapability(capability, candidate, options.mode, tool, options.market),
          options,
          { capability, market: options.market, symbol: candidate },
        );
        executed = { ...freshAttempt, fromEvolutionQueue: false, previousCacheAttempt: cachedAttempt };
      }
      output[capability] = {
        ...executed,
        searchId,
        rankedTop: ranked.slice(0, 3).map((t) => t.tool_id),
      };
      if (executed.success) {
        output[capability].parsed = parseCapability(capability, executed.attempts.find((x) => x.ok)?.result);
      }
    }
    if (foundAny) break;
  }

  const quality = summarizeQuality(output);
  evolutionSummary.new_tools_learned = [...new Set(options.newlyLearnedTools || [])];
  return {
    symbol: selectedSymbol,
    market: options.market,
    mode: options.mode,
    data: output,
    quality,
    evolution: evolutionSummary,
  };
}

function parseCapability(capability, raw) {
  if (capability === "quote") return pickQuoteData(raw);
  if (capability === "fundamentals") return pickFundamentalData(raw);
  if (capability === "technicals") return pickTechnicalData(raw);
  if (capability === "sentiment") return pickSentimentData(raw);
  if (capability === "x_sentiment") return pickXSentimentData(raw);
  return raw;
}

function buildParamsForCapability(capability, symbol, mode, tool, market) {
  const toolId = tool?.tool_id || "";
  const thsCode = toThsCode(symbol, market);

  if (toolId.startsWith("ths_ifind.real_time_quotation")) {
    return { codes: thsCode };
  }
  if (toolId.startsWith("ths_ifind.company_basics")) {
    return { codes: thsCode };
  }
  if (toolId.startsWith("ths_ifind.history_quotation")) {
    const range = historyDateRange(45);
    return { codes: thsCode, startdate: range.start, enddate: range.end, interval: "D" };
  }
  if (toolId.startsWith("finnhub.news")) {
    return { category: "general" };
  }
  if (toolId.startsWith("x_developer.2.tweets.search.recent")) {
    const base = String(symbol || "").toUpperCase().replace(/\.(US|HK|SH|SZ|SS)$/, "");
    return {
      query: `(${base} OR $${base}) lang:en -is:retweet`,
      max_results: 20,
      sort_order: "relevancy",
    };
  }
  if (toolId.startsWith("qveris_social.x_domain_new_posts")) {
    return { domains: ["Finance"], limit: 20 };
  }
  if (toolId.startsWith("qveris_social.x_domain_hot_topics")) {
    return { domains: ["Finance"], limit: 20, min_engagement: 30 };
  }
  if (toolId.startsWith("qveris_social.x_domain_hot_events")) {
    return { domains: ["Finance"] };
  }

  if (capability === "quote") {
    return { symbol };
  }
  if (capability === "fundamentals") {
    return { function: "OVERVIEW", symbol };
  }
  if (capability === "technicals") {
    const interval = mode === "technical" ? "daily" : "daily";
    return { function: "RSI", symbol, interval, series_type: "close", time_period: 14 };
  }
  if (capability === "sentiment") {
    return { function: "NEWS_SENTIMENT", tickers: symbol, sort: "LATEST", limit: 10 };
  }
  if (capability === "x_sentiment") {
    const base = String(symbol || "").toUpperCase().replace(/\.(US|HK|SH|SZ|SS)$/, "");
    return {
      query: `(${base} OR $${base}) lang:en -is:retweet`,
      max_results: 20,
      sort_order: "relevancy",
    };
  }
  return { symbol };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) return { help: true };
  const command = args[0];
  const parsed = {
    command,
    market: "GLOBAL",
    mode: "comprehensive",
    format: "markdown",
    limit: 10,
    maxSize: 30000,
    timeoutMs: 25000,
    maxAttemptsPerPhase: 3,
  };

  for (let i = 1; i < args.length; i++) {
    const key = args[i];
    if (key === "--symbol" && i + 1 < args.length) parsed.symbol = args[++i];
    else if (key === "--symbols" && i + 1 < args.length) parsed.symbols = args[++i];
    else if (key === "--market" && i + 1 < args.length) parsed.market = args[++i].toUpperCase();
    else if (key === "--mode" && i + 1 < args.length) parsed.mode = args[++i];
    else if (key === "--format" && i + 1 < args.length) parsed.format = args[++i];
    else if (key === "--limit" && i + 1 < args.length) parsed.limit = Number(args[++i]) || 10;
    else if (key === "--max-size" && i + 1 < args.length) parsed.maxSize = Number(args[++i]) || 30000;
    else if (key === "--timeout" && i + 1 < args.length) parsed.timeoutMs = (Number(args[++i]) || 25) * 1000;
  }
  return parsed;
}

function printHelp() {
  console.log(`Stock Copilot Pro

Usage:
  node scripts/stock_copilot_pro.mjs analyze --symbol AAPL [options]
  node scripts/stock_copilot_pro.mjs compare --symbols AAPL,MSFT [options]

Options:
  --market US|HK|CN|GLOBAL   default GLOBAL
  --mode basic|fundamental|technical|comprehensive   default comprehensive
  --format markdown|json     default markdown
  --limit N                  search results per capability (default 10)
  --max-size N               max response size bytes (default 30000)
  --timeout N                timeout seconds (default 25)
  --help                     show this message
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  args.evolutionState = await loadEvolutionState();
  args.newlyLearnedTools = [];

  if (args.command === "analyze") {
    if (!args.symbol) throw new Error("analyze requires --symbol");
    const result = await runSingleAnalysis(args.symbol, args);
    result.evolution.new_tools_learned = [...new Set(args.newlyLearnedTools)];
    await saveEvolutionState(args.evolutionState);
    if (args.format === "json") console.log(JSON.stringify(result, null, 2));
    else console.log(formatMarkdown(result));
    return;
  }

  if (args.command === "compare") {
    if (!args.symbols) throw new Error("compare requires --symbols");
    const symbols = args.symbols.split(",").map((s) => s.trim()).filter(Boolean);
    const reports = [];
    for (const s of symbols) {
      reports.push(await runSingleAnalysis(s, args));
    }
    await saveEvolutionState(args.evolutionState);
    if (args.format === "json") {
      console.log(
        JSON.stringify(
          {
            mode: "compare",
            market: args.market,
            reports,
            evolution: { new_tools_learned: [...new Set(args.newlyLearnedTools)] },
          },
          null,
          2,
        ),
      );
    } else {
      for (const report of reports) {
        report.evolution.new_tools_learned = [...new Set(args.newlyLearnedTools)];
        console.log(formatMarkdown(report));
        console.log("\n---\n");
      }
    }
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((err) => {
  if (err.name === "AbortError") {
    console.error("Error: request timeout");
  } else {
    console.error(`Error: ${redactSecrets(err.message)}`);
  }
  process.exit(1);
});

