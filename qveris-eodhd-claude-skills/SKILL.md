---
name: qveris-eodhd-claude-skills
description: QVeris-native adaptation of candidate 3, EODHD Claude Skills. Use for company brief, screener, earnings monitor, portfolio risk, macro dashboard, and options analysis workflows rebuilt on qveris_finance.* CAP tools.
---

# QVeris EODHD Claude Skills

Use this skill for market-monitoring workflows adapted from EODHD Claude Skills: company briefs, screeners, earnings monitors, portfolio risk, macro dashboards, and options snapshots. Keep the taxonomy and output style, but remove EODHD endpoints, subscriptions, and provider keys.

Source record:

| Field | Value |
|---|---|
| Candidate number | 3 |
| Original repository | EODHD Claude Skills |
| GitHub URL | https://github.com/EodHistoricalData/eodhd-claude-skills |
| License | MIT |
| Evaluation recent activity | 2026-07-01 |
| Local source snapshot | `third_party/source_repos/03-eodhd-claude-skills` |
| Snapshot latest commit | `ab3034f` on 2026-06-22 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools for financial data.
- Use only `QVERIS_API_KEY`; no EODHD API key, subscription token, endpoint mapping, or third-party provider credential may be used.
- Resolve entities with `ref_symbology`, `ref_security_master`, and `ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Attach `qveris_trace` to every data-backed field and flag stale or missing data.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Company brief: `ref_company_profile`, `mkt_l1_rt`, `fundamentals_derived_ratios`, `news_fin_tagged`.
2. Earnings monitor: `event_calendar_earnings`, `earnings_actual_surprise`, `estimates_consensus`, `transcripts_earnings_call`.
3. Stock screener: `ref_security_master`, `fundamentals_derived_ratios`, `mkt_bars_adjusted`, `analytics_tech_indicators`, `sentiment_text_signals`.
4. Portfolio risk: user-provided holdings plus `mkt_bars_adjusted`, `risk_beta_vol`, `index_levels`, `news_fin_tagged`.
5. Macro dashboard: `macro_indicators`, `macro_actual_vs_forecast`, `rates_policy`, `rates_govt_benchmark`, `fx_spot`.
6. Options snapshot: `opt_chain`, `opt_greeks_iv`, `opt_ref_master`; explain risk only, no trade construction.

## Output Requirements

- Use `schemas/output.schema.json`.
- Screeners must show criteria, matched universe, missing fields, and data age.
- Portfolio risk must explain exposures and data quality without giving rebalance instructions.
- Company briefs must flag quote staleness and holiday/weekend effects instead of implying a stale quote is live.
- Include `source_record`, `controls`, `analysis`, `risk_notes`, `missing_fields`, and `qveris_trace`.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use EODHD runtime access, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
