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
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for every numeric claim, quote, event, and conclusion.
- Report `missing_fields`; do not fill missing data as fact.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Earnings analysis: `event_calendar_earnings`, `earnings_actual_surprise`, `estimates_consensus`, `fundamentals_*`, `fundamentals_segment`, `transcripts_earnings_call`, `news_fin_tagged`, `mkt_l1_rt`.
2. Peer comps: `ref_classification_industry`, `ref_classification_theme`, `fundamentals_derived_ratios`, `mkt_l1_rt`, `estimates_consensus`.
3. DCF/model update: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `estimates_consensus`, `rates_govt_benchmark`, `fx_spot`, `mkt_l1_rt`; output assumptions and sensitivity, not a target price promise.
4. Market research: `research_analyst_reports`, `news_dedup_cluster`, `event_calendar_corp`, `ownership_institutional`, `ownership_insider_trades`.

## Live Fallback Policy

- If `earnings_actual_surprise` returns a provider error, fall back to `estimates_consensus` plus `event_calendar_earnings`; mark the earnings-surprise field as missing.
- If `transcripts_earnings_call` returns an error, use `news_fin_tagged` only for context and do not invent management quotes.
- If `fundamentals_cf` or other statement payloads return a different fiscal period than the requested statement set, keep them out of aligned tables and move them to `data_quality.warnings`.
- Set `qveris_trace[].fallback_used: true` for fallback conclusions and include `primary_tool_unavailable` in `missing_fields`.
- Do not state beat/miss as fact unless `earnings_actual_surprise` succeeds or another QVeris CAP payload explicitly provides actual and consensus values.

## Output Requirements

- Return a research memo plus optional JSON matching `schemas/output.schema.json`.
- Include `source_record`, `controls`, `analysis`, `risk_notes`, `missing_fields`, and `qveris_trace`.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- Separate evidence, interpretation, uncertainty, and next verification steps.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use original MCP/data-provider assumptions, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
