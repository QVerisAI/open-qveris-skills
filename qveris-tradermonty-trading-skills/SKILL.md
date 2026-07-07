---
name: qveris-tradermonty-trading-skills
description: QVeris-native adaptation of candidate 10, Tradermonty Trading Skills. Use for portfolio risk review, market regime, sector rotation map, data-quality checking, and earnings calendar monitoring with trading actions removed.
---

# QVeris Tradermonty Trading Skills

Use this skill for risk and market-state workflows adapted from Tradermonty Trading Skills. Preserve portfolio risk, market regime, sector rotation, data quality, and earnings calendar structure; remove trade prep, action, execution, and account-permission semantics.

Source record:

| Field | Value |
|---|---|
| Candidate number | 10 |
| Original repository | Tradermonty Trading Skills |
| GitHub URL | https://github.com/tradermonty/claude-trading-skills |
| License | MIT |
| Evaluation recent activity | 2026-07-06 |
| Local source snapshot | `third_party/source_repos/10-tradermonty-trading-skills` |
| Snapshot latest commit | `4d63990` on 2026-07-05 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Accept user-provided holdings as read-only context; never request brokerage login or account permissions.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for every risk, market, sector, macro, and calendar claim.
- Data-quality checks must inspect `as_of`, `missing_fields`, `fallback_used`, and staleness on each QVeris payload.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, benchmark, and payload shape before using data; if a payload is stale, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Portfolio risk: user holdings plus `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels`, `qveris_finance.ownership_institutional`, `qveris_finance.news_fin_tagged`.
2. Market regime: `qveris_finance.index_levels`, `qveris_finance.index_vix`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.macro_actual_vs_forecast`, `qveris_finance.rates_govt_benchmark`.
3. Sector rotation: `qveris_finance.ref_classification_industry`, `qveris_finance.flow_sector_capital`, `qveris_finance.mkt_top_movers`, `qveris_finance.index_constituents`.
4. Data-quality checker: validate `as_of`, `missing_fields`, `fallback_used`, and staleness for each payload.
5. Earnings calendar: `qveris_finance.event_calendar_earnings`.

## Output Requirements

- Use `schemas/output.schema.json`.
- Output monitoring interpretation, exposure explanation, regime evidence, sector map, and data-quality warnings.
- If `qveris_finance.index_levels`, `qveris_finance.mkt_breadth_internals`, or `qveris_finance.macro_actual_vs_forecast` fail, use VIX/rates/liquid ETF proxies only as limited fallbacks and lower confidence.
- Derive `fallback_used` from QVeris `_meta.failover_log` as well as explicit fallback tool choices.
- Do not output trade prep, execution plan, rebalance instruction, buy/sell point, or target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use FMP, Alpaca, FinViz, brokerage/account permissions, trade prep/action/execution, EODHD, Yahoo, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
