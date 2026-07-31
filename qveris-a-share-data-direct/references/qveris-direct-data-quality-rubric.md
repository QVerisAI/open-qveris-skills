# Direct QVeris Data-Quality Rubric

Apply this rubric to every direct QVeris response before turning it into A-share evidence. Read `qveris-direct-retry-policy.md` when a request fails, is rejected, or returns a thin or truncated result.

## Evidence Status

- `complete`: requested primary evidence is fresh enough and passes identity, window, shape, and unit checks.
- `partial`: some requested evidence is missing, stale, or rejected, but accepted evidence supports a narrower statement.
- `proxy_only`: only an explicitly labeled weaker proxy supports a low-confidence statement.
- `insufficient`: no accepted evidence supports the requested conclusion.
- `limited`: runtime or response quality materially constrained the read.
- `budget_limited`: the call budget blocked the minimum useful evidence set.

## Discovery And Execution Gate

- Treat discovery as tool selection, never as evidence. Search results describe tools and do not answer the user question.
- Require an English tool-type query with no issuer name, ticker, or factual question.
- Require a returned search token and selected tool identifier before execution.
- Execute only with the selected pair from the same discovery or a validated same-session cache.
- Validate required parameter names, types, formats, enums, and market coverage before execution.
- Count every discovery, inspection, execution, and retry against `max_calls`.
- Reject a request record that lacks enough observed detail to reconstruct its request kind, query when relevant, selected pair, parameters, and status.

## Hard Rejects

- Reject issuer mismatches. Returned symbol, issuer name, exchange, market, listing class, and asset type must match the requested mainland security.
- Reject funds, indexes, Hong Kong-only listings, or unrelated securities substituted for an A-share request.
- Reject wrong-window rows and timestamps that cannot support the requested as-of date.
- Reject multi-day trend, return, volatility, drawdown, liquidity, or indicator claims from fewer than two bars.
- Reject an indicator when its full lookback is unavailable. Never pad, extrapolate, or import missing observations.
- Reject contradictory technical facts. Build latest close, MA20, MA60, `close_vs_ma20`, and `close_vs_ma60` once and render all sections from that record.
- Reject event rows without issuer identity, event type, event date, or requested-window alignment.
- Reject A+H claims unless one issuer is explicitly linked to both mainland and Hong Kong listings.
- Reject sector fund-flow claims derived only from classification, constituents, price moves, or top movers.
- Reject mixed-entity news, broad-market rows presented as issuer news, weak text matches, and undated news.
- Reject mojibake and replacement-character text. Do not repair, translate, or infer corrupted labels, titles, or snippets.
- Reject displayed derived values unless the calculation record includes formula, inputs, units, window, accepted source rows, and status.
- Reject a transport-success execution as evidence when semantic checks fail. Record it as `rejected` in Trace.

## Freshness And Window Rules

- Compare each returned observation time with the requested as-of time and `max_age`.
- Keep stale values out of same-day claims. They may appear only as clearly dated lagged context.
- Require daily bars to cover the requested start and end bounds as far as the relevant exchange calendar permits.
- Keep out-of-window events in data-quality notes, not Evidence.
- Do not infer the current state from an undated or timezone-ambiguous response.

## Technical Context

- Calculate indicators locally only from accepted QVeris-supplied bars.
- State the lookback and adjustment basis.
- Require at least 20 accepted closes for MA20, 60 for MA60, and the full conventional input length for any RSI, MACD, or BOLL calculation used.
- Keep indicator wording descriptive and historical. Do not emit trade actions, ratings, or directional promises.

## News And Sector Context

- Require explicit issuer identity for each news row used in an issuer conclusion.
- Use general financial news only as broad context and label it as such.
- Use text sentiment only when the sentiment output is linked to the exact accepted text and the score or label meaning is documented.
- Treat industry labels, constituents, and top movers as context. Do not rename them as money flow or sector heat unless the returned fields prove that meaning.

## Identifier And Secret Handling

- Never include an API key, authorization header, cookie, token, secret, or credential-bearing response field in any artifact.
- Raw `tool_id` and `search_id` values may appear only in Trace Appendix rows or machine-readable fixtures.
- Tool identifiers may contain a provider-like name; that occurrence is allowed only inside the raw `tool_id` Trace cell.
- Do not place raw identifiers in Summary, Evidence, prose, warnings, filenames, or user-facing source lists.
- Trace `params` must contain only the transmitted business parameters, never headers or credentials.

## Trace Contract

Use exactly these fields and this order:

`request_kind`, `query`, `tool_id`, `params`, `status`, `search_id`, `fallback_used`, `missing_fields`.

Markdown must use this exact header:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

Rules:

- Add one row per observed `search`, `tools/by-ids`, or `tools/execute` attempt.
- Normalize native discovery to `search` and native execution to `tools/execute`.
- Use `null` for fields that do not apply.
- Encode `params` as compact JSON and `missing_fields` as a JSON array.
- Set `status=success` for an observed successful discovery, inspection, or semantically accepted execution.
- Set `status=failed` for an observed request failure.
- Set `status=rejected` for a transport-success execution that fails semantic validation.
- Set `fallback_used=true` only when the row calls a secondary candidate or proxy used in the final answer.
- Derive `observed_call_count` from the number of Trace rows.
- Do not add planned, skipped, cached-without-inspection, or budget-blocked requests to Trace.

## Evidence Placement

Only accepted payload fields belong in Evidence. Failed or rejected requests, poor discovery results, stale values, thin windows, and unavailable tool types belong in `Data Quality And Missing Fields` and Trace.

Use product-readable reason codes such as `tool_runtime_missing`, `no_relevant_tool`, `parameter_contract_unresolved`, `semantic_mismatch`, `out_of_window_event`, `insufficient_observations`, `entity_mix`, `weak_relevance`, `encoding_artifact`, `payload_truncated`, `stale_evidence`, and `budget_limited`.

End every user-facing report with exactly `Not investment advice.`
