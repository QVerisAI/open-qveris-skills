---
name: qveris-anthropic-financial-services
description: QVeris-native adaptation of candidate 1, Anthropic Financial Services. Use for institution-style earnings review, peer comps, DCF assumption audit, model update, and market research workflows that must use qveris_finance.* CAP tools with trace-backed evidence and no investment advice.
---

# QVeris Anthropic Financial Services

Use this skill to create institution-style equity research artifacts adapted from Anthropic Financial Services while replacing all source data access with QVeris finance CAP tools. Keep the original business shape: earnings analysis, comps, DCF/model updates, and market research memos.

Source record:

| Field | Value |
|---|---|
| Candidate number | 1 |
| Original repository | Anthropic Financial Services |
| GitHub URL | https://github.com/anthropics/financial-services |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-06-26 |
| Local source snapshot | `third_party/source_repos/01-anthropic-financial-services` |
| Snapshot latest commit | `4aa51ed` on 2026-06-26 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools for financial data.
- Use only `QVERIS_API_KEY`; do not request, store, or infer third-party keys.
- Resolve entities first with `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master`, and `qveris_finance.ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Use the shared retry policy at `../references/qveris-finance-retry-policy.md`; retry transient 5xx/transport failures at most 2 times, do not blind-retry 404s, and hard reject semantic mismatches.
- Include `qveris_trace` for every numeric claim, quote, event, and conclusion.
- Report `missing_fields`; do not fill missing data as fact.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, depend on, or print those internal providers directly.
- Normalize trace provenance: `qveris_trace[].tool_name` and any human-readable trace labels must use only `qveris_finance.*` capability names. If QVeris returns vendor/provider IDs in `_meta.source_provider` or `_meta.failover_log`, expose only abstract labels such as `qveris_internal`, `internal_failover`, or `unknown`; describe the event as internal provider failover without printing vendor IDs.
- In final user-facing output, do not name external providers even when explaining prohibited fallbacks; say "non-QVeris sources" or "external provider routes" instead.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Evidence Gate

Read `../references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as evidence. A payload that succeeds transport but fails identity, date-window, fiscal-period, or statement-consistency checks is hard rejected, not treated as a usable fallback.

- Use evidence status labels from the shared rubric: `complete`, `partial`, `proxy_only`, or `insufficient`.
- Require IS, BS, CF, and segment data to share fiscal year, fiscal period, and period ending before building aligned earnings tables.
- If a requested annual/FY statement such as FY2025 cash flow returns a latest-quarter or TTM-shaped payload, treat the current call as `period_mismatch`, not as requested-period evidence.
- After a `period_mismatch`, inspect `cap-detail` and retry once with stricter documented fields such as `fiscal_year`, `fiscal_period`, `period_type`, `period`, or `limit`; if the payload still does not match, mark the requested statement missing, for example `FY2025 cash flow missing due to period mismatch`.
- Exclude CF from aligned tables when same-period CF net income materially conflicts with IS net income; mark `statement_semantic_mismatch`.
- Treat `qveris_finance.news_fin_tagged` as qualitative context only when transcript or cluster routes are unavailable. Do not derive management quotes, numeric sentiment, strong catalysts, or strong risk direction from tagged news alone.
- Keep invalid, failed, rejected, unavailable, or weak-relevance CAPs out of `Evidence Used`. Put them only in `Data Quality And Missing Fields`, `missing_fields`, or `Trace Appendix` with reason codes such as `capability_unavailable`, `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, or `insufficient_observations`.
- Use `qveris_finance.research_analyst_reports` only after issuer and document-type relevance checks pass. Reject academic papers, technical articles, broad industry pages, and weak text matches as `weak_relevance`; do not treat them as sell-side analyst evidence.
- Summarize long QVeris payloads in full-workflow reports. If a response is truncated or too large for a compact table, mark `payload_summarized` or `payload_truncated` and offer a single-capability note for inspection.

## DCF Input Gate

- Allowed DCF inputs: validated entity/profile, market quote, aligned IS/BS/CF rows that pass fiscal-period and statement-consistency checks, fresh FX, and explicitly returned consensus fields.
- Conditional DCF inputs: stale or monthly rates only as lagged proxy assumptions, manual trailing ratios only when source fields are present, and tagged news only as qualitative risk context.
- Denied DCF inputs: period-mismatched CF, CF excluded by statement mismatch, forward multiples inferred without consensus or derived-ratio evidence, analyst target/upside fields, buy/sell language, and growth assumptions derived from tagged news alone.
- When denied inputs are present in QVeris payloads, list them in `Data Quality And Missing Fields` and leave the model input blank instead of filling a placeholder.

## CAP Invocation

- Prefer native `qveris_finance.*` CAP functions when the environment exposes them.
- If native functions are not exposed but the repo script is available, execute standardized CAP calls from the repository root with `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`. Use repeatable `--param` flags for shell-safe parameters; reserve `--params '<json>'` for complex nested payloads.
- Equivalent HTTP route: `POST https://qveris.ai/api/v1/capabilities/query` with `capability_id`, structured `parameters`, and `strategy: "best"`.
- Use `cap-search` or `GET /capabilities/search` only when the CAP ID or parameter contract is uncertain; use `cap-detail` or `GET /capabilities/{capability_id}` to verify fields.
- Use legacy QVeris `/search` plus `/tools/execute` only when the standardized CAP endpoint is unavailable; mark `legacy_cap_shim_used` in `data_quality.warnings` and keep trace names normalized to `qveris_finance.*`.

## Workflows

1. Earnings analysis: `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_segment`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_tagged`, `qveris_finance.mkt_l1_rt`.
2. Peer comps: `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus`.
3. DCF/model update: `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.fx_spot`, `qveris_finance.mkt_l1_rt`; output assumptions and sensitivity, not a target price promise.
4. Market research: `qveris_finance.research_analyst_reports`, `qveris_finance.news_fin_tagged`, `qveris_finance.event_calendar_corp`, `qveris_finance.ownership_institutional`, `qveris_finance.ownership_insider_trades`; call `qveris_finance.news_dedup_cluster` only after `cap-detail` confirms it exists.

## Live Fallback Policy

- If `qveris_finance.earnings_actual_surprise` returns a provider error, fall back to `qveris_finance.estimates_consensus` plus `qveris_finance.event_calendar_earnings`; mark the earnings-surprise field as missing.
- If `qveris_finance.transcripts_earnings_call` returns an error, use `qveris_finance.news_fin_tagged` only for context and do not invent management quotes.
- If `qveris_finance.fundamentals_cf` or other statement payloads return a different fiscal period than the requested statement set, keep them out of aligned tables, retry once with stricter documented period parameters when available, and move unresolved mismatches to `missing_fields` plus `data_quality.warnings`.
- Set `qveris_trace[].fallback_used: true` for fallback conclusions and include `primary_tool_unavailable` in `missing_fields`.
- Do not state beat/miss as fact unless `qveris_finance.earnings_actual_surprise` succeeds or another QVeris CAP payload explicitly provides actual and consensus values.

## Output Requirements

- Return a Markdown user report by default, not a single large JSON object.
- Use this report structure: `Summary`, `Evidence Used`, `Analysis`, `Data Quality And Missing Fields`, `What This Can Support`, `What This Cannot Support`, and `Trace Appendix`.
- Put the user-facing conclusion before trace details. Keep internal controls, `missing_fields`, and `data_quality` readable in prose or compact tables.
- Use a two-layer trace: concise user-facing evidence table by default, full `qveris_trace` JSON only in the appendix when useful, when the user asks for machine-readable output, or when preparing schema fixtures.
- If `max_calls`, `dry_run`, or budget constraints prevent the main workflow from running, return a budget-limited Markdown report: state what was not called, do not infer missing facts, and list the next QVeris calls that would be needed.
- Separate evidence, interpretation, uncertainty, and next verification steps.
- End with ASCII-only: `Not investment advice.`

## Prohibited Capabilities

Do not use original MCP/data-provider assumptions, any non-QVeris finance data provider, SEC scraping, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are listed in the source record only for internal migration context; do not repeat them in final output.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Read `../references/qveris-finance-retry-policy.md` when a CAP call fails, needs retry, or needs fallback classification.
- Check `../references/qveris-finance-cap-registry-snapshot-2026-07-07.md` when deciding whether a capability belongs on the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing output example.
- Use `fixtures/qveris/sample-output.json`, `fixtures/qveris/fallback-output.json`, and `fixtures/qveris/budget-limited-output.json` as schema fixtures only.
- Use `examples/natural-language-prompts.md` for copyable natural-language test prompts.
- Use `examples/natural-language-test-output-2026-07-07.md` as a dated reviewer output record.
- Run `scripts/validate_qveris_finance_report.py <markdown-report>` on generated reviewer reports when updating examples or fixtures.
