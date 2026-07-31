---
name: qveris-alphaear-market-intelligence-direct
description: Use for stock lookup, price and fundamental context, finance news, sentiment coverage checks, signal-monitor updates, and market-intelligence reports that must use direct QVeris tool discovery and execution, strict identity and window validation, budgeted traceability, honest fallback, Markdown output, and no investment advice.
---

# QVeris AlphaEar Market Intelligence Direct

Preserve AlphaEar's stock, news, sentiment, signal-tracking, and reporting intent while replacing public feeds, local databases, model downloads, and prediction tooling with direct QVeris tool discovery and execution.

Source record:

| Field | Value |
|---|---|
| Candidate number | 42 |
| Original repository | Awesome Finance Skills / AlphaEar |
| GitHub URL | https://github.com/RKiding/Awesome-finance-skills |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-03-29 |
| Local source snapshot | `third_party/source_repos/42-awesome-finance-skills` |
| Snapshot latest commit | `853f09b` on 2026-03-29 |

## Direct Workflow

1. Freeze the request before any network call. Record the issuer, market, requested fields, time window, fiscal period, `effective_cutoff`, `dry_run`, `max_calls`, `max_credits`, `max_rows`, `max_billable_quantity`, `max_age`, and `budget_note`. Default to `dry_run=false`, `max_calls=8`, `max_credits=20`, `max_rows=250`, `max_billable_quantity=500`, `max_age=P1D`, and a conservative budget note.
2. Read `references/qveris-direct-runtime-contract.md` before any live call and use its audited runtime when available. Read `references/qveris-direct-tool-map.md` before choosing tool-type queries. Read `references/qveris-direct-data-quality-rubric.md` before accepting evidence. Read `references/qveris-direct-retry-policy.md` after any failed, rejected, thin, or truncated result.
3. Discover the minimum tool set. Write each query in English as an API tool-type description, never as an entity question or data request. Keep issuer names, symbols, dates, and requested values out of discovery queries.
4. Select one result using documented market coverage, required parameters, output shape, success rate, and latency. Preserve the returned `search_id` or native `discovery_id` with the selected `tool_id`; never invent or mix the pair.
5. Validate every required parameter against the selected tool metadata, then execute with exact structured values from the request. Do not copy sample identity values into a real call.
6. Validate entity, market, currency, asset type, window, fiscal period, freshness, row count, and field meaning before adding a result to the claim ledger. A successful transport is not evidence by itself.
7. Build Summary, Evidence, and Analysis only from the accepted claim ledger. Put failed or rejected results in Data Quality And Missing Fields and Trace Appendix.
8. Finish only when every observed request is represented once in the trace, `observed_call_count` equals the trace length, all requested layers are accepted or explicitly missing, and the final disclaimer is present.

## Runtime Tiers

Use the first available direct tier:

1. Bundled audited HTTP runtime: use `node scripts/qveris_direct_runtime.mjs` when `exec` and Node.js are available.
2. Native: call `qveris_discover`, then `qveris_call` with the exact returned discovery identifier and selected tool identifier.
3. HTTP: use `http_request` with `QVERIS_API_KEY` against the configured `QVERIS_BASE_URL`:
   - Allow only approved HTTPS QVeris `/api/v1` hosts; reject redirects and host substitution.
   - Send `Authorization: Bearer ${QVERIS_API_KEY}` and `Content-Type: application/json` headers, but never place either header or its value in trace.
   - `POST /search` with `{"query":"stock quote and historical price API","limit":10}`.
   - `POST /tools/execute?tool_id=<selected>` with `{"search_id":"<returned>","parameters":{...},"max_response_size":20480}`.
   - `POST /tools/by-ids` with `{"tool_ids":["<cached>"],"search_id":"<optional-same-session-id>"}`; omit `search_id` only when the endpoint accepts it as optional.
4. If no tier is available, set `tool_runtime_missing` and return a coverage monitor without substituting another data source.

Every observed `search`, `tools/execute`, and `tools/by-ids` attempt consumes one unit of `max_calls`, including retries and rejected results. Never start an attempt when no budget remains.

Before execution, estimate credits, rows, and billable quantity from selected-tool metadata. Stop on an unknown bounded estimate or any exceeded `max_credits`, `max_rows`, or `max_billable_quantity` limit.

Use a cached tool only within the current session. Before reuse, inspect it through `/tools/by-ids` when the HTTP tier is available and count that inspection. If inspection is unavailable or fails, rediscover. Never persist a tool identifier as a cross-session default.

Never expose `QVERIS_API_KEY`, authorization headers, cookies, signed download URLs, or secret-bearing error text. Raw `tool_id` and `search_id` values may appear only in Trace Appendix or machine-readable observed-call fixtures; keep them out of Summary, Evidence, Analysis, and ordinary prose.

## Evidence Gate

- Resolve issuer identity before quoting entity-scoped facts. Require symbol, company name, exchange, market, asset type, and currency to agree with the request.
- Validate every entity-scoped row. Reject mixed rows or rows that do not prove the requested issuer.
- Require returned timestamps and period ends to fit the frozen window and `effective_cutoff`. Label stale but otherwise valid points as stale; never present them as current.
- Sort and deduplicate dated prices. Require at least two observations before computing returns, trend, liquidity, volatility, drawdown, or correlation; state both observation and return counts.
- Use explicit adjusted-close semantics for adjusted history. Reject raw close plus an undocumented factor. For “last N” requests, use exactly N observations or mark the layer missing.
- Align income statement, balance sheet, cash flow, and ratios by fiscal year, fiscal period, period end, currency, and measurement basis.
- If an annual request returns quarter or trailing-period data, retry once only when the selected tool documents a stricter period parameter. Otherwise mark the annual layer missing.
- Treat empty sentiment fields as `sentiment_signal_empty`, not neutral or weak sentiment. A numeric sentiment claim requires a documented scale plus non-empty issuer-matched values.
- Describe qualitative sentiment only for the qualifying in-window source sample. Require at least two independent issuer-matched source owners; otherwise set sentiment to `insufficient`.
- Emit `changed` or `unchanged` only from a record with `baseline_as_of`, `baseline_value`, `current_as_of`, `current_value`, and `comparison_basis`. Otherwise emit `unsupported`.
- Reject corrupted text, wrong benchmarks, irrelevant analyst material, impossible shapes, and payloads that are only error envelopes.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, trade triggers, automated execution plans, and prediction commitments.

## Discovery And Selection

Use English tool-type queries such as:

- `listed security identity and company profile lookup API`
- `real-time stock quote and historical price bars API`
- `company financial statements and financial ratios API`
- `company financial news and text sentiment analysis API`
- `company earnings and corporate event calendar API`

Bad discovery queries include `TSLA latest price`, `Is company X listed?`, and translated entity questions. Put `TSLA`, exchange, dates, and requested fields into execution parameters only.

Prefer results with explicit parameter definitions and market coverage. Treat success rate at or above 90% as preferred, 70–89% as usable with caution, and below 70% as a last resort. Do not state provider or routing metadata in user-facing prose.

## Fallback Policy

- Rephrase an empty or irrelevant discovery once using another English tool-type description. Stop if no relevant result remains or the budget cannot fund discovery plus execution.
- For a documented parameter error, inspect or reread the selected metadata, correct only the named parameter, and retry once.
- For timeout, connection reset, or 5xx, retry the exact execution once. If it fails again, try at most one next-best result from the same discovery when budget remains.
- For an invalid or unavailable selected tool, rediscover once. Do not reuse its identifier.
- Do not retry a semantic mismatch as though it were transient. Reject it and use another result only when a separately validated result is available.
- If bars are too thin, statements are misaligned, sentiment fields are empty, or output is truncated without an approved complete-payload path, mark the affected claim missing.
- Do not use Web search, local databases, training-data values, or direct third-party calls to fill a structured-data gap.
- If the remaining budget cannot fund the minimum useful request pair, return `data_quality.status=budget_limited`.

## Output Requirements

Use these level-2 headings exactly:

- `## Summary`
- `## Evidence`
- `## Analysis`
- `## Data Quality And Missing Fields`
- `## Trace Appendix`

State `report_mode: full_note` only when every requested core layer passes; otherwise state `report_mode: coverage_monitor`. Keep raw identifiers out of the Evidence table; identify sources there by tool-type query and accepted data fields.

Render this exact trace header:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

Use one row for every observed `search`, `tools/execute`, or `tools/by-ids` attempt, including retries. Use JSON `null` for non-applicable cells, compact JSON for `params` and `missing_fields`, and only `success`, `failed`, or `rejected` for status. For a successful discovery row, record the chosen tool identifier; if no result was chosen, use `null`. Normalize a native discovery identifier into `search_id` without changing its value.

Build trace and call counts only from saved `observed_calls`. Do not add planned, skipped, or budget-blocked rows. For output labeled live, fresh, or E2E, use the audited runtime to save a sanitized `observed_calls.v1` sidecar with each direct request, timestamp, response hash, timeout layer, billing facts, and derived trace row. Require exact row-for-row equality. Without a verified sidecar, state that the trace is unverified and render only the header and separator.

Include `missing_fields`, `data_quality.status`, rejection reasons, stale fields, and suppressed fields. Put full machine-readable trace JSON only in Trace Appendix, schema fixtures, or when requested.

Echo call, credit, row, and billable-quantity controls and their observed or estimated usage.

End every user-facing report with a final non-empty line exactly:

`Not investment advice.`

## Prohibited Behavior

Do not use non-QVeris finance sources, browser automation, external provider keys, dynamic data-package installs, local model downloads, automated trading, prediction-market execution, action triggers, target prices, rebalancing instructions, or execution plans.

## References

- Read `references/qveris-direct-runtime-contract.md` before any live direct request.
- Read `references/qveris-direct-tool-map.md` before discovery and tool selection.
- Read `references/qveris-direct-data-quality-rubric.md` before accepting any result as evidence.
- Read `references/qveris-direct-retry-policy.md` when a request fails or a result is rejected.
- Use `examples/default-markdown-report.md` as the user-facing format example.
- Use `fixtures/qveris/*.json` only as static schema fixtures; they are not observed runs.
- Validate machine-readable output with `schemas/output.schema.json`.
