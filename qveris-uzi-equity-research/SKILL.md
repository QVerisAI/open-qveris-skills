---
name: qveris-uzi-equity-research
description: QVeris-native adaptation of candidate 34, UZI-Skill. Use for A-share, Hong Kong, and US equity research notes, valuation-method audits, LHB or flow context, trap-risk reviews, data-quality checks, and IC-style memos that must use qveris_finance.* evidence, honest fallback, Markdown output, and no investment advice.
---

# QVeris UZI Equity Research

Use this skill to preserve UZI's broad equity-research, valuation, hot-money, and trap-risk review workflows while removing action-oriented conclusions and replacing scripts, persona scoring, and direct data routes with QVeris structured-data CAP evidence plus audited Web news/sentiment evidence.

Source record:

| Field | Value |
|---|---|
| Candidate number | 34 |
| Original repository | UZI-Skill |
| GitHub URL | https://github.com/wbh604/UZI-Skill |
| License | MIT |
| Evaluation recent activity | 2026-07-07 |
| Local source snapshot | `third_party/source_repos/34-uzi-skill` |
| Snapshot latest commit | `fce996c` on 2026-07-07 |

## Source Adaptation

- Preserve the original coverage surface: deep equity research, quick scans, valuation frameworks, LHB/hot-money context, trap-risk review, and IC-style memos.
- Remove persona voting, colorful action conclusions, browser fallbacks, local caches, and command scripts from runtime behavior.
- Convert DCF, comps, LBO, and 3-statement work into method and assumption audits only. Do not output target prices, upside/downside, or investment conclusions.
- Convert LHB and flow reads into conditional monitoring evidence; if QVeris specialty CAPs are absent or mismatched, mark them missing.
- Convert trap detection into evidence-backed risk review: flag observable data-quality or promotion-risk signals only when QVeris evidence supports them.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Execute every finance data call through this Skill's `scripts/qveris_finance_adapter.mjs`, or through a native wrapper that runs the byte-identical adapter; never call `/capabilities/query` directly from the workflow.
- Default natural-language output to Markdown, not a large JSON object or HTML report.
- Accept `dry_run`, `max_calls`, `max_age`, `budget_note`, `symbol`, `market`, and `review_type`; echo the effective controls.
- Read `references/qveris-finance-data-quality-rubric.md` before using any payload as evidence.
- Use `references/qveris-finance-retry-policy.md` for 5xx, fetch failures, 404s, payload truncation, and semantic mismatches.
- Build trace, call counts, retries, and timestamps only from saved `observed_calls`. Never invent an execution ID or planned call; use `execution_id=null` when an observed call returned no ID.
- Sanitize every output surface, including Evidence, Sources, prose, params, responses, and Trace. Strip provider names, provider API URLs, raw route/tool IDs, candidates, failover, credentials, models, personas, and routing metadata recursively; the Trace row remains exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`.
- Reject transport-success payloads that return the wrong entity, wrong market, wrong asset type, wrong date window, wrong fiscal period, too-thin bars, empty relevant fields, or corrupted text.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, trade triggers, automated execution plans, and "safe to trade" conclusions.
- Read and follow `references/qveris-web-news-sentiment-policy.md`. Never call `qveris_finance.news_fin_tagged` or `qveris_finance.sentiment_text_signals`; use its audited Web lane for issuer news and qualitative sentiment in every run mode, including benchmark and replay.

## Evidence Gate

- Resolve every issuer through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master`.
- For A-share requests, require returned exchange/listing evidence to match the requested mainland security. Reject HK-only, US-only, fund, index, or unrelated ordinary-share substitutions.
- Do not guess exchange suffixes from numeric tickers. If QVeris cannot resolve the symbol, mark `symbol_resolution_missing`.
- Require at least 2 observations before computing returns, trends, liquidity, volatility, drawdown, or correlation.
- Require statement periods and measurement basis to align before using valuation inputs.
- For every displayed derived value, include a `Derived Input Provenance` table with the exact header `| metric | formula | numerator | denominator | unit | currency | period_end | source_fields | execution_ids | status |`. If any input, unit, currency, period, source field, or execution ID is unavailable, mark the metric `unsupported` and do not calculate it.
- If an annual or FY statement request returns latest-quarter or TTM-shaped data, retry once with stricter documented period parameters after `cap-detail`; if still mismatched, mark the requested period missing.
- For CN/A-share requests, read the A-share availability matrix in `references/qveris-tool-map.md` before calling financials or valuation routes. Do not assume US-style IS/CF/derived-ratio support applies to A shares; unsupported or unverified CN financial layers must become `capability_unavailable` or `market_support_unverified`.
- Use LHB, large-order flow, lock-up, top-mover, concept, or sector specialty data only after `cap-detail` confirms the QVeris CAP and returned row semantics for the current run.
- When LHB or flow is explicitly requested, pass the logical `qveris_finance.*` name through the Skill-owned adapter so it resolves the live canonical CAP ID. If live catalog/detail resolution is unavailable, mark the layer `capability_unavailable` or `tool_runtime_missing`; never fall back to a dated static CAP ID.
- Use audited Web pages for issuer news and qualitative sentiment; keep QVeris cluster or structured-event evidence as a separate layer.
- Do not present trap-risk flags as proven fraud or as a trading instruction; present them as monitored evidence and missing fields.

## CAP Invocation

- Standardized CAP invocation is mandatory. A missing CAP or runtime becomes `capability_unavailable` or `tool_runtime_missing`; it never authorizes a legacy raw route.
- Use native `qveris_finance.*` tools only when that runtime applies the same Skill-owned adapter and returns a `qveris.finance-parameter-adaptation.v1` audit; otherwise use this Skill's CLI.
- If native tools are unavailable and the run is in this repository root, use: `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- Treat the Skill-owned CLI as the mandatory finance adapter: it resolves the live canonical CAP, filters and losslessly converts parameters, never copies sample values, permits at most three fully audited attempts, and validates the returned data rather than trusting the envelope `success` flag alone. A `success=false` envelope is usable only when an execution ID and non-empty required fields exist and issuer, market, date, period, freshness, and capability-specific semantic gates all pass. Record `envelope_success` and `contract_clean` separately in `qveris.finance-parameter-adaptation.v1`.
- When QVeris returns `full_content_file_url`, the adapter must fetch the HTTPS payload, validate that payload, record its content hash, and remove the signed URL. A missing or failed full-content fetch is rejected.
- If the Skill-owned scripts are missing and no native `qveris_finance.*` runtime exposes the identical adapter audit, mark `tool_runtime_missing`; do not use web, legacy providers, local scripts, browser automation, or invented data as fallback.
- Use `cap-search` only when the capability ID is uncertain.
- Use `cap-detail` before adding any unvalidated valuation, A-share specialty, flow, LHB, trap-risk, sentiment, or research-report capability to the run.
- Keep failed calls and rejected payloads in the trace appendix when they influence missing fields or fallback status.

## Workflows

1. Deep research note: resolve issuer, collect profile, quote/bars, statements, ratios, estimates, news/events, and data-quality status.
2. Valuation-method audit: list required inputs, validate each input, show which assumptions are supported, missing, stale, or period-mismatched.
3. LHB or flow context: call specialty CAPs only through live adapter resolution and current `cap-detail`; otherwise state that the LHB or flow layer is missing.
4. Trap-risk review: use validated news, event, bars, financial-quality, and specialty evidence to flag observed risk signals without making action recommendations.
5. Budget-limited run: perform identity, one requested 20/60-day bar window, the CN financial-availability check, and at most one explicitly requested specialty call. Expand to peers, news, research, events, or additional specialty discovery only after those core gates succeed.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a CAP returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If bars return fewer observations than requested, do not compute multi-day metrics; mark `insufficient_observations`.
- If specialty A-share data is unavailable or mismatched, return a partial research note with lower confidence rather than substituting non-QVeris structured-finance evidence. News and qualitative sentiment follow the separate audited Web policy.
- If trap-risk evidence is incomplete, state which signals are untested; do not fill with web rumors or user-provided claims unless labeled as unverified user input.

## Output Requirements

- Use level-2 Markdown headings exactly: `## Summary`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- Render the Trace Appendix with the exact parseable header `| tool_name | params | status | execution_id | fallback_used | missing_fields |`; use compact JSON values, one row per observed attempt, and no planned/not-called rows.
- For live, fresh, or E2E output, save and validate an `observed_calls.v1` sidecar whose calls record `request_kind=capabilities/query` and canonical `capability_id`; without a verified sidecar, place the unverified note before `## Trace Appendix` and emit only the exact header plus separator with no rows.
- Include `missing_fields`, `data_quality.status`, rejected payload reasons, stale fields, and suppressed fields.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- End user-facing reports with a final non-empty line that is exactly `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris structured-finance data sources, Web use outside the audited news/sentiment policy, browser automation, cookies, login state, external provider keys, dynamic data-package installs, local command pipelines, persona voting, automated trading, buy/sell triggers, target prices, upside/downside, rebalancing instructions, execution plans, or assertions that a security is safe to trade.

## References

- Use shared finance contract version `2026-07-29.1`; repository CI verifies the local rubric, retry policy, CAP registry, and output schema against `references/qveris-finance-shared-manifest.json` hashes.
- Read `references/qveris-tool-map.md` before choosing calls.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Read `references/qveris-web-news-sentiment-policy.md` before collecting news or qualitative sentiment.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
