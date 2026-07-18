# QVeris Finance Retry Policy

Use this shared policy for every QVeris finance skill in this repository.


## Public Adapter Preflight

When the repository CLI is available, route finance CAP calls through `qveris-official/scripts/qveris_tool.mjs cap-query`. On every execution it must:

1. Read the live finance catalog and live cap-detail, then resolve the requested `qveris_finance.*` name to the current canonical CAP ID instead of a static ID table.
2. Build an allow-list from live parameter definitions; drop undocumented optional inputs and refuse execution if no enforceable parameter schema is available.
3. Fill only documented required non-identity values from cap-detail defaults/examples, coerce declared types, and never substitute a sample security for a missing issuer identity.
4. Normalize A-share symbols (`.SS` to `.SH`, preserve `.SH/.SZ`, infer exchange for unambiguous six-digit codes) and reject symbol/market conflicts or ambiguous exchanges.
5. Retry at most once after a parameter-class failure: remove an optional parameter named by the error, otherwise retry with required-plus-identity minimal params. Do not retry semantic mismatches or generic provider failures in this adapter.
6. On an invalid CAP response, refresh the live catalog and retry only if the current canonical CAP ID changed.
7. Persist the exact transmitted params and every observed attempt in `final_params`, `observed_calls`, and the six-field `qveris_trace`; recursively sanitize provider/route/candidate metadata.

## Retry Classes

| Failure class | Examples | Retry rule | Output rule |
|---|---|---|---|
| Transient transport | `fetch failed`, timeout, connection reset | Retry at most 2 times, preferably serially and with the same params unless the error indicates params are invalid. | If all attempts fail, mark the field missing and include each attempt in trace or `data_quality.warnings`. |
| Transient provider | HTTP `5xx`, provider error, `all_candidates_failed` | Retry at most 2 times. If the same capability repeatedly fails, stop calling it for that report. | Use the documented fallback capability when one exists; otherwise output a partial report. |
| Invalid capability | HTTP `404`, `invalid_capability`, capability not found | Do not blind retry. Run `cap-detail` or `cap-search` only if the capability is expected but uncertain. | Remove from the primary path unless discovery confirms it; mark `capability_unavailable`. |
| Parameter contract error | Missing required param, validation error, bad enum | Inspect `cap-detail` once and retry only with documented params. | If corrected params fail, mark `parameter_contract_unresolved`. |
| Semantic mismatch | Wrong asset, wrong benchmark, wrong fiscal period, impossible payload shape | Do not retry as if transient. For statement-period mismatch only, inspect `cap-detail` and retry once with stricter documented period fields. | Hard reject the payload and mark `semantic_mismatch`, `period_mismatch`, or `statement_semantic_mismatch`. |
| Thin or truncated payload | One bar for a multi-day window, truncated news, stale rates | Do not retry unless a documented pagination/window param exists. | Use only as latest-point, qualitative, stale, or proxy evidence as appropriate. |

## Trace Requirements

- Record original attempts and retries with the same `qveris_finance.*` tool name.
- Set `fallback_used=true` when a fallback capability or proxy class supports the final claim.
- Keep raw provider route names out of user prose, `qveris_trace`, and `data_quality`.
- Use status labels from `qveris-finance-data-quality-rubric.md`: `complete`, `partial`, `proxy_only`, or `insufficient`.

## Stop Conditions

- Stop after 2 failed retries for one capability in one report.
- Stop immediately for confirmed `404` unless `cap-detail` discovers the capability under a different ID.
- Stop immediately for semantic mismatches; do not use a wrong-but-successful payload.
- When retries would exceed `max_calls`, return a budget-limited report instead of silently dropping trace.
