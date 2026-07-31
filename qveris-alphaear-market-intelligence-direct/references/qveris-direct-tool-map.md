# QVeris Direct Tool Map

Source: Awesome Finance Skills / AlphaEar, https://github.com/RKiding/Awesome-finance-skills, Apache-2.0, evaluation recent activity 2026-03-29. Local snapshot: `third_party/source_repos/42-awesome-finance-skills`, commit `853f09b` on 2026-03-29.

## Runtime Policy

- Use the bundled audited runtime first when `exec` and Node.js are available.
- Otherwise use native `qveris_discover` plus `qveris_call`, then `http_request` against the configured QVeris `POST /search`, `POST /tools/execute`, and same-session `POST /tools/by-ids` routes.
- Resolve the host from `QVERIS_BASE_URL` under `qveris-direct-runtime-contract.md`; never hardcode the active deployment.
- Use `QVERIS_API_KEY` only through the configured credential transport. Never print or persist it.
- If neither runtime exists, return `tool_runtime_missing`; do not switch to another finance source.
- Count every search, execution, inspection, retry, and rejected result against `max_calls`.
- Estimate credits, rows, and billable quantity before execution; block unknown bounded estimates and exceeded limits.
- Keep actual `tool_id` and `search_id` values only in Trace Appendix or machine-readable observed-call fixtures.
- Apply `qveris-direct-data-quality-rubric.md` and `qveris-direct-retry-policy.md` before accepting a result.

## Tool-Type Query Map

These are discovery templates, not fixed routes. Keep each query in English and entity-free.

| Workflow need | Discovery query | Required output proof |
|---|---|---|
| Issuer identity | `listed security identity and company profile lookup API` | Symbol, legal or common name, exchange, market, asset type, and currency. |
| Company context | `public company profile and industry classification API` | Matched issuer plus classification date or current-state marker. |
| Quote | `real-time stock quote API with exchange and timestamp` | Matched symbol, exchange, currency, price field, and timestamp. |
| Price history | `historical adjusted stock price bars API` | Matched symbol, dated rows, adjustment meaning, and requested window. |
| Financial statements | `company income balance sheet and cash flow statement API` | Fiscal year, fiscal period, period end, basis, units, and currency. |
| Ratios | `company financial ratios API with reporting period` | Formula or documented field meaning plus aligned period. |
| News | `company financial news API with publication timestamp` | Issuer-matched headline or text, source owner, URL or record ID, and time. |
| Sentiment | `company news text sentiment analysis API` | Issuer match, window, non-empty signal value, and documented scale. |
| Events | `company earnings and corporate event calendar API` | Issuer match, event type, event date, and time zone when relevant. |

Never put an issuer name, symbol, desired number, or factual question into discovery. For example, `TSLA latest price` is invalid; use `real-time stock quote API with exchange and timestamp` and pass `TSLA` only to the selected tool.

## Selection Rules

1. Require documented parameter names, types, formats, and required fields.
2. Require market and asset coverage that fits the request.
3. Prefer success rate at or above 90%; use 70–89% with caution; avoid lower rates unless no stronger result exists.
4. Prefer interactive latency below five seconds when evidence quality is otherwise equal.
5. Reject results whose output description cannot prove identity, window, or the requested field.
6. Preserve the returned discovery identifier with the chosen tool identifier. Never pair values from different searches.
7. Do not publish the selected raw identifier in Evidence or prose.

## Session Reuse

A selected tool may be reused only in the same session:

1. Retain its identifier, paired discovery identifier, validated parameter shape, and accepted market scope in session memory.
2. If `http_request` is available, inspect it with `POST /tools/by-ids` before reuse and count the inspection.
3. Reject reuse if the inspection changes required parameters, market scope, or output meaning.
4. If inspection is unavailable or fails, rediscover.
5. Clear the cache at session end. Never encode a discovered identifier in this skill.

## AlphaEar Migration Map

| Original AlphaEar surface | Direct QVeris adaptation |
|---|---|
| Stock search and prices | Discover identity, quote, and historical-price tools; validate each result independently. |
| Fundamentals | Discover statement and ratio tools; align fiscal period, basis, units, and currency. |
| Finance news | Discover issuer-news tools; use only issuer-matched, in-window rows. |
| Sentiment model | Discover a documented text-sentiment tool; otherwise report sentiment coverage as insufficient. |
| Signal tracker | Compare validated records and describe changed, unchanged, or unsupported evidence without action language. |
| Reporter | Produce Markdown with a claim ledger, missing fields, and direct-call trace. |
| Forecast or prediction tools | Keep unsupported and suppress forecast commitments. |

## Hard Rejects

- Wrong issuer, market, exchange, asset type, benchmark, or currency.
- Search results selected from an entity-style or factual discovery query.
- A tool identifier paired with a discovery identifier from another search.
- Sample parameter values substituted for missing issuer identity.
- Fewer than two bars used for a multi-day calculation.
- Statement rows with mismatched fiscal period, period end, units, or basis.
- Empty sentiment fields described as neutral, weak, or numeric sentiment.
- News-only context described as a strong directional signal.
- Raw identifiers, provider routing, credentials, or signed URLs in user-facing prose.
- Planned or skipped requests rendered as observed trace rows.

## Budget Order

1. Discover an issuer-identity tool.
2. Execute identity validation.
3. Discover and execute the user's primary requested layer.
4. Discover and execute one corroborating layer when required.
5. Inspect a same-session cached tool only when reuse saves a later discovery and the budget still fits.
6. Add optional news, sentiment, ratios, or events only after core evidence passes.

A useful minimum usually needs four calls: identity discovery, identity execution, primary-layer discovery, and primary-layer execution. If the budget cannot fund that sequence, return a budget-limited coverage monitor.
