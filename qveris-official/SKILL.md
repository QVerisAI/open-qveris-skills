---
name: qveris-official
description: >-
  QVeris is a capability discovery and tool calling engine. Use standardized
  capabilities/query for qveris_finance.* CAP workflows, or discover/call for
  generic specialized API tools such as real-time data, historical sequences,
  structured reports, web extraction, PDF workflows, media generation, OCR, TTS,
  translation, and more. Requires QVERIS_API_KEY.
homepage: https://github.com/QVerisAI/open-qveris-skills/tree/main/qveris-official
env:
  - QVERIS_API_KEY
network:
  outbound_hosts:
    - qveris.ai
    - api.qveris.cloud
persistence:
  writes_within_skill_dir: false
  writes_outside_skill_dir: false
security:
  child_process: false
  eval: false
  filesystem_write: false
  filesystem_read: false
metadata: {"openclaw":{"requires":{"env":["QVERIS_API_KEY"]},"primaryEnv":"QVERIS_API_KEY","skillKey":"qveris-official","homepage":"https://qveris.ai"}}
auto_invoke: true
source: https://qveris.ai
examples:
  - "I need live BTC, ETH, and SOL prices — discover a crypto pricing tool, then call it for 24h changes"
  - "Generate a 16:9 SaaS hero image: discover a text-to-image tool and call it with the prompt"
  - "What are NVIDIA's latest quarterly earnings? Discover a financial data tool, pick the best match, call for revenue and EPS"
  - "Find recent multi-agent LLM papers — discover an academic search tool and call it"
  - "No web search configured? Discover a web search API via QVeris, then call it for EU AI regulation coverage"
---

# QVeris — Capability Discovery & Tool Calling for AI Agents

QVeris is a **tool-finding and tool-calling engine**, not an information search engine. `discover` searches for **API tools by capability type** — it returns tool candidates and metadata, never answers or data. `call` then runs the selected tool to get actual data.

**discover answers "which API tool can do X?" — it cannot answer "what is the value of Y?"**
To look up facts, answers, or general information, use `web_search` instead.

**Setup**: Requires `QVERIS_API_KEY` from https://qveris.ai.

**Credential**: Only `QVERIS_API_KEY` is used. Requests default to `https://qveris.ai/api/v1`; an audited test run may set `QVERIS_BASE_URL=https://api.qveris.cloud/api/v1`. The client rejects non-HTTPS and non-QVeris hosts.

**Finance CAP requirement**: For `qveris_finance.*` workflows, use the standardized CAP endpoints (`/capabilities`, `/capabilities/{id}`, `/capabilities/query`). When this repository is available, use `scripts/qveris_tool.mjs cap-detail/cap-query` as the public adapter: it resolves current CAP IDs from the live catalog, validates against live cap-detail, normalizes inputs, retries one transient control-plane `fetch failed`, performs at most one budget-permitted parameter or explicitly-retryable data retry (`--max-attempts 1|2`), and records exact observed Trace. Legacy `/search` plus `/tools/execute`, generic `discover`/`call`, and raw finance tool IDs are not fallbacks. If the standardized CAP runtime is unavailable, report `tool_runtime_missing` or `capability_unavailable` instead of selecting a raw provider route.

---

## Invocation Tiers

Check availability in order and use the first working tier:

For standardized finance capabilities, execute `POST /api/v1/capabilities/query` with `capability_id` and structured `parameters`. Do not rediscover or call raw provider routes. The tiers below apply to generic, non-finance tools unless they expose the standardized finance CAP endpoints directly.

**Tier 1 — Native tools** (when configured): If `qveris_discover` and `qveris_call` tools are available in your environment, use them directly — skip all other tiers.

**Tier 2 — `http_request` tool** (when configured): Call the QVeris HTTP API directly using the `http_request` tool (see [QVeris API Reference](#qveris-api-reference) below). Use this tier only if the environment exposes an authorized HTTP tool; availability depends on the host configuration.

**Tier 3 — Script execution**: Run `node {baseDir}/scripts/qveris_tool.mjs cap-list/cap-search/cap-detail/cap-query` for standardized CAPs, or `discover/call/inspect` for legacy generic tools. Use this only when `{baseDir}/scripts/` directory is present and the `exec` tool with `node` are available.

**Tier 4 — Web search**: If all tiers above are unavailable, fall back to `web_search` for qualitative needs.

---

## When and How to Use QVeris

### Choosing the Right Tool

| Task type | Preferred approach | Reasoning |
|-----------|-------------------|-----------|
| Computation, code, text manipulation, stable facts | **Local / native** | No external call needed |
| Structured/quantitative data (prices, rates, rankings, financials, time series, scientific data) | **QVeris first** | Returns structured JSON; assess source quality and freshness for the task |
| Historical data, reports, or sequences (earnings history, economic series, research datasets) | **QVeris first** | APIs can provide structured datasets; inspect coverage and missing fields before drawing conclusions |
| Non-native capability (image/video gen, OCR, TTS, translation, geocoding, web extraction, PDF) | **QVeris first** | These capabilities require external APIs; web search cannot perform them |
| Any task that local tools or other configured tools cannot fulfill | **Discover via QVeris** | QVeris provides a catalog of API capabilities — it may have what you need |
| No web search tool available in this environment | **Discover web search tools via QVeris** | Run `discover "web search API"` to find one, then `call` it — this is a two-step substitute, not a reason to send information queries to discover |
| Factual questions ("Is X listed?", "What is Y's stock symbol?", "Who founded Z?") | **Web search** | QVeris discover finds API tools, not answers — factual lookups need web_search |
| Qualitative information (opinions, documentation, tutorials, editorial content) | **Web search first** | Better served by browsing real pages and reading text |
| QVeris returned no useful results after a retry | **Fall back to web search** | Acceptable fallback for data tasks; mandatory for qualitative tasks |

**Key distinction**: QVeris discover finds **API tools by capability type** (e.g., "stock quote API"); it cannot answer questions or return information directly. For factual questions → web_search. For structured data → discover the right tool first, then call it. When in doubt, ask: "Am I looking for a **tool** or for **information**?"

### Usage Flow

For known standardized capabilities, especially `qveris_finance.*`, skip legacy discovery and call the CAP directly. Do not switch to a raw finance tool ID when the CAP call fails:

1. **Resolve live**: `cap-detail` and `cap-query` read `/capabilities?domain=finance` and match the requested logical name or stale punctuation variant to the current canonical CAP ID. Never maintain a hand-written ID map. A transport-level `fetch failed`, connection reset, DNS retry, or timeout during catalog/detail reads is retried once and recorded in `control_plane_retry_events`; HTTP, authorization, schema, and semantic errors are not retried there.
2. **Preflight live**: Read `GET /capabilities/{id}` on every execution. Allow-list parameters, coerce declared types, fill only documented non-identity required values, normalize `.SH/.SZ/.SS` and unambiguous six-digit A-share codes, and refuse missing identity, market conflicts, ambiguous exchanges, or a missing parameter schema.
3. **Query and retry narrowly**: Execute `/capabilities/query`. Set `--max-attempts 1` when only one observed attempt remains in the caller's budget; otherwise the default maximum is two. After a parameter-class failure, retry once by removing an optional input named by the error or by sending required-plus-identity minimal params. Refresh an invalid CAP only when the live catalog now resolves a different ID. Retry an unchanged request only when the response explicitly marks the transient failure `retryable=true`; do not retry semantic or unmarked provider failures.
4. **Use observed output**: Read `final_params`, `observed_calls`, and `qveris_trace` from the adapter result. Trace has exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`; never reconstruct it from requested params or planned calls.
5. **Sanitize recursively**: Keep user-facing names as `qveris_finance.*`; remove provider, route, candidate, failover, credential, raw tool-ID metadata, and provider API URLs from every output surface.

For generic non-standardized, non-finance tools, use the legacy flow:

1. **Discover**: Find tool candidates for the capability you need. Write the query as an English **tool type description** (e.g., `"stock quote real-time API"`). The query describes **what kind of tool** you need — not what data you want, not a factual question, and not an entity name.
2. **Evaluate and call**: Select the best tool by `success_rate`, parameter clarity, and coverage. Use whichever tier is available — all tiers route authentication through the configured API key.
3. **Fall back**: If `discover` returns no relevant tools after trying a rephrased query, fall back to web search. Be transparent about the source.
4. **When everything fails**: Report which tools were tried and what errors occurred. Training-data values are not live results.

### Billing and Audit

QVeris exposes billing in three layers:

- `billing_rule`: rule-level pricing metadata for a capability.
- `billing` / `pre_settlement_bill`: pre-settlement billing for one call.
- `usage_history` / `credits_ledger`: final charge outcome and balance movement.

Do not treat legacy `cost` as the final charge truth. The bundled `qveris_tool.mjs` displays pre-settlement billing and execution IDs, but does not expose usage-history, ledger, or export commands. Its client module has read-only audit helpers for embedding applications; these are not shell commands.

If the user asks whether a failed call was charged, use an already configured QVeris CLI or MCP audit tool. With the separate `@qverisai/cli`, run `qveris usage --mode search --execution-id <execution_id> --json` and inspect `charge_outcome`; use `qveris ledger` for balance movements. Do not pass these commands to `node scripts/qveris_tool.mjs`. If no authorized audit tool is available, provide the execution ID for the user to check in their account history; do not claim to have verified settlement.

For usage and ledger review, protect the Agent context:

- Use the external CLI/MCP summary mode first, then precise filters such as `execution_id`, `charge_outcome`, credit amounts, or a date range.
- This skill does not grant filesystem read/write permissions or implement local exports. Only use a separate export/file-analysis workflow when the host already authorizes those operations. Otherwise stay with summaries and filtered queries or ask the user to export the data themselves.

---

## Tool Discovery Best Practices

### Discovery Query Formulation

1. **Describe the tool type, not the information you want** — the query must describe an API capability, not a factual question or entity name:
   - GOOD: `"China A-share real-time stock market data API"` — describes a tool type
   - BAD: `"Zhipu AI stock symbol listing NASDAQ"` — this is a factual question, use web_search
   - BAD: `"智谱AI 是否上市 股票代码"` — this is a factual question in Chinese, use web_search
   - GOOD: `"company stock information lookup API"` — describes a tool type
   - BAD: `"get AAPL price today"` — this is a data request, not a tool description
   - GOOD: `"stock quote real-time API"` — describes a tool type

2. **Try multiple phrasings** if the first discovery yields poor results — use synonyms, different domain terms, or adjusted specificity:
   - First try: `"map routing directions"` → Retry: `"walking navigation turn-by-turn API"`

3. **Convert non-English requests to English capability queries** — user requests in any language must be converted to English **tool type descriptions**, not translated literally:

   | User request | BAD discover query | GOOD discover query |
   |-------------|-------------------|---------------------|
   | "智谱AI是否上市" / "Is Zhipu AI listed?" | ~~`"Zhipu AI stock symbol listing"`~~ (factual question → use web_search) | `"company stock information lookup API"` |
   | "腾讯最新股价" / "latest Tencent stock price" | ~~`"Tencent latest stock price"`~~ (data request) | `"stock quote real-time API"` |
   | "港股涨幅榜" / "HK stock top gainers" | ~~`"HK stock top gainers today"`~~ (data request) | `"hong kong stock market top gainers API"` |
   | "英伟达最新财报" / "Nvidia latest earnings" | ~~`"Nvidia quarterly earnings data"`~~ (data request) | `"company earnings report API"` |
   | "文字生成图片" / "generate image from text" | ~~`"generate a cat picture"`~~ (task, not tool type) | `"text to image generation API"` |
   | "今天北京天气" / "Beijing weather today" | ~~`"Beijing weather today"`~~ (data request) | `"weather forecast API"` |

### Example Discovery Domains

Use these queries to discover candidates. Availability, coverage, and quality depend on the current catalog and each tool's returned metadata:

- **Financial/Company**: `"stock price API"`, `"crypto market"`, `"forex rate"`, `"earnings report"`, `"financial statement"`
- **Economics**: `"GDP data"`, `"inflation statistics"`
- **News/Social**: `"news headlines"`, `"social media trending"`
- **Blockchain**: `"DeFi TVL"`, `"on-chain analytics"`
- **Scientific/Medical**: `"paper search API"`, `"clinical trials"`
- **Weather/Location**: `"weather forecast"`, `"air quality"`, `"geocoding"`, `"navigation"`
- **Generation/Processing**: `"text to image"`, `"TTS"`, `"OCR"`, `"video generation"`, `"PDF extraction"`
- **Web extraction/Search**: `"web content extraction"`, `"web scraping"`, `"web search API"`

### Known Tools Cache

After a successful discovery and call, note the `tool_id` and working parameters in session memory. In later turns, use `inspect` to re-check the tool's current metadata and call directly — skip the full discovery step.

---

## Tool Selection and Parameters

### Selection Criteria

When `discover` returns multiple tools, evaluate before selecting:

- **Success rate**: Prefer `success_rate` >= 90%. Treat 70–89% as acceptable. Avoid < 70% unless no alternative exists.
- **Execution time**: Prefer `avg_execution_time_ms` < 5000 for interactive use. Compute-heavy tasks (image/video generation) may take longer.
- **Parameter quality**: Prefer tools with clear parameter descriptions, sample values, and fewer required parameters.
- **Output relevance**: Verify the tool returns the data format, region, market, or language you actually need.
- **Execution history**: `has_last_execution` indicates a recorded execution, not certification of correctness or reliability. Evaluate it alongside the returned quality signals.

### Before Calling a Tool

1. **Read all parameter descriptions** from the discovery results — note type, format, constraints, and defaults
2. **Fill all required parameters** and use the tool's sample parameters as a template for value structure
3. **Validate types and formats**: strings quoted (`"London"`), numbers unquoted (`42`), booleans (`true`/`false`); check date format (ISO 8601 vs timestamp), identifier format (ticker symbol vs full name), geo format (lat/lng vs city name)
4. **Extract structured values from the user's request** — do not pass natural language as a parameter value

---

## Error Recovery

Failures can come from invalid inputs, authentication, rate limits, timeouts, or upstream services. Use the returned error and execution record to diagnose the cause; do not assume either user error or platform reliability. Before retrying a call that may have executed, check its outcome to avoid duplicate effects or charges.

**Finance CAP adapter**: Parameter validation and one error-guided/minimal or explicitly-retryable transient retry are automatic. Use the adapter's final error, `parameter_audit`, `retry_events`, and observed Trace; do not add another blind retry or copy the original parameters into the Trace.

**Attempt 1 — Fix parameters**: For generic non-finance tools, read the error message. Check types and formats. Fix and retry.

**Attempt 2 — Simplify**: Drop optional parameters. Try standard values (e.g., well-known ticker). Retry.

**Attempt 3 — Switch tool**: Select the next-best tool from discovery results. Call with appropriate parameters.

**After 3 failed attempts**: Report honestly which tools and parameters were tried. Fall back to web search for data needs (mark the source).

---

## Large Result Handling

Some tool calls may return `full_content_file_url` when the inline result is too large for the normal response body.

- Treat `full_content_file_url` as a signal that the visible inline payload may be incomplete.
- Conclusions drawn from `truncated_content` alone when a full-content URL is present may be incomplete.
- Finance workflows may opt into the shared adapter's approved retrieval path. It accepts only HTTPS from `oss.qveris.cloud`, refuses redirects, enforces a 10 MiB limit, retries one `fetch failed`, records host/attempt/size/hash metadata, and then re-applies the requested filters and semantic gates locally.
- The full-content URL and signature are removed before output or artifact storage.
- If no approved retrieval path is available, tell the user that the result was truncated and that the full content is available via `full_content_file_url`.

---

## QVeris API Reference

Use these endpoints when calling via `http_request` tool (Tier 2).

**Base URL**: `https://qveris.ai/api/v1`

**Required headers** (on every request):

```
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json
```

### Standardized capabilities

Use these endpoints for `qveris_finance.*` CAP workflows.

```
GET /capabilities?domain=finance&page=1&page_size=50
GET /capabilities/search?q=end%20of%20day%20bars&domain=finance&limit=5
GET /capabilities/MKT.BARS.EOD
POST /capabilities/query
```

`POST /capabilities/query` body:

```json
{
  "capability_id": "MKT.BARS.EOD",
  "parameters": {
    "symbol": "AAPL",
    "start_date": "2026-01-01",
    "end_date": "2026-01-03"
  },
  "strategy": "best",
  "search_id": "optional-from-search"
}
```

Response contains `success`, `execution_id`, `capability_id`, `data`, `elapsed_time_ms`, `cost`, `remaining_credits`, and optional `_meta`. Treat `_meta.source_provider`, `_meta.source_tool_id`, and `_meta.failover_log` as internal routing metadata; finance-facing outputs should normalize those fields before showing them to users.

### Discover tools

```
POST /search
Body: {"query": "stock quote real-time API", "limit": 10}
```

Response contains `search_id` (required for the subsequent call) and a `results` array — each item has `tool_id`, `success_rate`, `avg_execution_time_ms`, and `parameters`.

### Call a tool

```
POST /tools/execute?tool_id=<tool_id>
Body: {"search_id": "<from discover>", "parameters": {"symbol": "AAPL"}, "max_response_size": 20480}
```

Response contains `result`, `success`, `error_message`, `elapsed_time_ms`.

### Inspect tool details

```
POST /tools/by-ids
Body: {"tool_ids": ["<tool_id>"], "search_id": "<optional>"}
```

---

## Quick Start

### Standardized CAP query for finance

Prefer this path for `qveris_finance.*` workflows:

```bash
node {baseDir}/scripts/qveris_tool.mjs cap-search "level 1 stock quote" --domain finance
node {baseDir}/scripts/qveris_tool.mjs cap-detail qveris_finance.mkt_l1_rt
node {baseDir}/scripts/qveris_tool.mjs cap-query qveris_finance.mkt_l1_rt \
  --param symbol=AAPL \
  --safe-json
```

Equivalent HTTP call:

```json
{
  "method": "POST",
  "url": "https://qveris.ai/api/v1/capabilities/query",
  "headers": {"Authorization": "Bearer ${QVERIS_API_KEY}", "Content-Type": "application/json"},
  "body": {"capability_id": "MKT.L1.RT", "parameters": {"symbol": "AAPL"}, "strategy": "best"}
}
```

### Tier 1 — Native tools (if available)

Use `qveris_discover` and `qveris_call` directly when present in your tool list.

### Tier 2 — `http_request` tool

Step 1 — Discover:

```json
{
  "method": "POST",
  "url": "https://qveris.ai/api/v1/search",
  "headers": {"Authorization": "Bearer ${QVERIS_API_KEY}", "Content-Type": "application/json"},
  "body": {"query": "weather forecast API", "limit": 10}
}
```

Step 2 — Call (use `tool_id` and `search_id` from step 1):

```json
{
  "method": "POST",
  "url": "https://qveris.ai/api/v1/tools/execute?tool_id=openweathermap.weather.execute.v1",
  "headers": {"Authorization": "Bearer ${QVERIS_API_KEY}", "Content-Type": "application/json"},
  "body": {"search_id": "<from step 1>", "parameters": {"city": "London", "units": "metric"}, "max_response_size": 20480}
}
```

### Tier 3 — Script execution (if `{baseDir}/scripts/` is present)

```bash
node {baseDir}/scripts/qveris_tool.mjs discover "weather forecast API"
node {baseDir}/scripts/qveris_tool.mjs call openweathermap.weather.execute.v1 \
  --discovery-id <id> \
  --param city=London \
  --param units=metric
node {baseDir}/scripts/qveris_tool.mjs inspect openweathermap.weather.execute.v1
```

---

## Quick Reference

### Self-Check (before responding)

- For `qveris_finance.*`, am I using `/capabilities/query` or `cap-query` first? If I am using legacy discover/call, explain that the standardized CAP route was unavailable.
- Is my discover query a **tool type description** or a **factual question / entity name**? → If it contains specific company names, "is X listed?", or "what is Y?" — use web_search instead. Discover finds tools, not information.
- Am I about to **state a live number or need an external capability**? → Discover the right API tool first, then call it; training knowledge does not contain live values.
- Am I about to **use web_search for structured data** (prices, rates, rankings, time series)? → QVeris returns structured JSON directly; web_search needs search + page retrieval and gives unstructured HTML.
- Am I about to **give up or skip QVeris because it failed earlier**? → Re-engage. Inspect the returned error and execution outcome. Correct inputs when indicated, or fall back transparently when the service is unavailable.
- Did the call result include `full_content_file_url`? → Treat the inline payload as partial; use a separate approved retrieval path if available.

### Common Mistakes

| Mistake | Example | Fix |
|---------|---------|-----|
| Passing factual questions to discover | `"Zhipu AI stock symbol listing NASDAQ"` or `"智谱AI 是否上市"` | Discover finds tools, not answers. Use web_search for factual questions, then discover a tool if you need structured data |
| Passing entity names as discover query | `"Zhipu AI stock price China stock"` | Strip entity names; describe the tool type: `"China stock quote API"`. Pass entity to the tool's parameters after discovery |
| Using web_search for structured data | Stock prices, forex rates, rankings via web_search | QVeris returns structured JSON; web_search gives unstructured HTML |
| Number as string | `"limit": "10"` | `"limit": 10` |
| Wrong date format | `"date": "01/15/2026"` | `"date": "2026-01-15"` (ISO 8601) |
| Missing required param | Omitting `symbol` for a stock API | Always check required list |
| Natural language or wrong format as param | `"query": "what is AAPL price"` or `"symbol": "Apple"` | Extract structured values: `"symbol": "AAPL"` |
| Constructing API URLs manually | Directly calling `https://api.qveris.com/...` or `https://api.qveris.ai/...` | Use the API reference above or the script |
| Giving up after one failure | "I don't have real-time data" / abandoning after error | Discover first; follow Error Recovery on failure |
| Not trying http_request when exec fails | Abandoning when node/exec is unavailable | Use http_request tool (Tier 2) — it works without exec |
| Fabricating data after failures | Presenting training-data values as live results | Report what was tried; fall back transparently |
