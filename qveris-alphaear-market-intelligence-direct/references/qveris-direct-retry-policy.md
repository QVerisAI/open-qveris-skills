# QVeris Direct Retry Policy

Apply this policy to direct QVeris discovery, inspection, and execution. Every retry consumes one unit of `max_calls` and receives its own observed trace row.

## Preflight

Before the first execution:

1. Confirm that the discovery query is an English API tool-type description with no entity name or factual question.
2. Confirm that a returned discovery identifier is paired with the selected tool identifier from the same search.
3. Read required parameter names, types, formats, enums, defaults, and market scope from the selected metadata.
4. Fill only documented values. Never use a sample issuer when identity is missing.
5. Normalize unambiguous user input only when the selected metadata documents the accepted form; otherwise keep the field missing.
6. Reserve enough budget for the execution and any required identity validation. Do not spend the last call on optional discovery.
7. Save the exact query or transmitted parameters before rendering trace.

## Retry Classes

| Failure class | Examples | Retry rule | Output rule |
|---|---|---|---|
| Empty discovery | No results or irrelevant tool types | Rephrase once with another English tool-type description. | Mark `tool_not_found` if no relevant result is selected. |
| Transient transport | Fetch failure, timeout, connection reset | Retry the same request once. | If it fails again, mark the requested layer missing. |
| Server failure | HTTP 5xx or temporary execution error | Retry the exact execution once, then try at most one next-best result from the same search. | Record every attempt; use the alternate only after full validation. |
| Invalid selected tool | Not found, disabled, or rejected identifier | Do not repeat the same execution. Rediscover once. | Mark `tool_unavailable` if rediscovery does not yield a valid result. |
| Parameter error | Missing required field, wrong type, bad enum, invalid date form | Inspect same-session metadata or reread discovery metadata, correct only the documented issue, and retry once. | Mark `parameter_contract_unresolved` if correction fails. |
| Semantic mismatch | Wrong issuer, market, benchmark, fiscal period, or output meaning | Do not retry unchanged. Reject the result; switch only to a separately discovered result when budget remains. | Mark the precise reason such as `semantic_mismatch` or `period_mismatch`. |
| Thin result | Too few bars, empty sentiment, weak relevance | Retry only when a documented window, limit, or pagination parameter can address the gap. | Otherwise narrow the report and mark the field missing. |
| Truncated result | Inline body is incomplete | Use only an approved complete-payload path that preserves credential and host safety. | Otherwise mark `payload_truncated` and do not infer omitted content. |

## Search Recovery

- Preserve the original search row even when it returns no usable result.
- For a rephrased search, set `fallback_used=true` only if the rephrased result contributes to the final report.
- Keep issuer names and symbols out of every rephrased query.
- Stop after one rephrase for the same evidence need.
- Do not mix a tool identifier from the second search with the first search identifier.

## Execution Recovery

- Record exact transmitted parameters for each attempt; do not overwrite the first row with corrected values.
- Retry identical parameters only for transient transport or server failure.
- For parameter correction, change only fields justified by selected metadata or the returned validation error.
- When switching to another result, validate that tool's own parameter contract; do not reuse parameters blindly.
- Set `fallback_used=true` on the alternate execution only when its accepted result supports the final report.
- A rejected runtime-success result uses `status=rejected`, never `success`.

## Same-Session Inspection

Use `POST /tools/by-ids` only for a cached tool selected earlier in the same session.

- Count each inspection.
- Pair the cached identifier with its original discovery identifier when the endpoint accepts it.
- Record `request_kind=tools/by-ids`, `query=null`, the inspected `tool_id`, `params=null`, and the returned or paired `search_id`.
- If inspection reports changed required fields or incompatible market scope, reject reuse and rediscover.
- If no inspection runtime exists, rediscover instead of trusting a persistent identifier.

## Trace Requirements

- Record one row for every observed `search`, `tools/execute`, and `tools/by-ids` attempt.
- Use the exact fields `request_kind`, `query`, `tool_id`, `params`, `status`, `search_id`, `fallback_used`, and `missing_fields`.
- Use `null` for non-applicable values and compact JSON for objects and arrays.
- Derive observed and retry counts from saved rows only.
- Keep raw identifiers only in Trace Appendix and machine-readable observed-call fixtures.
- Never render credentials, authorization headers, cookies, signed URLs, provider routes, or secret-bearing error text.
- Keep failed and rejected rows in trace even when a later fallback succeeds.
- Do not place failed or rejected results in Evidence.

## Stop Conditions

- Stop when the next attempt would exceed `max_calls`.
- Stop after one search rephrase for an evidence need.
- Stop after one identical transient retry.
- Stop after one documented parameter correction.
- Stop after one next-best execution from a discovery.
- Stop immediately for a semantic mismatch unless a separately validated result remains within budget.
- Return `data_quality.status=budget_limited` when the minimum useful sequence cannot fit.
- Return `tool_runtime_missing` when neither native QVeris tools nor direct QVeris HTTP are available.
