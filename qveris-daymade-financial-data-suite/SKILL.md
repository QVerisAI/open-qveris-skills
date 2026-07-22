---
name: qveris-daymade-financial-data-suite
description: QVeris-native adaptation of candidate 37, Daymade Financial Suite. Use for financial data collection, US equity data packs, China A-share news reads, research/news/event structuring, sector or pharma daily reports, and pipeline-style finance outputs that must use qveris_finance.* evidence, strict missing-field handling, Markdown output, and no investment advice.
---

# QVeris Daymade Financial Data Suite

Use this skill to preserve Daymade's financial-data collection and daily-report pipeline patterns while replacing direct upstream SDKs, public endpoints, credential setup, and chat-delivery tooling with QVeris finance CAP evidence.

Source record:

| Field | Value |
|---|---|
| Candidate number | 37 |
| Original repository | Daymade Financial Suite |
| GitHub URL | https://github.com/daymade/claude-code-skills |
| License | MIT |
| Evaluation recent activity | 2026-07-06 |
| Local source snapshot | `third_party/source_repos/37-daymade-claude-code-skills` |
| Snapshot latest commit | `d2d566f` on 2026-07-06 |

## Source Adaptation

- Preserve the original pipeline intent: collect financial data, validate completeness, structure news/research/events, and produce sector or industry daily reports.
- Keep Daymade's strongest guardrail: no default values for missing financial fields. Missing fields stay missing and are visible to downstream users.
- Replace original direct data SDKs, public quote endpoints, credential installers, and delivery scripts with QVeris CAP calls only.
- Convert structured-news and research workflows to QVeris evidence tables with issuer relevance, date-window checks, and explicit missing fields.
- Convert industry daily reports into monitoring reads; do not create rankings or action-oriented conclusions without comparable validated evidence.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Execute every finance data call through this Skill's `scripts/qveris_finance_adapter.mjs`, or through a native wrapper that runs the byte-identical adapter; never call `/capabilities/query` directly from the workflow.
- Default natural-language output to Markdown, not a large JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, `budget_note`, `symbols`, `market`, `sector`, and `report_date`; echo the effective controls.
- Read `references/qveris-finance-data-quality-rubric.md` before using any payload as evidence.
- Use `references/qveris-finance-retry-policy.md` for 5xx, fetch failures, 404s, payload truncation, and semantic mismatches.
- Build trace, call counts, retries, and timestamps only from saved `observed_calls`. Never invent an execution ID or planned call; use `execution_id=null` when an observed call returned no ID.
- Sanitize every output surface, including Evidence, Sources, prose, params, responses, and Trace. Strip provider names, provider API URLs, raw route/tool IDs, candidates, failover, credentials, and routing metadata recursively; the Trace row remains exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`.
- Treat transport success as insufficient until identity, window, period, shape, freshness, and relevance checks pass.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, trade triggers, automated execution plans, and delivery-channel instructions.

## Evidence Gate

- Resolve every issuer through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master`.
- Require market, exchange, asset type, currency, and date window to match the request.
- Preserve sign conventions only when QVeris explicitly documents them. If a field basis is unclear, mark `measurement_basis_unclear`.
- For aligned financial packs, require IS, BS, CF, ratios, estimates, and market data to share issuer identity, fiscal year, fiscal period, and period ending date.
- Reject same-period statement semantic conflicts. If CF net income materially conflicts with IS net income under the shared rubric thresholds, exclude CF from aligned tables and mark `statement_semantic_mismatch`.
- Apply the canonical valuation field map in `references/qveris-tool-map.md` before marking valuation fields missing; do not treat aliases such as `pe_ttm` and `pe_ratio` as different facts without checking basis.
- Build an aligned-statement table before deriving any cross-statement ratio. For every IS/BS/CF value include canonical field, value, currency, period end, fiscal period, period type, measurement basis, and source field. Keep unaligned rows outside the table.
- Separate cash-flow reconciliation from operating-quality ratios. First reconcile CF net income to IS net income; only after that gate passes may CF-derived quality ratios be calculated.
- Treat capex as a direct cash-investing/free-cash-flow input only. Do not say capital investment compressed net income unless an aligned depreciation, amortization, impairment, disposal, or write-down bridge supports the profit effect; otherwise describe the observations without causal wording.
- If a requested annual/FY period returns latest-quarter or TTM-shaped data, retry once with stricter documented parameters after `cap-detail`; if still mismatched, mark the requested field missing.
- Use analyst or research rows only after issuer, report type, and date fields pass validation. Suppress recommendation and target fields.
- Treat tagged news as qualitative background only unless QVeris sentiment, cluster, or structured event evidence succeeds.
- Treat A-share specialty, research, pharma-sector, and industry-daily fields as conditional unless `cap-detail` confirms a callable QVeris finance CAP with matching fields.

## CAP Invocation

- Standardized CAP invocation is mandatory. A missing CAP or runtime becomes `capability_unavailable` or `tool_runtime_missing`; it never authorizes a legacy raw route.
- Use native `qveris_finance.*` tools only when that runtime applies the same Skill-owned adapter and returns a `qveris.finance-parameter-adaptation.v1` audit; otherwise use this Skill's CLI.
- If native tools are unavailable and the run is in this repository root, use: `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- Treat the Skill-owned CLI as the mandatory finance adapter: it resolves the live canonical CAP, filters and losslessly converts parameters, never copies sample values, permits at most three fully audited attempts, and validates the returned data rather than trusting the envelope `success` flag alone. A `success=false` envelope is usable only when an execution ID and non-empty required fields exist and issuer, market, date, period, freshness, and capability-specific semantic gates all pass. Record `envelope_success` and `contract_clean` separately in `qveris.finance-parameter-adaptation.v1`.
- When QVeris returns `full_content_file_url`, the adapter must fetch the HTTPS payload, validate that payload, record its content hash, and remove the signed URL. A missing or failed full-content fetch is rejected.
- If the Skill-owned scripts are missing and no native `qveris_finance.*` runtime exposes the identical adapter audit, mark `tool_runtime_missing`; do not use web, legacy providers, SDKs, credential installers, or invented data as fallback.
- Use `cap-search` only when the capability ID is uncertain.
- Use `cap-detail` before adding any unvalidated A-share news, research-report, event, industry, sector, or pharma specialty capability to the run.
- Keep failed calls and rejected payloads in the trace appendix when they influence missing fields or fallback status.

## Workflows

1. Financial data pack: resolve issuer, collect quote/bars, statements, ratios, estimates, and event context; output missing fields instead of defaults.
2. News/research structuring: collect tagged news, research rows when validated, and event calendar context; attach `issuer_relevance`, `row_type`, and `why_included` to every row. Put weak-relevance rows in background only, never issuer catalyst evidence.
3. A-share news read: resolve full exchange suffix, collect QVeris news/events only, and mark unsupported source-specific feeds as `capability_unavailable`.
4. Pharma or sector daily report: define the requested sector/universe, validate each symbol, collect quote/bars and news/events, and avoid unsupported heat/flow claims.
5. Budget-limited run: prioritize identity, requested core data, and data-quality trace; skip optional research, sentiment, or sector breadth when calls are limited.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a CAP returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If a field is unavailable, return `null` or mark it in `missing_fields`; never use a default such as beta, growth, margin, or rate.
- If a successful payload fails period, identity, source-shape, or relevance validation, exclude it from evidence and mark the reason.
- If sector or pharma specialty data is unavailable, return a partial daily report with lower confidence rather than substituting non-QVeris data.

## Output Requirements

- Use level-2 Markdown headings exactly: `## Summary`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- For financial packs, include the aligned-statement table and a separate reconciliation table; never imply three-statement alignment from period labels alone.
- For sector/pharma reports, include `issuer_relevance`, `row_type`, and `why_included` columns for every news/research/event row.
- Render the Trace Appendix with the exact parseable header `| tool_name | params | status | execution_id | fallback_used | missing_fields |`; use compact JSON values, one row per observed attempt, and no planned/not-called rows.
- For live, fresh, or E2E output, save and validate an `observed_calls.v1` sidecar whose calls record `request_kind=capabilities/query` and canonical `capability_id`; without a verified sidecar, place the unverified note before `## Trace Appendix` and emit only the exact header plus separator with no rows.
- Include `missing_fields`, `data_quality.status`, rejected payload reasons, stale fields, and suppressed fields.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- End user-facing reports with a final non-empty line that is exactly `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris finance data sources, web scraping, browser automation, cookies, login state, external provider keys, direct SDKs, direct public quote endpoints, chat-message delivery tools, dynamic data-package installs, automated trading, buy/sell triggers, target prices, upside/downside, rebalancing instructions, or execution plans.

## References

- Use shared finance contract version `2026-07-22.2`; repository CI verifies the local rubric, retry policy, CAP registry, and output schema against `references/qveris-finance-shared-manifest.json` hashes.
- Read `references/qveris-tool-map.md` before choosing calls.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
