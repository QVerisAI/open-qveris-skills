# Direct QVeris Retry Policy

Use this policy for direct A-share tool discovery, inspection, and execution. Every request described here consumes one unit from `max_calls`.

## Failure Classes

| Failure class | Examples | Retry rule | Output rule |
|---|---|---|---|
| Discovery miss | no relevant result, wrong market coverage | Rephrase the English tool-type query once. Keep entities and requested values out of the query. | Mark `discovery_no_match` if the second search still has no suitable tool. |
| Transport failure | timeout, connection reset, temporary service error | Retry the same request at most twice total when budget permits. | Record every observed attempt; mark fields missing if both fail. |
| Parameter error | missing field, invalid enum, wrong type or date format | Inspect the selected tool once, correct only documented inputs, then retry execution once. | Mark `parameter_contract_unresolved` if correction fails. |
| Tool mismatch | discovered tool lacks mainland coverage or needed output | Select another relevant result from the same search, preserving the same search/tool pairing. | Set `fallback_used=true` only on an executed alternative that supports the final result. |
| Semantic mismatch | wrong security, exchange, market, period, window, or payload shape | Do not retry the same execution as transient. Try an alternative only when budget permits. | Record `status=rejected` and keep the payload out of Evidence. |
| Thin result | too few bars, empty rows, incomplete pagination | Retry only when documented pagination or window parameters can address it. | Mark `insufficient_observations` or `payload_truncated`. |
| Encoding artifact | mojibake or replacement characters | Do not repair or retry blindly. | Exclude corrupted text and mark `encoding_artifact`. |

## Discovery Rules

- Describe the API tool type in English.
- Do not include tickers, issuer names, factual questions, or desired answers.
- Save the returned search/discovery identifier with every candidate selected from that result set.
- If a rephrased search succeeds, use only its own identifier with its selected tool.
- A search with no execution still belongs in Trace because it was observed.

## Parameter Recovery

When execution returns a parameter-class error:

1. Confirm that at least two budget units remain for inspection and retry.
2. Inspect with `/tools/by-ids` using the selected tool and its session identifier.
3. Compare the current schema with the exact sent parameters.
4. Remove unsupported optional fields and correct documented types or formats.
5. Use the bundled deterministic adapter for symbol and fiscal-period normalization; supply enum mappings only from observed metadata.
6. Retry once with the corrected parameters.

Never fill a missing security identity with a sample value. Never change the requested market, period, or window merely to make a call succeed.

## Alternative Tools

An alternative result from the same discovery may be called with that search identifier. A result from a different discovery must use the new identifier. Validate each alternative's schema independently.

Mark `fallback_used=true` only when the alternative or proxy execution succeeds and contributes to the report. A failed alternative has `fallback_used=true` only if it was genuinely attempted as fallback; it never becomes evidence.

## Session Cache

Reuse a tool only in the session where it was discovered. Inspect before reuse and count the inspection. Rediscover when the schema, market coverage, output, or identifier pairing cannot be confirmed. Never reuse cached raw identifiers across sessions.

## Budget Rules

- Count `search`, `tools/by-ids`, and `tools/execute` separately.
- Count failed and rejected requests.
- Re-run credit, row, and billable-quantity preflight before every retry.
- Do not start inspection unless enough budget remains for the intended corrected execution.
- Stop before exceeding `max_calls`.
- List budget-blocked work as required next tool types, not Trace rows.
- With `dry_run=true`, make zero external requests and emit an empty Trace array/table.

## Trace Requirements

Record one row per observed attempt with the exact order:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

Use `null` where a field does not apply. Normalize native discovery identifiers into `search_id`. Derive retry counts and fallback statements from these rows only.

## Stop Conditions

- Stop after one rephrased discovery for the same tool type.
- Stop after two total transient attempts for one request.
- Stop after one inspect-and-correct cycle for a parameter error.
- Stop immediately on semantic mismatch for the same execution.
- Stop when the next request would exceed `max_calls`.
- If native and direct HTTP tiers are both unavailable, return `tool_runtime_missing`.
