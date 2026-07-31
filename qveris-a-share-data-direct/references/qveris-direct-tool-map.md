# Direct QVeris Tool Map - A-Share Data

Read this map after `../SKILL.md`. It maps each research need to an English discovery query and a semantic gate. It never names a fixed tool because direct QVeris results may change between sessions.

## Runtime Requests

Use the first working tier:

| Operation | Native route | HTTP route | Trace request_kind |
|---|---|---|---|
| Discover | `qveris_discover` | `POST /api/v1/search` | `search` |
| Execute | `qveris_call` | `POST /api/v1/tools/execute?tool_id=...` | `tools/execute` |
| Inspect a same-session cached tool | Rediscover if no native inspection tool exists | `POST /api/v1/tools/by-ids` | `tools/by-ids` |

The discovery result supplies the search token and candidate identifiers. Preserve the selected pair for execution. In Trace, normalize a native `discovery_id` to `search_id`.

## Direct HTTP Contract

Use the bundled audited runtime and the configured `QVERIS_BASE_URL` contract from `qveris-direct-runtime-contract.md`. Its default is `https://qveris.ai/api/v1`; approved deployments may configure `qveris.cn` or `api.qveris.cloud`. Require HTTPS with the exact `/api/v1` path and reject redirects or host substitution.

Send these headers on every request:

```text
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json
```

Use these bodies:

```json
POST /search
{"query":"China A-share real-time stock quote API","limit":5}

POST /tools/execute?tool_id=<selected-tool-id>
{"search_id":"<returned-search-id>","parameters":{"symbol":"600519.SH"},"max_response_size":20480}

POST /tools/by-ids
{"tool_ids":["<same-session-tool-id>"],"search_id":"<optional-same-session-search-id>"}
```

The execution query-string identifier and request-body search token must be the pair chosen from discovery. The inspection body may omit `search_id` only when the direct API documents it as optional. Never place the authorization header, API key, cookies, or any other header value in Trace.

## Discovery Map

| Research need | English tool-type query | Required result semantics |
|---|---|---|
| Symbol resolution | `China A-share security master symbol lookup API` | Symbol, exchange, market, listing type, security type, issuer name |
| Company profile | `China listed company profile and industry classification API` | Explicit issuer identity plus profile or industry fields |
| Real-time quote | `China A-share real-time stock quote API` | Matched symbol, exchange or market, quote timestamp, price fields |
| Daily bars | `China A-share historical daily price bars API` | Matched symbol, dated OHLCV rows, documented adjustment basis |
| Corporate events | `China listed company corporate events calendar API` | Issuer, event type, event date, relevant detail |
| Earnings calendar | `China listed company earnings calendar API` | Issuer, report or release date, fiscal period when available |
| IPO calendar | `China and Hong Kong IPO calendar API` | Issuer, market, listing date or dated milestone |
| A+H mapping | `China and Hong Kong dual-listed securities mapping API` | Explicit mainland and Hong Kong listing identities for one issuer |
| Industry classification | `China stock industry classification API` | Classification scheme, industry levels, matched security |
| Sector performance | `China stock sector performance API` | Named sector, observation date, metric definition |
| Top movers | `China stock market top gainers and losers API` | Market, ranking date, matched listed securities, ranking metric |
| Issuer news | `China listed company financial news API` | Issuer identity, publication time, title or summary, source time |
| Text sentiment | `financial news text sentiment analysis API` | Input-to-output linkage, score or label definition, issuer relevance |

Never add a company name, ticker, event question, or desired answer to a discovery query. Put those values only in execution parameters after selecting a tool.

## Tool Selection

Prefer candidates in this order:

1. Clear required and optional parameter descriptions.
2. Explicit China A-share or requested-market coverage.
3. Output fields that satisfy the semantic gate above.
4. Higher observed success rate.
5. Lower expected latency when quality is otherwise equal.

Reject a result when the parameter schema is absent, market coverage is unclear, or the described output cannot establish issuer and window identity.

## Parameter Rules

- Extract structured values from the user request. Do not send a natural-language question as a symbol or date parameter.
- Preserve explicit `.SH` and `.SZ` suffixes. Infer a suffix only for an unambiguous six-digit code.
- Use ISO dates unless the chosen tool documents another format.
- Respect documented enums and types. Never invent an optional filter.
- Run the deterministic parameter adapter against the observed schema. Map fiscal periods and provider enums only when metadata documents the mapping.
- Do not fill a missing issuer identity with a sample symbol from tool metadata.
- Save the exact transmitted parameters for the execution Trace row.
- Run credit, row, and billable-quantity preflight before every execution.

## Same-Session Cache

Cache only a successful pair of tool identifier, search token, and observed parameter schema, and only for the current session.

Before reuse:

1. Spend one budgeted inspection request through `/tools/by-ids` when available.
2. Confirm required parameters, expected output, and China-market coverage still match.
3. Reuse the original search token only in the same session.
4. If inspection is unavailable or validation fails, run a fresh discovery.
5. Never write raw identifiers into prose, Evidence, persistent notes, or filenames.

## Source Script Conversion

| Original module | Direct-QVeris treatment |
|---|---|
| `fetch_realtime.py` | Discover security-master and quote tool types, then execute after identity checks. |
| `fetch_history.py` | Discover daily-bar tools and reject thin or wrong-window rows. |
| `fetch_technical.py` | Calculate descriptive indicators from validated bars only. |
| `fetch_stock_events.py` | Discover issuer-event, earnings-calendar, news, and optional sentiment tools. |
| `fetch_danginvest.py` | Discover industry, sector-performance, top-mover, and issuer-news tools; label proxies. |
| `fetch_sector_info.py` | Discover security classification and constituent tools; do not infer themes. |
| `fetch_ah_stocks.py` and `fetch_ah_ipo_timeline.py` | Discover dual-list mapping and IPO-event tools; require explicit paired listings and dates. |
| Trading, MACD-plan, and paper-trading folders | Removed. |

## Trace Pairing

- A successful `search` row records its English query, returned `search_id`, and the chosen `tool_id`. Use `tool_id=null` if no relevant result was chosen.
- Each `tools/execute` row records the exact selected `tool_id`, matching `search_id`, and transmitted parameters.
- Each `tools/by-ids` row records the inspected `tool_id`; keep `query=null`.
- Use one row per observed attempt, including retries and rejected responses.
