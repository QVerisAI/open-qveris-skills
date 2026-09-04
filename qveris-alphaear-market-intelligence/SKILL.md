---
name: qveris-alphaear-market-intelligence
description: QVeris-native adaptation of candidate 42, Awesome Finance Skills / AlphaEar. Use for stock lookup, price/fundamental context, finance news, sentiment coverage checks, signal-monitor updates, and market-intelligence reports that must use qveris_finance.* evidence, honest fallback, Markdown output, traceability, and no investment advice.
---

# QVeris AlphaEar Market Intelligence

Use this skill to preserve AlphaEar's stock, news, sentiment, signal-tracking, and reporting workflows while replacing direct public feeds, local databases, model downloads, and prediction tooling with QVeris structured-data CAP evidence plus audited Web news/sentiment evidence.

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

## Source Adaptation

- Preserve the original AlphaEar intent: ticker lookup, stock price context, financial fundamentals, finance news, sentiment coverage checks, signal evolution, and structured reporting.
- Treat original scripts, local models, local databases, prediction-market feeds, and time-series forecast logic as migration context only.
- Convert forecasts and "investment signal" wording into descriptive monitoring: evidence can show what changed, but not whether to act.
- Use audited opened Web pages for issuer news and qualitative sentiment; do not use the disabled tagged-news or text-sentiment CAPs.
- Keep reports user-readable by default; put full machine-readable trace JSON only in the appendix, fixtures, or when explicitly requested.

## Runtime Contract

- Use `qveris_finance.*` CAP tools and `QVERIS_API_KEY` for structured finance data. The only non-CAP exception is the audited Web news/sentiment lane.
- Execute every finance data call through this Skill's `scripts/qveris_finance_adapter.mjs`, or through a native wrapper that runs the byte-identical adapter; never call `/capabilities/query` directly from the workflow.
- Default natural-language output to Markdown, not a large JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note.
- Read `references/qveris-finance-data-quality-rubric.md` before using any payload as evidence.
- Read `references/qveris-workflow-semantic-guards.md` before any derived, comparative, ranking, sentiment, or multi-layer workflow. Use `scripts/qveris_workflow_guards.mjs` for the applicable pre-prose gates.
- Use `references/qveris-finance-retry-policy.md` for 5xx, fetch failures, 404s, payload truncation, and semantic mismatches.
- Build trace, call counts, retries, and timestamps only from saved `observed_calls`. Never invent an execution ID or planned call; use `execution_id=null` when an observed call returned no ID.
- Sanitize every output surface, including Evidence, Sources, prose, params, responses, and Trace. Strip provider names, provider API URLs, raw route/tool IDs, candidates, failover, credentials, models, and routing metadata recursively; the Trace row remains exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`.
- Reject transport-success payloads that return the wrong entity, wrong benchmark, wrong date window, wrong fiscal period, too-thin bars, empty relevant fields, or corrupted text.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, trade triggers, automated execution plans, and prediction commitments.
- Read and follow `references/qveris-web-news-sentiment-policy.md`. Never call `qveris_finance.news_fin_tagged` or `qveris_finance.sentiment_text_signals`; use its audited Web lane in every run mode, including benchmark and replay.

## Evidence Gate

- Freeze one decision context before collection. Set `effective_cutoff=min(T0,CUT_OFF)` when both exist; never replace a supplied T0/CUT_OFF/FY/FQ/D30 binding with the current time, a later market close, or the latest returned record.
- Resolve every issuer through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master` before quoting facts.
- Require every entity-scoped evidence row, not merely one row in the payload, to prove the requested symbol or issuer and market. Missing identity is `semantic_entity_missing`; mixed or mismatched rows are rejected.
- Require returned symbol, company name, exchange, market, asset type, and currency to match the request.
- Require at least 2 observations before computing returns, trends, liquidity, volatility, drawdown, or correlation. Sort and deduplicate dated prices first; `N` prices yield exactly `N-1` adjacent returns, and the report must state both counts.
- Require financial statements and derived ratios to match fiscal year, fiscal period, period end, and basis.
- If an annual or FY statement request returns latest-quarter or TTM-shaped data, retry once with stricter documented period parameters after `cap-detail`; if still mismatched, mark the requested period missing.
- Treat matching `YYYY-12-31` as valid A-share annual/FY proof. Do not treat a quarter end as annual. If FQ or single-quarter/cumulative basis is absent, do not describe the financial layer as fully comparable.
- Use only issuer-matched, in-window opened Web pages for news. Qualitative sentiment is limited to `positive`, `negative`, `mixed`, or `insufficient` and requires at least two independent qualifying sources.
- Even with two or more sources, describe sentiment only as the result for the qualifying source sample. Never generalize a small issuer-news sample to overall market sentiment, investor consensus, or likely price direction.
- Keep Web provenance in `web_trace`; it never counts as QVeris CAP success.
- Emit `changed` or `unchanged` only from a comparison record containing `baseline_as_of`, `baseline_value`, `current_as_of`, `current_value`, and `comparison_basis`. If any field is absent, set the comparison status to `unsupported`.
- Rank or compare candidates only when all rows share the same window and every required factor/input. If a common factor or finite non-zero denominator is missing, output an unranked coverage table and `ranking_unsupported`.
- Treat removed or unverified routes such as news clusters, prediction-market feeds, and forecast models as `capability_unavailable` unless current `cap-detail` confirms a QVeris finance CAP.

## CAP Invocation

- Standardized CAP invocation is mandatory. A missing CAP or runtime becomes `capability_unavailable` or `tool_runtime_missing`; it never authorizes a legacy raw route.
- Use native `qveris_finance.*` tools only when that runtime applies the same Skill-owned adapter and returns a `qveris.finance-parameter-adaptation.v1` audit; otherwise use this Skill's CLI.
- If native tools are unavailable and the run is in this repository root, use: `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- Treat the Skill-owned CLI as the mandatory finance adapter: it resolves the live canonical CAP, filters and losslessly converts parameters, never copies sample values, permits at most three fully audited attempts, and validates the returned data rather than trusting the envelope `success` flag alone. A `success=false` envelope is usable only when an execution ID and non-empty required fields exist and issuer, market, date, period, freshness, and capability-specific semantic gates all pass. Record `envelope_success` and `contract_clean` separately in `qveris.finance-parameter-adaptation.v1`.
- When QVeris returns `full_content_file_url`, the adapter must fetch the HTTPS payload, validate that payload, record its content hash, and remove the signed URL. A missing or failed full-content fetch is rejected.
- If the Skill-owned scripts are missing and no native `qveris_finance.*` runtime exposes the identical adapter audit, mark structured finance layers `tool_runtime_missing`; do not use Web, legacy providers, local databases, or invented data to replace those structured layers. The separate audited Web lane remains limited to news/sentiment.
- Use `cap-search` only when the capability ID is uncertain.
- Use `cap-detail` before adding any unvalidated sentiment, cluster, prediction, specialty, or alternate-data capability to the run.
- Keep failed calls and rejected payloads in the trace appendix when they influence missing fields or fallback status.

## Workflows

1. Freeze the decision context and runtime bindings, then run identity, temporal, and requested-period guards before deriving any claim.
2. Select output mode before collection. Use `full_note` only when identity, requested-window price evidence, requested fundamental/event layers, and audited issuer-relevant Web news/sentiment coverage all pass; otherwise use `coverage_monitor`.
3. Market-intelligence note: resolve issuer, collect profile, quote/bars, fundamentals, audited Web news context, qualitative sentiment coverage if available, and monitoring read.
4. Sentiment coverage check: run the sentiment guard; if fewer than two independent source owners qualify, set sentiment to `insufficient`. Otherwise prefix the conclusion with the qualifying-source sample size and retain supported/conflicting cues.
5. Signal-monitor update: compare new validated evidence against the user's prior thesis or watch item, then label evidence as changed/unchanged/unsupported without action language.
6. Before a comparison, ranking, return series, or factor summary, run the applicable deterministic workflow guard. A rejected result authorizes only an unranked/unsupported disclosure, never an improvised calculation.
7. Build a claim ledger from accepted evidence IDs, entity, period/window, calculation record, and guard result. Render Summary, Evidence, and Analysis only from this ledger.
8. Report assembly: put only validated layers in Evidence. In `coverage_monitor`, open the Summary with the unavailable full-note layers and keep unverified layers exclusively in Data Quality And Missing Fields.
9. Budget-limited run: call identity/profile first, then the minimum requested evidence; omit optional sentiment, news, or ratios when `max_calls` is too low.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a CAP returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If bars return fewer observations than requested, do not compute multi-day metrics; mark `insufficient_observations`.
- If Web collection or verification fails, mark news/sentiment coverage missing; never revive the disabled CAPs or infer a numeric score.
- If a successful payload is semantically wrong, exclude it from evidence and record `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, or `encoding_artifact`.
- If `max_calls` blocks the minimum useful workflow, return a budget-limited report rather than filling gaps.

## Output Requirements

- Use level-2 Markdown headings exactly: `## Summary`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- State `report_mode: full_note` or `report_mode: coverage_monitor` in Summary.
- Render the Trace Appendix with the exact parseable header `| tool_name | params | status | execution_id | fallback_used | missing_fields |`; use compact JSON values, one row per observed attempt, and no planned/not-called rows.
- For live, fresh, or E2E output, save and validate an `observed_calls.v1` sidecar whose calls record `request_kind=capabilities/query` and canonical `capability_id`; without a verified sidecar, place the unverified note before `## Trace Appendix` and emit only the exact header plus separator with no rows.
- Include `missing_fields`, `data_quality.status`, rejected payload reasons, stale fields, and suppressed fields.
- Include `effective_cutoff`, price observation/return counts for return-based claims, and `workflow_guard_status`. Never show a ranking when the guard returned `ranking_unsupported`.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- End user-facing reports with a final non-empty line that is exactly `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris structured-finance data sources, Web use outside the audited news/sentiment policy, browser automation, cookies, login state, external provider keys, dynamic data-package installs, local model downloads, automated trading, prediction-market execution, buy/sell triggers, target prices, upside/downside, rebalancing instructions, or execution plans.

## References

- Use shared finance contract version `2026-07-29.1`; repository CI verifies the local rubric, retry policy, CAP registry, and output schema against `references/qveris-finance-shared-manifest.json` hashes.
- Read `references/qveris-tool-map.md` before choosing calls.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Read `references/qveris-web-news-sentiment-policy.md` before collecting news or qualitative sentiment.
- Read `references/qveris-workflow-semantic-guards.md` before comparisons, rankings, return calculations, sentiment aggregation, or final claim assembly.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
