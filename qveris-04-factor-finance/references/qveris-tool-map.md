# QVeris Tool Map

Source: Finance Skills, https://github.com/himself65/finance-skills, MIT, evaluation recent activity 2026-06-14. Local snapshot: `third_party/source_repos/04-finance-skills`, commit `87f688e` on 2026-06-07.

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
| Sentiment factor | `qveris_finance.news_fin_tagged`, `qveris_finance.news_dedup_cluster`, `qveris_finance.sentiment_text_signals` |
| Valuation inputs | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus` |
| Earnings recap | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call` |
| Liquidity/correlation | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.sentiment_text_signals` | Provider returned 503 in live smoke on 2026-07-06 | `qveris_finance.news_fin_tagged` | Output qualitative news context only; do not emit numeric sentiment score; mark `fallback_used: true` and add `primary_tool_unavailable` to `missing_fields`. |
| `qveris_finance.fundamentals_derived_ratios` or `qveris_finance.estimates_consensus` | Returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.mkt_l1_rt` plus available fundamentals | Emit partial valuation inputs only; mark ratio/consensus fields missing. |
| `qveris_finance.earnings_actual_surprise` | Returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.event_calendar_earnings` plus `qveris_finance.estimates_consensus` when available | Do not state actual surprise or beat/miss without actual and consensus. |

## Removed Or Replaced

yfinance, Adanos/Funda, dynamic data-package installs, and external finance APIs are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
