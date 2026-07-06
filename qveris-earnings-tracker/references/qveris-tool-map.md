# QVeris Tool Map

Source: Earnings Tracker, https://github.com/Indomi/earnings-tracker, MIT, evaluation recent activity 2026-03-18. Local snapshot: `third_party/source_repos/08-earnings-tracker`, commit `38deb30` on 2026-03-19.

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
| Earnings calendar | `qveris_finance.event_calendar_earnings` |
| Post-earnings recap | `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_realtime` |
| Watchlist/industry filter | `qveris_finance.ref_security_master`, `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme` |
| Price reaction | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_intraday`, `qveris_finance.mkt_after_hours` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.event_calendar_earnings` can return events outside the requested date window | Filter to the requested window; move rejected rows to `data_quality.out_of_window_events`. |
| `qveris_finance.earnings_actual_surprise` and `qveris_finance.transcripts_earnings_call` returned 503 in natural-language forward test on 2026-07-06 | Output recap-prep inputs only; mark surprise/transcript missing. |
| Calendar `hour` can be blank | Mark event time missing instead of inferring before/after market. |

## Removed Or Replaced

FMP, Alpha Vantage, Yahoo, Polygon, Sina, and WebSearch adapters are not runtime data dependencies. Do not add direct EODHD, AkShare, Snowball, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
