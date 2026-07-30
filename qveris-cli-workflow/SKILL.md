---
name: qveris-cli-workflow
description: >-
  QVeris CLI (`qveris`) is a zero-dependency command-line client for the QVeris
  capability discovery and tool calling engine. Use `qveris discover` to find
  specialized API tools — real-time data, historical sequences, structured
  reports, web extraction, PDF workflows, media generation, OCR, TTS,
  translation, and more. Then use `qveris inspect` to review parameters and
  `qveris call` to execute. Discovery queries must be English API capability
  descriptions. Requires an installed `qveris` binary (or `npx @qverisai/cli`)
  and a QVERIS_API_KEY.
homepage: https://github.com/QVerisAI/QVerisAI/tree/main/packages/cli
env:
  - QVERIS_API_KEY
  - QVERIS_REGION
  - QVERIS_BASE_URL
network:
  outbound_hosts:
    - qveris.ai
    - qveris.cn
metadata: {"openclaw":{"requires":{"env":["QVERIS_API_KEY"]},"primaryEnv":"QVERIS_API_KEY","skillKey":"qveris-cli-workflow","homepage":"https://qveris.ai"}}
auto_invoke: true
source: https://qveris.ai
examples:
  - "Live BTC/ETH/SOL prices: `qveris discover \"crypto pricing API\" --json` → `qveris inspect 1` → `qveris call 1 --params '{\"symbols\":[\"BTC\",\"ETH\",\"SOL\"]}'`"
  - "Generate a 16:9 SaaS hero image: discover a text-to-image API, inspect its params, then call it with the prompt"
  - "NVIDIA latest earnings: discover a company earnings report API, inspect, call with `{\"ticker\":\"NVDA\"}` for revenue and EPS"
  - "Recent multi-agent LLM papers: discover an academic paper search API, call with a keyword + date range filter"
  - "No web search configured? Discover a `web search API` via QVeris, then call it"
---

# QVeris CLI — Capability Discovery & Tool Calling from the Terminal

The `qveris` CLI is a **tool-finding and tool-calling command-line client**, not an information search engine.

- `qveris discover` searches for **API tools by capability type** — it returns tool candidates and metadata, never answers or data.
- `qveris call` then runs the selected tool to get actual data.

> **`discover` answers "which API tool can do X?" — it cannot answer "what is the value of Y?"**
> For factual questions or qualitative information, use `web_search` instead.

**Binary**: `qveris` (installed via `npm i -g @qverisai/cli`, the curl one-liner, or runnable via `npx @qverisai/cli`).

**Setup**: Requires `QVERIS_API_KEY` from https://qveris.ai. The key prefix selects the region automatically (`sk-…` → global `https://qveris.ai/api/v1`; `sk-cn-…` → China `https://qveris.cn/api/v1`). All requests are HTTPS.

For install steps, see [`instruct.md`](./instruct.md). For full command/flag/exit-code reference, see [`reference/commands.md`](./reference/commands.md), [`reference/parameters.md`](./reference/parameters.md), and [`reference/examples.md`](./reference/examples.md).

---

## Preflight & Invocation Tiers

**Always probe the environment first — never install the CLI when it is already available.** Run the probes top-to-bottom, stop at the first hit, and cache the result for the rest of the session. Treat **install** and **auth** as two independent gates.

| Tier | Probe (stop at first exit-0) | On success, do this |
|---|---|---|
| **1. Installed binary** | `qveris --version` | Call `qveris discover/inspect/call` directly. **Skip install.** |
| **2. `npx` fallback** | `npx --yes @qverisai/cli --version` | Prefix every command with `npx @qverisai/cli …`. **Do not install globally** unless the user asks. |
| **3. Native / HTTP handoff** | A tool named `qveris_discover` / `qveris_call` is listed in the current tool catalog, **or** `http_request` is available but shell `exec` is not | Hand off to the `qveris-official` skill (it owns those tiers). Do not reimplement the HTTP protocol here. |
| **4. Nothing works** | All probes fail | **Ask the user for consent** before installing (see prompt below). If declined, fall back to `web_search` for qualitative needs. |

**Auth gate (independent of the tier above)**: After picking a tier, run `qveris whoami`. Exit `0` → ready; exit `77` / `78` → set `QVERIS_API_KEY` or run `qveris login`. Having the binary does not imply the key is set.

**Consent prompt (use when Tier 4 is reached — do not install silently)**:

> I don't see the `qveris` CLI on PATH and `npx @qverisai/cli` didn't resolve either. To answer this I need the CLI. OK to install it?
>  - `npm install -g @qverisai/cli` (global, persistent), or
>  - `curl -fsSL https://qveris.ai/cli/install | bash` (one-liner), or
>  - keep going with `npx @qverisai/cli` once network allows.

Only proceed once the user consents, then follow [`instruct.md`](./instruct.md).

---

## When to Use QVeris (vs. Local / Web Search)

| Task type | Preferred approach |
|---|---|
| Computation, code, text manipulation, stable facts | **Local / native** (no external call needed) |
| Structured/quantitative data (prices, rates, rankings, financials, time series) | **QVeris CLI first** — returns structured JSON |
| Historical data, reports, or sequences (earnings history, economic series, datasets) | **QVeris CLI first** — complete structured datasets |
| Non-native capability (image/video gen, OCR, TTS, translation, geocoding, PDF) | **QVeris CLI first** — web search cannot perform these |
| No web search tool available in this environment | `qveris discover "web search API"`, then `qveris call` it |
| Factual questions ("Is X listed?", "What is Y's stock symbol?", "Who founded Z?") | **Web search** — `discover` finds tools, not answers |
| Qualitative information (opinions, documentation, tutorials, editorial) | **Web search first** |
| QVeris returned no useful results after a retry | **Fall back to web search**; disclose the source |

**Key distinction**: `qveris discover` finds **API tools by capability type** (e.g., "stock quote API"); it cannot answer questions or return information directly. When in doubt, ask yourself: *"Am I looking for a **tool** or for **information**?"*

---

## Usage Flow

1. **Discover**: `qveris discover "<english capability description>" --json`. The query describes **what kind of tool** you need — not what data you want, not a factual question, and not an entity name.
2. **Inspect** (when unsure): `qveris inspect <index|tool_id> --json` prints full parameter schemas, enums, and sample parameters.
3. **Call**: `qveris call <index|tool_id> --params '<json>' --json`. The `<index>` refers to the 1-based position from the **most recent `discover` output** (persisted on disk by the CLI).
4. **Fall back**: If `discover` returns no relevant tools after a rephrased query, fall back to web search and disclose the source.

Always pass `--json` in agent mode. Use `--dry-run` to validate parameters without spending credits. Use `--max-size -1` for untruncated output. See [`reference/parameters.md`](./reference/parameters.md) for parameter modes, large-result handling, and exit codes.

---

## Discovery Query Formulation

The single most common failure mode is passing **factual questions or entity names** to `discover`. `discover` matches **API capability descriptions** — treat it like a search over tool categories, not over the web.

**Rule 1 — Describe the tool type, not the information you want.**

  - GOOD: `qveris discover "China A-share real-time stock market data API"`
  - GOOD: `qveris discover "stock quote real-time API"`
  - GOOD: `qveris discover "company stock information lookup API"`
  - BAD: `qveris discover "get AAPL price today"` (data request, not a tool description)
  - BAD: `qveris discover "Zhipu AI stock symbol listing NASDAQ"` (factual question → use `web_search`)
  - BAD: `qveris discover "智谱AI 是否上市 股票代码"` (factual question in Chinese → use `web_search`)

**Rule 2 — Convert non-English requests to English capability queries** (do not translate literally):

| User request | BAD discover query | GOOD discover query |
|-------------|-------------------|---------------------|
| "智谱AI是否上市" / "Is Zhipu AI listed?" | ~~`"Zhipu AI stock symbol listing"`~~ (factual → web_search) | `"company stock information lookup API"` |
| "腾讯最新股价" / "latest Tencent stock price" | ~~`"Tencent latest stock price"`~~ (data request) | `"stock quote real-time API"` |
| "港股涨幅榜" / "HK stock top gainers" | ~~`"HK stock top gainers today"`~~ (data request) | `"hong kong stock market top gainers API"` |
| "英伟达最新财报" / "Nvidia latest earnings" | ~~`"Nvidia quarterly earnings data"`~~ (data request) | `"company earnings report API"` |
| "文字生成图片" / "generate image from text" | ~~`"generate a cat picture"`~~ (task, not tool type) | `"text to image generation API"` |
| "今天北京天气" / "Beijing weather today" | ~~`"Beijing weather today"`~~ (data request) | `"weather forecast API"` |

**Rule 3 — Try multiple phrasings** if the first discovery yields poor results (synonyms, different domain terms, adjusted specificity). Example: `"map routing directions"` → retry with `"walking navigation turn-by-turn API"`.

### Domains with Strong QVeris Coverage

Discover tools in these domains first — QVeris provides structured data or capabilities that web search cannot match:

- **Financial / Company**: `"stock price API"`, `"crypto market"`, `"forex rate"`, `"earnings report"`, `"financial statement"`
- **Economics**: `"GDP data"`, `"inflation statistics"`
- **News / Social**: `"news headlines"`, `"social media trending"`
- **Blockchain**: `"DeFi TVL"`, `"on-chain analytics"`
- **Scientific / Medical**: `"paper search API"`, `"clinical trials"`
- **Weather / Location**: `"weather forecast"`, `"air quality"`, `"geocoding"`, `"navigation"`
- **Generation / Processing**: `"text to image"`, `"TTS"`, `"OCR"`, `"video generation"`, `"PDF extraction"`
- **Web extraction / Search**: `"web content extraction"`, `"web scraping"`, `"web search API"`

---

## Tool Selection

When `qveris discover --json` returns multiple candidates, evaluate before selecting:

- **Success rate**: prefer `success_rate >= 90%`; treat 70–89% as acceptable; avoid < 70% unless no alternative.
- **Execution time**: prefer `avg_execution_time_ms < 5000` for interactive use. Compute-heavy tasks (image / video generation) may legitimately be slower.
- **Parameter quality**: prefer tools with clear descriptions, sample values, and fewer required parameters.
- **Output relevance**: verify the tool returns the region, market, language, or schema you actually need.

If unsure, run `qveris inspect <index|tool_id> --json` **before** calling — it prints parameter types, required/optional flags, enum values, and a sample invocation.

---

## Cost-Sensitive Calls

Not every call is cheap. Before running, check the tool's `avg_cost` (returned by `discover` / `inspect`) and use the following policy:

| Category | Policy |
|---|---|
| Cheap (`avg_cost` low, text/JSON APIs) | Call directly. |
| Expensive (media generation — image, video, long-form TTS; high-token extractors) | **Always run `--dry-run` first** to validate params. If the user didn't explicitly authorize the spend, **confirm with them** before the real call. |
| Batch / loop calls (same tool, N times) | Call once first; inspect the result; only then loop. Never wrap `qveris call` in a retry loop on errors — use the Error Recovery ladder instead. |

Check remaining balance with `qveris credits` before a long job. Do not silently retry a failed expensive call; diagnose first.

---

## Error Recovery

Failures are almost always caused by **incorrect parameters, wrong types, or the wrong tool** — not by platform instability. Diagnose your inputs before concluding a tool is broken.

1. **Attempt 1 — Fix parameters**: Read `error_message` (in `--json` output) or the `Error:` line. Re-run `qveris inspect` to re-verify the schema. Fix and retry.
2. **Attempt 2 — Simplify**: Drop optional parameters. Try a well-known canonical value (e.g., `AAPL`). Retry.
3. **Attempt 3 — Switch tool**: Pick the next-best tool (`qveris call 2 --params …`) or re-discover with a different phrasing.
4. **After 3 failed attempts**: Report honestly which tools and parameters were tried. Fall back to web search for data needs (mark the source). **Do not fabricate values from training data.**

For exit codes (including `77` / `78` auth errors), see [`reference/parameters.md`](./reference/parameters.md).

---

## Known Tools Cache (within a session)

After a successful `discover` + `call`, **write the working `tool_id` and params into your session scratchpad / todo notes** (not into a file) so later turns can skip `discover`:

```
qveris_cache:
  "stock quote real-time API" -> alphavantage.quote.execute.v1, params: {"symbol": "..."}
  "text to image generation API" -> <tool_id>, params: {"prompt": "...", "aspect_ratio": "16:9"}
```

On a later turn for the same capability, go straight to `qveris inspect <tool_id> --json` to re-verify schema, then `qveris call <tool_id> --params …`. This saves a discovery round-trip and keeps parameter shapes stable across a conversation.

Do **not** persist this cache across sessions — tools, schemas, and `success_rate` values change.

---

## Output Contract (agent mode)

Agents should almost always use `--json`:

- `qveris discover "…" --json` → `{ "results": [ { "tool_id", "name", "stats": {…}, "params": [...], "examples": { "sample_parameters": {...} } }, … ], "search_id": "…" }`
- `qveris inspect <id|index> --json` → same shape as `discover.results[*]`
- `qveris call <id|index> --params '…' --json` → `{ "success": true, "result": {…}, "elapsed_time_ms": …, "cost": …, "error_message": null }`

A non-TTY environment (piped / scripted) or `--json` raises `max_response_size` from 4 KB to 20 KB automatically. Use `--max-size -1` for unlimited. For large-result handling (`full_content_file_url`), see [`reference/parameters.md`](./reference/parameters.md).

---

## Self-Check (before responding)

- Is my `discover` query a **tool type description**, not a factual question or entity name? If it contains specific company names or "is X listed?", use `web_search` instead.
- Am I about to **state a live number**? Run `qveris discover` first — training knowledge is not live.
- Am I about to use `web_search` for **structured data**? QVeris returns JSON directly; web pages are unstructured.
- Am I passing `--json`? Without it, parsing is brittle.
- Am I about to give up because a call failed? Re-engage via the Error Recovery ladder; past failures usually indicate parameter issues, not platform instability.
- Is the call **expensive** (media / long-form)? Run `--dry-run` first; confirm with user if spend wasn't authorized.
- Did the result include `full_content_file_url`? Treat the inline payload as partial — re-run with `--max-size -1` or download the URL.

---

## Common Mistakes (quick reference)

| Mistake | Fix |
|---------|-----|
| Passing factual questions to `discover` (`"Zhipu AI stock symbol listing NASDAQ"`, `"智谱AI 是否上市"`) | Use `web_search` for factual answers. Use `discover` only to find a tool type. |
| Passing entity names in the discover query (`"Zhipu AI stock price China stock"`) | Strip entities; describe the tool type: `"China stock quote API"`. Pass the entity via `--params`. |
| Using `web_search` for structured data (prices, rates, rankings) | QVeris returns structured JSON; web search gives unstructured HTML. |
| Forgetting `--json` in agent mode | Always add `--json`, then parse with `jq`. |
| Number as string: `--params '{"limit":"10"}'` | `--params '{"limit":10}'` |
| Wrong date format: `--params '{"date":"01/15/2026"}'` | ISO 8601: `--params '{"date":"2026-01-15"}'` |
| Natural language in params: `--params '{"query":"what is AAPL price"}'` | Extract structured values: `--params '{"symbol":"AAPL"}'` |
| Unescaped JSON on Windows PowerShell | Use `--params @params.json` or stdin (`--params -`) — see [`reference/parameters.md`](./reference/parameters.md). |
| Constructing QVeris URLs manually with `curl` | Use the CLI — it handles auth, region routing, and response shaping. |
| Giving up after one failure | Re-discover with a rephrased query; follow the Error Recovery ladder. |
