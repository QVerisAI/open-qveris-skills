# QVeris Finance Retry Policy

Use this shared policy for every QVeris finance skill in this repository.


## Skill-owned Adapter Preflight

Route finance CAP calls through the active business Skill's `{baseDir}/scripts/qveris_finance_tool.mjs cap-query`. Each business Skill carries a byte-identical standalone adapter bundle; `qveris-official` is not the finance adaptation layer. On every execution it must:

1. Read the live finance catalog and live cap-detail, then resolve the requested `qveris_finance.*` name to the current canonical CAP ID instead of a static ID table.
2. Build an allow-list from live parameter definitions; drop undocumented optional inputs and refuse execution if no enforceable parameter schema is available.
3. Never copy `sample_parameters`. Fill required values only from explicit business context or a lossless equivalent input name, and refuse execution when required values remain missing.
   - Treat an explicitly supplied `underlying` or `underlying_symbol` as the same security only when the live contract requires `symbol`; never change the instrument.
   - After a provider explicitly reports a missing `granularity`, use `daily` only for a request that already contains one exact `date` and whose live enum includes `daily`.
   - After a provider explicitly rejects `period` with quarter-end codes, map an explicit `Q1/Q2/Q3/Q4/FY` context to `0331/0630/0930/1231`. Keep the result rejected if the corrected call still lacks data, fields, or period identity.
4. Permit only equivalent mainland-security encodings (`.SH`, `.SS`, the same bare six-digit code; `.SZ`, the same bare code). Never replace the security entity.
5. Make at most three actual attempts using legal original parameters, a required/semantic minimum, and an error-guided or equivalent-code correction. An error without a parameter clue does not authorize guessing.
6. Stop immediately for missing or wrong entity proof, missing or wrong requested-window date proof, missing or wrong fiscal-period proof, wrong market, future data, stale real-time data, all-zero flow, empty sentiment semantics, or non-trading-date daily flow. Interpret A-share dates in `Asia/Shanghai` and prefer a frozen exchange-session set over weekday inference. Do not use the envelope `success` flag as the sole result gate: a `success=false` response may pass only under the shared data-first rule; a `success=true` response may still be rejected.
7. Fetch and validate an HTTPS `full_content_file_url` before judging the payload. A failed full-content fetch is not a retry success and the signed URL must never be persisted.
8. Persist `qveris.finance-parameter-adaptation.v1`, detail/parameter/response/content hashes, `envelope_success`, `contract_clean`, exact attempts, `final_params`, `observed_calls`, and the six-field `qveris_trace`; recursively sanitize provider/route/candidate/credential/signed-URL metadata.

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

- Record original attempts and retries only when they exist in saved `observed_calls`, with one row per attempt and the same `qveris_finance.*` tool name.
- Persist every live/E2E attempt in the independent observed-calls artifact before rendering retry or fallback claims in Markdown.
- Derive retry and observed-call counts from those rows; never state that a retry occurred merely because this policy allowed one.
- Use the exact shared fields `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`. Copy an execution ID only when the call returned one; otherwise use `null`.
- Set `fallback_used=true` when a fallback capability or proxy class supports the final claim.
- Keep raw provider route names out of user prose, `qveris_trace`, and `data_quality`.
- Use status labels from `qveris-finance-data-quality-rubric.md`: `complete`, `partial`, `proxy_only`, or `insufficient`.

## Stop Conditions

- Stop after 3 total adapter attempts (at most 2 retries) for one capability in one report.
- Stop immediately for confirmed `404` unless `cap-detail` discovers the capability under a different ID.
- Stop immediately for semantic mismatches; do not use a wrong-but-successful payload.
- When retries would exceed `max_calls`, return a budget-limited report instead of silently dropping trace.
