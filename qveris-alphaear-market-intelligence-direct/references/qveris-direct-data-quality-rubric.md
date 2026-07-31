# QVeris Direct Data-Quality Rubric

Use this rubric before turning any direct QVeris result into evidence. Read `qveris-direct-retry-policy.md` when discovery, inspection, execution, or semantic validation fails.

## Direct Invocation Gate

- Every structured-data result must follow an observed `search` and `tools/execute` pair from native QVeris tools or direct QVeris HTTP.
- Preserve one returned `search_id` or native `discovery_id` with the chosen `tool_id`. Reject mixed or invented pairs.
- Validate required parameters from discovery or inspection metadata before execution.
- Count `search`, `tools/execute`, and `tools/by-ids` attempts equally against `max_calls`.
- Require a passing call, credit, row, and billable-quantity preflight before execution.
- A saved observed-call record must describe the exact transmitted query or parameters and the actual result status.
- Runtime success alone does not establish evidence acceptance.

## Evidence Status

- `complete`: every requested core layer is fresh enough and passes identity, window, period, shape, and relevance checks.
- `partial`: at least one requested core layer is missing or rejected, while accepted evidence supports a narrower statement.
- `proxy_only`: only a clearly labeled weaker proxy supports the narrow statement.
- `insufficient`: no accepted evidence supports the requested conclusion.
- `limited`: runtime or result quality materially constrained the note; use mainly as `data_quality.status`.
- `budget_limited`: the call budget prevented the minimum useful discovery and execution sequence.

## Hard Rejects

- Reject report-wide contradictions. Build a single fact record for each value or relation and render every occurrence from it.
- Reject `changed` or `unchanged` unless one comparison record contains `baseline_as_of`, `baseline_value`, `current_as_of`, `current_value`, and `comparison_basis`.
- Reject displayed derived values unless their record contains formula, inputs, units, currency, period end, accepted evidence references, and status.
- Reject failed, unavailable, weak-relevance, or semantically wrong results from Evidence. Put them only in Data Quality And Missing Fields and Trace Appendix.
- Reject identity mismatches in symbol, company name, exchange, market, asset type, index name, benchmark, or currency.
- Reject every entity-scoped row that lacks explicit identity proof. One correct row does not validate a mixed result set.
- Reject wrong benchmark results, including a security returned for an index request.
- Reject issuer-mixed news, research, or event rows from catalyst and sentiment conclusions.
- Reject academic papers, broad industry articles, or loose text matches presented as issuer analyst research.
- Reject fewer than two dated observations for return, trend, correlation, realized volatility, drawdown, liquidity, or risk calculations.
- Reject statement tables unless income, balance sheet, cash flow, and ratio rows align on fiscal year, fiscal period, period end, currency, units, and basis.
- Reject annual requests answered only by quarter or trailing-period rows.
- Reject same-period cash-flow net income that materially conflicts with accepted income-statement net income.
- Reject stale evidence presented as same-day confirmation.
- Reject mojibake, replacement characters, and corrupt titles from quoted or summarized text.
- Reject empty sentiment value, label, cue, magnitude, or scale fields used as neutral or weak sentiment.
- Reject truncated results when missing content could change the conclusion and no approved complete-payload path exists.
- Reject sample parameter identities copied into a real execution.
- Reject raw identifiers, authorization data, cookies, signed URLs, provider routing, or secret-bearing errors outside Trace Appendix and machine-readable observed-call fixtures.

## Material Mismatch Thresholds

Use these defaults until the user supplies a stricter standard:

| Check | Default threshold | Action |
|---|---:|---|
| Same-period cash-flow net income vs income-statement net income | greater than 5% relative and greater than USD 100 million absolute | Exclude the cash-flow row and mark `statement_semantic_mismatch`. |
| Same-period revenue across statement-like results | greater than 3% relative and greater than USD 100 million absolute | Exclude the conflicting result. |
| Period end for an aligned table | any mismatch | Exclude the unmatched result. |
| Fiscal year, fiscal period, currency, units, or basis | any mismatch | Exclude the unmatched result. |

Do not normalize cumulative and point-in-time values by guesswork. Mark `measurement_basis_unclear`.

## Price And Calculation Rules

1. Filter to the requested entity and window before calculation.
2. Sort by timestamp and remove duplicate timestamps deterministically.
3. Record observation count before calculating adjacent returns.
4. Produce exactly `N-1` adjacent returns from `N` accepted prices.
5. Record formula, inputs, units, window, and accepted evidence references for every displayed derived value.
6. Suppress the calculation if any required input is missing, non-finite, zero where used as a denominator, stale beyond the request, or semantically wrong.
7. For adjusted history, require explicit adjusted close or a documented and regression-tested factor formula. For “last N,” require exactly N accepted observations.

## News And Sentiment Rules

- Require explicit issuer identity and publication time for each news row.
- Treat one owner publishing several copies as one source owner.
- Use qualitative sentiment only when at least two independent, issuer-matched, in-window source owners qualify.
- Phrase the result as sentiment within the qualifying source sample, not market consensus or likely price direction.
- Use numeric sentiment only when the selected tool documents the scale and returns non-empty issuer-matched values for the frozen window.
- Mark missing or empty signal fields as `sentiment_signal_empty`.
- Never infer strong catalysts, strong sentiment, or directional risk from headlines alone.

## Fallback Boundaries

- A transport-success result that fails this rubric is rejected, not fallback success.
- A next-best discovered tool may support a claim only after independent identity, window, shape, and field validation.
- Use a proxy only when its relationship to the requested evidence is explicit and the report labels `proxy_only`.
- If a statement-period mismatch occurs, retry once only with a documented period parameter. If it still mismatches, mark the requested statement missing.
- If a complete-payload URL is signed, secret-bearing, redirected, or outside an approved QVeris retrieval path, do not fetch or persist it.
- Do not replace structured data with Web search, training knowledge, a local database, or a direct third-party request.

## Trace And Output

- Build call counts, retry counts, timestamps, and trace rows only from saved `observed_calls`.
- Add one row per observed `search`, `tools/execute`, or `tools/by-ids` attempt. Do not add planned, skipped, or budget-blocked rows.
- Use this exact order: `request_kind`, `query`, `tool_id`, `params`, `status`, `search_id`, `fallback_used`, `missing_fields`.
- Render the exact Markdown header `| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`.
- Use JSON `null` for non-applicable values. Use compact JSON for parameters and missing fields.
- Use `status=success` for observed runtime success that passes the relevant request-level checks, `status=failed` for runtime failure, and `status=rejected` for runtime success that fails semantic validation.
- Set `fallback_used=true` only for a rephrased discovery, next-best tool, or proxy that participates in the final narrower result.
- A successful search row records the chosen tool identifier. A search with no chosen result records `tool_id=null`.
- Normalize a native discovery identifier into `search_id` without changing its value.
- For live, fresh, or E2E output, save `observed_calls.v1` with each sanitized direct response, response SHA-256, observed time, and derived trace row. Validate the report trace against it row-for-row.
- Use the audited runtime sidecar as the source of timeout layer, billing facts, sanitized response hash, and Trace projection.
- If no independent observed-call artifact exists, label the trace unverified and leave it empty.
- Raw `tool_id` and `search_id` values are permitted only in Trace Appendix and machine-readable observed-call fixtures.
- Never persist credentials, authorization headers, cookies, signed URLs, provider routes, or discarded search results.
- Require `observed_call_count` to equal the trace length.
- End user-facing reports with `Not investment advice.` as the final non-empty line.
