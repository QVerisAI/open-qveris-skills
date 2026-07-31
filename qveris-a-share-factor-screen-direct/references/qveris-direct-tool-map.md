# Direct QVeris Tool Map - A-Share Factor Screen

Use this map after reading `../SKILL.md` and `qveris-direct-data-quality-rubric.md`.

The source snapshot is `third_party/source_repos/32-alphasift` at `9f52274`. Preserve its strategy-screen semantics while discovering generic QVeris tools at runtime. Do not maintain a static tool identifier map.

## Discovery Map

| Screen need | English tool-type query | Expected parameter concepts | Acceptance gate |
|---|---|---|---|
| User-supplied identity validation | `China A-share security master and exchange lookup API` | symbol/code, exchange or market | Returned code, exchange, mainland market, equity type, and listing status must match. |
| Full listed universe | `China A-share listed securities universe API` | as-of date, market, listing status, pagination | Require stated coverage, complete pagination, and a stable as-of date. |
| Index-based universe | `China stock index constituents with effective dates API` | index identifier, as-of date | Returned index identity and effective date must match; disclose that the result is an index universe. |
| Quote context | `China A-share real-time stock quote API` | symbol, exchange | Validate identity, market timestamp, currency, and freshness. |
| Momentum, liquidity, volatility | `China A-share historical adjusted daily price and volume bars API` | symbol, start/end date, adjustment, interval | Require comparable windows, documented adjustment, sufficient observations, and valid volume units. |
| Valuation and quality | `China A-share company financial ratios and statements API` | symbol, fiscal year/period, statement type | Require aligned period end, currency, units, and measurement basis. |
| Industry context | `China A-share company industry classification API` | symbol, taxonomy, as-of date | Require issuer match and a named taxonomy; theme labels alone are weak context. |
| News risk | `China listed company financial news API` | symbol/company identifier, start/end date, language | Require issuer relevance and window match; news alone is qualitative. |
| Numeric text signal | `China listed company news sentiment scoring API` | symbol/company identifier, start/end date | Require documented score meaning, issuer match, and consistent scoring scale. |
| Earnings or company events | `China listed company earnings and corporate events API` | symbol, start/end date, event type | Reject events outside the requested window or tied to another issuer. |

Discovery queries describe API tool types only. Put tickers, company names, dates, and requested values in execution parameters, never in the query.

## Direct Request Tiers

### Native

Use `qveris_discover` and `qveris_call` when they are available. Retain the discovery identifier with the selected tool and pass the pair to the call.

### Direct HTTP

Use only HTTPS requests to the QVeris host with base URL `https://qveris.ai/api/v1`. Reject redirects or configuration that changes the request to another host.

Send these headers on every request:

```text
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json
```

Never copy the authorization value or any header into Trace or an artifact.

Discover:

```json
{"query":"China A-share historical adjusted daily price and volume bars API","limit":10}
```

Send that body to `POST /search`.

Execute:

```json
{"search_id":"<paired search_id>","parameters":{"symbol":"600519.SH","start_date":"2026-01-01","end_date":"2026-06-30"},"max_response_size":20480}
```

Send that body to `POST /tools/execute?tool_id=<selected_tool_id>`.

Inspect a same-session cached tool:

```json
{"tool_ids":["<cached_tool_id>"],"search_id":"<paired search_id>"}
```

Send that body to `POST /tools/by-ids`. The `search_id` is optional only when the endpoint accepts inspection without it; preserve it whenever available.

If neither native nor direct HTTP access exists, return `tool_runtime_missing`. Do not invoke a finance-like raw tool through the repository script.

Every search, inspection, and execution request consumes one call from `max_calls`.

## Source Workflow Conversion

| Original Alphasift workflow | Direct-QVeris treatment |
|---|---|
| `strategies` | Keep catalogue semantics; translate strategy fields into required tool types and validated fields. |
| `screen` | Keep a research factor screen with explicit coverage. |
| hard filters | Apply only when every required input passes validation; otherwise mark the filter unavailable. |
| score/rank | Compute from validated components only; rank at least three securities with identical evidence bases. |
| saved runs | Represent in report metadata unless the runtime supplies explicit persistence. Never persist direct identifiers as skill configuration. |
| `evaluate` / `evaluate-batch` | Historical post-hoc evaluation using bars strictly after the frozen `as_of` screen. |
| hotspot/industry cache | Use validated classification or market-context tools; label weaker context `proxy_only`. |
| external analysis | Remove as a runtime dependency and suppress action-oriented fields. |

## Scoring Rules

- Score only validated components.
- Disclose the component denominator for every security.
- Do not combine different denominators into one cross-sectional rank.
- Require at least three securities with the same factor set, window, period, basis, and market convention.
- Never treat rank as a recommendation, expected return, or trade instruction.
- Freeze original evidence before fetching post-hoc evaluation bars.

## Tool Selection

Prefer tools that explicitly support mainland exchanges and expose clear parameter schemas. Then compare output relevance, success rate, and execution time. Reject a high-scoring candidate when its described market or output cannot satisfy the screen.

Do not record a selected tool as evidence until execution succeeds and the payload passes the data-quality rubric. Discovery metadata belongs to request audit, not factor evidence.

## Session Reuse

Cache a successful tool and its paired discovery identifier only in the current session. Before reuse, inspect the tool, count that request, and validate that the schema and market coverage remain compatible. A new session must discover again.

## Removed Dependencies

Do not use source-repository data packages, provider APIs, local provider caches, external analyzers, provider credentials, web scraping, or non-QVeris data pulls.

## Trace

Derive Trace only from saved observed requests. Use the exact header:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

Raw returned identifiers may appear only in Trace or machine-readable fixtures. Name supporting evidence by dataset/tool type everywhere else.
