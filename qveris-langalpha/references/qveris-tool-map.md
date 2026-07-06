# QVeris Tool Map

Source: LangAlpha, https://github.com/ginlix-ai/LangAlpha, Apache-2.0, evaluation recent activity 2026-07-06. Local snapshot: `third_party/source_repos/02-langalpha`, commit `deab98e` on 2026-07-06.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, fiscal period, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| DCF model | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.mkt_l1_rt` |
| Earnings analysis/preview | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_realtime` |
| Sector overview | `qveris_finance.ref_classification_industry`, `qveris_finance.index_constituents`, `qveris_finance.index_levels`, `qveris_finance.flow_sector_capital`, `qveris_finance.mkt_breadth_internals` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.rates_govt_benchmark` can fail for DCF risk-free-rate inputs | Mark risk-free rate missing; do not substitute non-QVeris or stale rates. |
| Cash-flow statements can return a different period than income statement/balance sheet | Do not blend cross-period values into DCF scenarios; report period mismatch in `data_quality.warnings`. |
| `qveris_finance.estimates_consensus` can return historical surprise-like rows instead of forward DCF assumptions | Use only rows whose period/date match the requested forward horizon; otherwise mark consensus assumptions missing. |

## Removed Or Replaced

Original fundamentals/market/macro MCP adapters are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
