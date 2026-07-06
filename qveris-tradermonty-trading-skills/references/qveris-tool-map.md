# QVeris Tool Map

Source: Tradermonty Trading Skills, https://github.com/tradermonty/claude-trading-skills, MIT, evaluation recent activity 2026-07-06. Local snapshot: `third_party/source_repos/10-tradermonty-trading-skills`, commit `4d63990` on 2026-07-05.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, benchmark, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Portfolio risk | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels`, `qveris_finance.ownership_institutional`, `qveris_finance.news_fin_tagged` |
| Market regime | `qveris_finance.index_levels`, `qveris_finance.index_vix`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.macro_actual_vs_forecast`, `qveris_finance.rates_govt_benchmark` |
| Sector rotation | `qveris_finance.ref_classification_industry`, `qveris_finance.flow_sector_capital`, `qveris_finance.mkt_top_movers`, `qveris_finance.index_constituents` |
| Data-quality checker | Validate `as_of`, `missing_fields`, `fallback_used`, and staleness on every QVeris payload |
| Earnings calendar | `qveris_finance.event_calendar_earnings` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.index_levels` and `qveris_finance.mkt_breadth_internals` returned 503 in natural-language forward test on 2026-07-06 | Use VIX/rates/liquid ETF proxies only as limited fallback and lower confidence. |
| `qveris_finance.macro_actual_vs_forecast` returned 404 | Use `event_calendar_macro` only as weaker macro-event context and mark actual-vs-forecast missing. |
| QVeris `_meta.failover_log` may show internal provider failover | Reflect this in `qveris_trace[].fallback_used` without treating providers as direct dependencies. |

## Removed Or Replaced

Trading/prep/action semantics and FMP, Alpaca, FinViz integrations are not runtime dependencies. Do not add direct EODHD, Yahoo, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
