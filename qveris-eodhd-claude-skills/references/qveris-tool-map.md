# QVeris Tool Map

Source: EODHD Claude Skills, https://github.com/EodHistoricalData/eodhd-claude-skills, MIT, evaluation recent activity 2026-07-01. Local snapshot: `third_party/source_repos/03-eodhd-claude-skills`, commit `ab3034f` on 2026-06-22.

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
| Company brief | `qveris_finance.ref_company_profile`, `qveris_finance.mkt_l1_rt`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.news_fin_tagged` |
| Earnings monitor | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call` |
| Screener | `qveris_finance.ref_security_master`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_bars_adjusted`, `qveris_finance.analytics_tech_indicators`, `qveris_finance.sentiment_text_signals` |
| Portfolio risk | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels`, `qveris_finance.news_fin_tagged` |
| Macro dashboard | `qveris_finance.macro_indicators`, `qveris_finance.macro_actual_vs_forecast`, `qveris_finance.rates_policy`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.fx_spot` |
| Options snapshot | `qveris_finance.opt_chain`, `qveris_finance.opt_greeks_iv`, `qveris_finance.opt_ref_master` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| Quote timestamps may lag the request date because of weekends/holidays | Keep the quote but mark it in `data_quality.stale_fields`; avoid wording it as a live tick. |
| News and ratio payloads can be long/noisy and may include `analyst_target_price` | Summarize only relevant rows and suppress target-price fields. |

## Removed Or Replaced

EODHD API/subscription and endpoint mappings are not runtime dependencies. Do not add direct Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
