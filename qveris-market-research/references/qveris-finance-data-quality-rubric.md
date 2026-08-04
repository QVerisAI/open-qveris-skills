# QVeris Finance Data-Quality Rubric

Use this rubric for every QVeris finance skill before turning a CAP payload into evidence.
Read `qveris-finance-retry-policy.md` with this rubric when a CAP call fails, returns the wrong shape, or needs a fallback.

## Canonical CAP Invocation

- For every finance skill carrying this policy, each finance data call must use a native `qveris_finance.*` tool or `POST /capabilities/query` / `cap-query` with a canonical CAP ID. Legacy `/search` + `/tools/execute`, generic `discover` + `call`, and raw tool IDs are not finance fallbacks.
- If the standardized CAP runtime or requested canonical CAP is unavailable, mark `tool_runtime_missing` or `capability_unavailable` and narrow the report. Do not recover by selecting a raw provider route.
- A saved observed call must record `request_kind=capabilities/query`, the canonical `capability_id`, and the logical `qveris_finance.*` `tool_name`. The saved response `capability_id` must equal the call record.

## Evidence Status

- `complete`: primary QVeris evidence is available, fresh enough for the request, and passes identity, window, and shape checks.
- `partial`: some primary evidence is unavailable, stale, or rejected, but remaining QVeris evidence can support a narrower statement.
- `proxy_only`: only weaker proxy evidence is usable; keep conclusions low confidence and label the proxy clearly.
- `insufficient`: evidence is missing or rejected, so the requested conclusion is not supported.
- `limited`: runtime or payload quality was materially constrained, but some evidence may still support a narrower statement. Use this mainly as `data_quality.status`; prefer `partial`, `proxy_only`, or `insufficient` for user-facing evidence status.
- `budget_limited`: the user or runtime call budget prevented the minimum useful evidence set. Use this as `data_quality.status` and do not infer missing facts.

## Data-First Envelope Rule

- The top-level QVeris `success` flag is a transport/envelope diagnostic, not evidence validity. Accept `success=false` data only when the response has a real execution ID, non-empty values for every required output field (including documented aliases), and all identity, market, date, fiscal-period, freshness, and capability-specific semantic checks pass.
- Preserve `envelope_success` and `contract_clean` in the adaptation audit. Never rewrite a dirty envelope into an unqualified provider success claim.
- If a response contains `full_content_file_url`, fetch the HTTPS object before shape and semantic validation, hash the fetched content, and remove the signed URL from all persisted output. A failed, non-HTTPS, missing, or malformed full-content fetch is unusable evidence.
- Reject structurally populated but semantically empty flows when cross-border, northbound, or sector-flow observations are all zero; reject text-sentiment coverage without a signal/cue/score/label; reject daily A-share large-order rows dated on a weekend.

## Hard Rejects

- Reject provider and routing leakage anywhere in the output or observed-call artifact, including prose, Evidence, Sources, URLs, params, nested response fields, and Trace. Remove provider names, provider API URLs, raw route IDs, candidates, failover state, credentials, and raw tool IDs recursively.
- Reject report-wide fact contradictions. Compute a canonical fact record once, including technical relations such as `close_vs_ma20` and `close_vs_ma60`, and render every summary/body occurrence from that record. If two sections disagree, neither relation may be presented until reconciled.
- Reject `changed` or `unchanged` comparison claims unless the same comparison record includes `baseline_as_of`, `baseline_value`, `current_as_of`, `current_value`, and `comparison_basis`. Without that evidence use `unsupported`, not a directional comparison status.
- Reject direct claims that capex or capital investment compressed net income unless an aligned depreciation, amortization, impairment, disposal, or write-down bridge supports the profit effect. Capex may be described as a cash-investing or free-cash-flow item without implying a direct net-income cause.
- Reject displayed derived financial values unless their row records `formula`, `numerator`, `denominator`, `unit`, `currency`, `period_end`, `source_fields`, `execution_ids`, and `status`. If any required input provenance is unavailable, mark the metric unsupported and do not calculate it.
- Reject unvalidated evidence placement. `Evidence Used`, `Factor Table`, and `Primary Evidence` may contain only validated evidence that can support the stated claim. Invalid, failed, rejected, unavailable, or weak-relevance CAPs belong only in `Data Quality And Missing Fields`, `missing_fields`, or `Trace Appendix`.
- Reject removed capability evidence. `NEWS.DEDUP_CLUSTER`, `MACRO.ACTUAL_VS_FORECAST`, and `FLOW.SECTOR_CAPITAL` are not primary evidence unless a fresh `cap-detail` confirms availability in the current run. If unavailable, mark `capability_unavailable` or `not_called`; do not list them as evidence.
- Reject identity mismatches. Returned symbol, company name, exchange, market, asset type, index name, or benchmark must match the requested entity. Mark mismatches as `semantic_mismatch`.
- Reject missing identity proof for entity-scoped requests. If a request names a security but the payload has no matching symbol/code or no explicitly supplied expected issuer name, mark `semantic_entity_missing`; do not infer identity from the request alone.
- Reject wrong benchmark payloads. If an index or benchmark request such as `SPX` returns a non-index security, do not use it as index evidence.
- Reject entity-mixed news or research. If a payload mixes the requested issuer with another entity, such as a company named like the requested ticker but operating in a different business, mark `entity_mix` and keep it out of sentiment, catalyst, and risk conclusions.
- Reject weak analyst-report relevance. Academic papers, technical articles, broad industry pages, or weak text matches are not sell-side analyst reports. Mark `weak_relevance` and use them only as low-confidence context, not as core analyst evidence.
- Reject thin time windows. For a multi-day bars request, fewer than 2 observations cannot support return, trend, correlation, realized volatility, drawdown, liquidity, or VaR calculations.
- Reject unaligned statements. IS, BS, CF, and segment data must share fiscal year, fiscal period, and period ending before appearing in an aligned table.
- Reject requested-period mismatches. If the request asks for a specific annual/FY period and a statement CAP returns a latest-quarter or TTM-shaped payload instead, do not use it as evidence for the requested period.
- Reject missing period proof. When a request specifies a fiscal year or period, require an explicit fiscal label or period/report end date in the returned data; do not infer the period from request parameters.
- Reject missing date proof for explicit date-window requests. Require a returned trade, publication, release, event, report, period-end, or as-of date that can be checked against the requested window.
- Treat an A-share `YYYY-12-31` report date as a valid annual/FY representation when the requested fiscal year matches. Do not treat quarter-end dates such as `YYYY-03-31` as annual.
- Interpret naive A-share timestamps in `Asia/Shanghai`. For daily-flow semantics, validate dates against the frozen exchange-session set for the requested window; weekend-only logic is a fallback, not proof that a weekday was a trading session.
- Reject inconsistent statement fields. If same-period CF net income materially conflicts with IS net income, exclude CF from aligned tables and mark `statement_semantic_mismatch`.
- Reject stale same-day evidence. Monthly, delayed, or stale rates/index data may be used only as lagged proxy evidence, not as same-day market confirmation.
- Reject text-encoding artifacts. If company names, industry labels, event titles, news snippets, or research titles contain mojibake or replacement-character artifacts, do not quote or summarize those text fields as evidence. Keep any still-valid numeric/date fields only when identity and window checks pass, and mark the corrupted text fields as `encoding_artifact`.

## Material Mismatch Thresholds

Use these thresholds until the finance team replaces them with a stricter house standard:

| Check | Default threshold | Action |
|---|---:|---|
| Same-period CF net income vs IS net income | greater than 5% relative difference and greater than USD 100 million absolute difference | Reject CF from aligned tables and mark `statement_semantic_mismatch`. |
| Same-period revenue across statement-like payloads | greater than 3% relative difference and greater than USD 100 million absolute difference | Reject the conflicting payload from aligned tables. |
| Period ending date | any mismatch for aligned IS/BS/CF tables | Reject the unmatched payload for aligned analysis. |
| Fiscal year or fiscal period label | any mismatch for aligned tables | Reject the unmatched payload for aligned analysis. |

When a field is cumulative in one payload and point-in-time in another, do not normalize it by guesswork. Mark `measurement_basis_unclear` unless a QVeris field explicitly documents the basis.

## Fallback Boundaries

- Treat transport success as insufficient by itself. A successful payload that fails this rubric is unusable evidence, not a fallback success.
- While `temporary_web_override.v1` is active for the six benchmarked Skills, do not call `news_fin_tagged` or `sentiment_text_signals`; use the audited Web lane for issuer news and qualitative sentiment. Scope any supported sentiment label to the qualifying source sample and never count Web evidence as CAP success.
- Require issuer relevance for every news, research, or analyst-report row before summarizing it. Match returned symbol, company name, exchange, market, ISIN, or another explicit issuer identity; otherwise mark `entity_mix`, `overbroad_news`, or `weak_relevance`.
- Use `event_calendar_macro` as macro-event context only. Do not present it as actual-vs-forecast macro surprise unless a callable actual-vs-forecast CAP succeeds.
- Use VIX, rates, or liquid ETF bars as market-regime proxies only when primary index or breadth evidence fails and the proxy passes identity/window checks.
- Use trailing manual valuation calculations only when required QVeris fields are present. Label them as calculated trailing inputs; do not infer forward multiples without consensus or derived-ratio evidence.
- When a statement period mismatch occurs, retry once with stricter documented parameters if `cap-detail` shows they are supported, such as `fiscal_year`, `fiscal_period`, `period_type`, `period`, and `limit`. If the retried payload still does not match, mark the requested statement missing with a product-readable reason such as `FY2025 cash flow missing due to period mismatch`.
- Summarize long payloads in full-workflow reports. If QVeris returns truncation metadata, unusually long text, or rows too large for a compact table, mark `payload_summarized` or `payload_truncated`; create a single-capability note only when the user asks to inspect that payload.

## Trace And Output

- Build trace, call counts, retry counts, and call timestamps only from the runtime's saved `observed_calls`. Never infer them from a plan, expected workflow, prose notes, or the number of requested securities.
- Add one trace row per observed call attempt, including retries. Do not add planned, skipped, budget-blocked, or merely discovered capabilities to `qveris_trace`; list those as missing or required next calls instead.
- For every report labeled live, fresh, or E2E, save an independent `observed_calls.v1` sidecar artifact containing each sanitized response, response SHA-256, observed timestamp, `request_kind=capabilities/query`, canonical `capability_id`, params, returned execution ID, and derived trace row. Validate the report Trace Appendix against that artifact row-for-row and require the recorded capability ID to match the saved response. A static fixture or Markdown table alone is not proof of observation.
- If an older report has no independent observed-calls artifact, label its trace unverified and use an empty trace table; do not preserve or translate unverifiable IDs, retries, counts, or results as observed facts.
- Copy `execution_id` only when the observed call returned it. Otherwise emit JSON `null` / Markdown `null`; never synthesize an ID. Omit call timestamps unless the observed call returned one and the report contract explicitly requests it.
- Use this exact sanitized trace contract in every finance skill: `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`. Allow only `qveris_finance.*` in `tool_name`; strip capability aliases, provider, route, candidate, failover, credential, model, and wrapper metadata.
- Use `status=success` only for an observed transport-success call, `status=failed` for an observed call failure, and `status=rejected` when an observed transport-success payload fails semantic validation. Evidence acceptance remains separate from call status.
- Render Markdown Trace Appendix tables with this exact header and order: `| tool_name | params | status | execution_id | fallback_used | missing_fields |`. Markdown uses the same `fallback_used` field name as JSON; encode `params` as compact JSON and `missing_fields` as a JSON array so the row is machine-parseable.
- Default to a Markdown user report with the sanitized trace table. Put full machine-readable `qveris_trace` JSON only in an appendix, schema fixture, or when the user asks for it.
- Every rejected payload must appear in `data_quality.warnings` or `missing_fields` with a product-readable reason such as `not_called`, `failed`, `rejected`, `capability_unavailable`, `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, `insufficient_observations`, `overbroad_news`, `payload_truncated`, `stale_proxy`, `statement_semantic_mismatch`, or `encoding_artifact`.
- Never let a failed or rejected CAP appear as supporting evidence merely because it was called. Trace proves the call happened; evidence proves the payload survived validation.
- End user-facing reports with a final non-empty line that is exactly `Not investment advice.`. Do not add a Chinese, bilingual, translated, or prefixed disclaimer line.
