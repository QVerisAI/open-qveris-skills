---
name: qveris-langalpha
description: QVeris-native adaptation of candidate 2, LangAlpha. Use for DCF, earnings analysis, earnings preview, and sector overview workflows that preserve LangAlpha-style schemas while routing all financial data through qveris_finance.* CAP tools.
---

# QVeris LangAlpha

Use this skill for DCF assumptions, sensitivity analysis, earnings post-mortems/previews, and sector overview reports adapted from LangAlpha. Preserve the original workflow categories, but replace fundamentals, market, and macro MCP access with QVeris finance CAP calls.

Source record:

| Field | Value |
|---|---|
| Candidate number | 2 |
| Original repository | LangAlpha |
| GitHub URL | https://github.com/ginlix-ai/LangAlpha |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-07-06 |
| Local source snapshot | `third_party/source_repos/02-langalpha` |
| Snapshot latest commit | `deab98e` on 2026-07-06 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve tickers, exchanges, companies, and CIKs with `ref_symbology`, `ref_security_master`, and `ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Attach `qveris_trace` to every output section and list `missing_fields` without backfilling.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. DCF model: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `fundamentals_derived_ratios`, `estimates_consensus`, `rates_govt_benchmark`, `mkt_l1_rt`.
2. Earnings analysis/preview: `event_calendar_earnings`, `earnings_actual_surprise`, `estimates_consensus`, `transcripts_earnings_call`, `news_fin_realtime`.
3. Sector overview: `ref_classification_industry`, `index_constituents`, `index_levels`, `flow_sector_capital`, `mkt_breadth_internals`.

## Output Requirements

- Use `schemas/output.schema.json` for machine-readable output.
- Report assumptions, sensitivity ranges, missing inputs, and confidence.
- Align DCF statement inputs by fiscal year/quarter before calculating; if income statement, balance sheet, cash flow, estimates, or rates arrive on different periods, do not blend them into one scenario table.
- If `rates_govt_benchmark` fails, mark the risk-free-rate input missing instead of substituting a stale or non-QVeris value.
- Keep valuation outputs as scenario ranges and assumption audits; do not present target price commitments.
- Include `source_record`, `controls`, `analysis`, `risk_notes`, `missing_fields`, and `qveris_trace`.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris fundamentals/market/macro MCPs, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
