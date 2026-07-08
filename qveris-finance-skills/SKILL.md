---
name: qveris-finance-skills
description: QVeris-native adaptation of candidate 4, Finance Skills. Use for sentiment, valuation inputs, earnings recap, liquidity, and correlation factor workflows that require qveris_finance.* CAP data, traceability, and no provider keys.
---

# QVeris Finance Skills

Use this skill to turn the Finance Skills candidate into standardized, trace-backed research factors: sentiment, valuation inputs, earnings recap, liquidity, and correlation. Preserve the factor framing; replace legacy data packages and third-party APIs with QVeris.

Source record:

| Field | Value |
|---|---|
| Candidate number | 4 |
| Original repository | Finance Skills |
| GitHub URL | https://github.com/himself65/finance-skills |
| License | MIT |
| Evaluation recent activity | 2026-06-14 |
| Local source snapshot | `third_party/source_repos/04-finance-skills` |
| Snapshot latest commit | `87f688e` on 2026-06-07 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve the security with `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master`, and `qveris_finance.ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Use the shared retry policy at `../references/qveris-finance-retry-policy.md`; retry transient 5xx/transport failures at most 2 times, do not blind-retry 404s, and hard reject semantic mismatches.
- Include `qveris_trace` for each factor and expose stale or missing inputs.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, depend on, or print those internal providers directly.
- Normalize trace provenance: `qveris_trace[].tool_name` and any human-readable trace labels must use only `qveris_finance.*` capability names. If QVeris returns vendor/provider IDs in `_meta.source_provider` or `_meta.failover_log`, expose only abstract labels such as `qveris_internal`, `internal_failover`, or `unknown`; describe the event as internal provider failover without printing vendor IDs.
- In final user-facing output, do not name external providers even when explaining prohibited fallbacks; say "non-QVeris sources" or "external provider routes" instead.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Evidence Gate

Read `../references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as evidence. A payload that succeeds transport but fails identity, date-window, fiscal-period, benchmark, or statement-consistency checks is hard rejected, not treated as a usable fallback.

- Use evidence status labels from the shared rubric: `complete`, `partial`, `proxy_only`, or `insufficient`.
- Require at least 2 observations for multi-day bars before computing liquidity, return, correlation, realized volatility, drawdown, or trend.
- Reject index or benchmark payloads whose returned symbol, name, or asset type does not match the requested benchmark; mark `semantic_mismatch`.
- If a requested annual/FY statement such as FY2025 cash flow returns a latest-quarter or TTM-shaped payload, treat the current call as `period_mismatch`, not as requested-period evidence.
- After a `period_mismatch`, inspect `cap-detail` and retry once with stricter documented fields such as `fiscal_year`, `fiscal_period`, `period_type`, `period`, or `limit`; if the payload still does not match, mark the requested statement missing, for example `FY2025 cash flow missing due to period mismatch`.
- Treat `qveris_finance.news_fin_tagged` as qualitative context only when sentiment or cluster routes are unavailable. Do not derive numeric sentiment, strong catalysts, or directional risk conclusions from tagged news alone.
- Use manual trailing valuation inputs only when required QVeris fields are present and label them as calculated. Do not infer forward multiples unless consensus or derived-ratio evidence succeeds.
- Keep invalid, failed, rejected, unavailable, or weak-relevance CAPs out of `Evidence Used` and the positive side of the `Factor Table`. Put them only in `Data Quality And Missing Fields`, `missing_fields`, or `Trace Appendix` with reason codes such as `capability_unavailable`, `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, or `insufficient_observations`.
- Apply issuer relevance checks to every news and sentiment row. If returned text appears to refer to another entity, such as a similarly named company, mark `entity_mix`, lower confidence, and do not use it as sentiment or catalyst evidence.
- Summarize long QVeris payloads in full-workflow reports. If a response is truncated or too large for a compact table, mark `payload_summarized` or `payload_truncated` and offer a single-capability note for inspection.

## CAP Invocation

- Prefer native `qveris_finance.*` CAP functions when the environment exposes them.
- If native functions are not exposed but the repo script is available, execute standardized CAP calls from the repository root with `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`. Use repeatable `--param` flags for shell-safe parameters; reserve `--params '<json>'` for complex nested payloads.
- Equivalent HTTP route: `POST https://qveris.ai/api/v1/capabilities/query` with `capability_id`, structured `parameters`, and `strategy: "best"`.
- Use `cap-search` or `GET /capabilities/search` only when the CAP ID or parameter contract is uncertain; use `cap-detail` or `GET /capabilities/{capability_id}` to verify fields.
- Use legacy QVeris `/search` plus `/tools/execute` only when the standardized CAP endpoint is unavailable; mark `legacy_cap_shim_used` in `data_quality.warnings` and keep trace names normalized to `qveris_finance.*`.

## Workflows

1. Sentiment factor: `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals`; call `qveris_finance.news_dedup_cluster` only after `cap-detail` confirms it exists.
2. Valuation input factor: `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus`.
3. Earnings recap factor: `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call`.
4. Liquidity factor: `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_breadth_internals`, and available trading aggregate fields from QVeris payloads.
5. Correlation factor: `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol`, and benchmark `qveris_finance.index_levels`.

## Live Fallback Policy

- If `qveris_finance.sentiment_text_signals` returns a provider error, fall back to `qveris_finance.news_fin_tagged` and derive only a qualitative news-context factor.
- Mark quantitative sentiment score fields as missing unless `qveris_finance.sentiment_text_signals` succeeds.
- If a statement payload returns a different period than requested, keep it out of aligned valuation tables, retry once with stricter documented period parameters when available, and move unresolved mismatches to `missing_fields` plus `data_quality.warnings`.
- If `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.estimates_consensus`, or `qveris_finance.earnings_actual_surprise` fail, keep valuation and earnings factors as partial inputs with missing numeric fields; do not convert them into directional return claims.
- Set `qveris_trace[].fallback_used: true` and include `primary_tool_unavailable` in `missing_fields` for fallback sentiment output.

## Output Requirements

- Return a Markdown user report by default, not a single large JSON object.
- Use this report structure: `Summary`, `Factor Table`, `Evidence Used`, `Data Quality And Missing Fields`, `What This Can Support`, `What This Cannot Support`, and `Trace Appendix`.
- Keep the factor table user-readable with value, direction, confidence, evidence status, and missing fields.
- Use a two-layer trace: concise user-facing evidence table by default, full `qveris_trace` JSON only in the appendix when useful, when the user asks for machine-readable output, or when preparing schema fixtures.
- If `max_calls`, `dry_run`, or budget constraints prevent the main workflow from running, return a budget-limited Markdown report: state what was not called, do not infer missing factors, and list the next QVeris calls that would be needed.
- Treat sentiment as explanatory input, not a return forecast.
- Do not output buy/sell triggers, target prices, or rebalancing instructions.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with ASCII-only: `Not investment advice.`

## Prohibited Capabilities

Do not use dynamic data-package installs, any non-QVeris finance data provider, SEC scraping, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are listed in the source record only for internal migration context; do not repeat them in final output.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Read `../references/qveris-finance-retry-policy.md` when a CAP call fails, needs retry, or needs fallback classification.
- Check `../references/qveris-finance-cap-registry-snapshot-2026-07-07.md` when deciding whether a capability belongs on the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing output example.
- Use `fixtures/qveris/sample-output.json`, `fixtures/qveris/fallback-output.json`, and `fixtures/qveris/budget-limited-output.json` as schema fixtures only.
- Use `examples/natural-language-prompts.md` for copyable natural-language test prompts.
- Use `examples/natural-language-test-output-2026-07-07.md` as a dated reviewer output record.
- Run `scripts/validate_qveris_finance_report.py <markdown-report>` on generated reviewer reports when updating examples or fixtures.
