# Direct QVeris Finance Data-Quality Rubric

Read this rubric before turning any directly executed QVeris payload into A-share factor evidence. Read `qveris-direct-retry-policy.md` when discovery, inspection, or execution fails.

## Evidence Status

- `complete`: primary evidence is available, fresh enough, and passes identity, window, period, shape, and observation checks.
- `partial`: some primary fields are unavailable or rejected, but validated evidence supports narrower statements.
- `proxy_only`: only weaker context is usable; label the proxy and keep confidence low.
- `insufficient`: evidence is missing or rejected, so the requested conclusion is unsupported.
- `budget_limited`: `max_calls` prevented the minimum useful request set; do not infer missing facts.

## Request Integrity

- Use only native `qveris_discover`/`qveris_call` or direct HTTP `/search`, `/tools/by-ids`, and `/tools/execute`.
- Preserve each selected `tool_id` with the `search_id` or `discovery_id` returned by the same search.
- Validate the discovered parameter descriptions before execution. Do not guess required names, types, enums, date formats, or identifier formats.
- Count every observed discovery, inspection, and execution attempt, including failures and retries.
- Never let transport success alone qualify a payload as evidence.

## Hard Rejects

Reject or isolate all of the following:

- credential, authorization-header, signed-URL, or internal routing leakage;
- raw returned tool/search identifiers outside Trace or machine-readable fixtures;
- security, exchange, market, listing-class, asset-type, index, or benchmark mismatch;
- a full-universe claim without verified coverage and completed pagination;
- fewer than two bars for a multi-day metric, or fewer than lookback plus one observations for a lookback indicator;
- a price window outside the request or crossing the `as_of` boundary of the original screen;
- mismatched fiscal year, fiscal period, period end, currency, unit, or measurement basis in aligned financials;
- unsupported derived metrics without formula, numerator, denominator, unit, currency, period end, source fields, and observed Trace row references;
- general news used as numeric sentiment without a documented score;
- mixed-issuer news, unrelated research, or an out-of-window company event;
- mojibake or replacement characters in names, classifications, titles, snippets, or report labels;
- incomplete inline content when the response indicates truncation or a larger remote artifact;
- contradictory facts across report sections.

A rejected transport-success execution receives `status=rejected` in Trace. Keep it out of Evidence and explain the readable reason under Data Quality.

## Comparability Gates

Assign each requested security one tier:

- `complete_comparable`: all required components pass and share the same comparison basis.
- `partial_not_ranked`: some validated evidence exists, but the factor set or basis is incomplete.
- `proxy_only`: only explicitly labeled weaker context is usable.
- `insufficient`: no usable factor evidence remains.

Rank only `complete_comparable` securities when all share the same factor set, price window, fiscal period, measurement basis, and market convention. Require at least three securities. Do not renormalize different denominators into one rank.

## Financial Alignment

For aligned income, balance-sheet, cash-flow, or ratio evidence:

- require the same fiscal year, fiscal period, and period end;
- require explicit currency and units;
- reject point-in-time and cumulative values combined without documented normalization;
- reject materially conflicting same-period figures instead of choosing one silently;
- label trailing calculations as trailing and never infer forward values.

If a period-specific request returns a latest-quarter or trailing shape, mark `period_mismatch`.

## News And Text

Require explicit issuer identity for every news, research, event, or text-signal row. A name or keyword match alone is insufficient when another entity may share it. Treat general news as qualitative context and keep it out of numeric factor scoring.

Exclude corrupted text fields rather than repairing or translating them by inference. Valid numeric/date fields may remain only when identity and window checks independently pass.

## Truncation And Large Results

If a result is truncated or points to a larger remote artifact, do not claim completeness from inline content. Use a separately approved retrieval path only when it preserves credential and URL-sanitization rules; otherwise mark `payload_truncated` and narrow the report.

## Trace And Observed Calls

Build counts, retry claims, fallback claims, and Trace rows only from saved observed requests.

Use this exact row contract and order:

`request_kind`, `query`, `tool_id`, `params`, `status`, `search_id`, `fallback_used`, `missing_fields`.

Rules:

- record one row for every observed `search`, `tools/execute`, or `tools/by-ids` attempt;
- use `null` for fields that do not apply;
- normalize native `discovery_id` into the `search_id` field;
- use `status=success` for accepted transport success, `failed` for request failure, and `rejected` for semantic rejection;
- include no planned, skipped, or budget-blocked rows;
- keep raw identifiers only in Trace or machine-readable fixtures;
- remove credentials, authorization headers, and signed URLs from `params` and saved responses.

For any report labeled live, fresh, or E2E, save an independent observed-calls artifact with sanitized response material, response hash, observed timestamp when returned, request kind, exact sent parameters, identifiers, and derived Trace row. Validate the report Trace row-for-row against that artifact. If no verified artifact exists, state that the trace is unverified and render an empty Trace table.

Trace proves the request happened. Evidence proves the payload survived validation.

## Missing-Field Reasons

Use readable reasons such as `not_called`, `budget_limited`, `tool_runtime_missing`, `discovery_no_match`, `parameter_contract_unresolved`, `failed`, `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, `insufficient_observations`, `payload_truncated`, `stale_proxy`, `measurement_basis_unclear`, or `encoding_artifact`.

End every user-facing report with a final non-empty line exactly equal to:

`Not investment advice.`
