# QVeris Tool Map

Source: Tech Earnings Deepdive, https://github.com/webleon/tech-earnings-deepdive-openclaw-skill, MIT, evaluation recent activity 2026-03-24. Local snapshot: `third_party/source_repos/06-tech-earnings-deepdive`, commit `5bff060` on 2026-03-24.

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
| Tech earnings deep dive | `qveris_finance.earnings_actual_surprise`, `qveris_finance.fundamentals_segment`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_tagged` |
| Competition/moat | `qveris_finance.ref_classification_theme`, `qveris_finance.research_analyst_reports`, `qveris_finance.alt_patents`, `qveris_finance.alt_job_postings`, `qveris_finance.alt_supply_chain` |
| Valuation/reaction | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_intraday`, `qveris_finance.mkt_after_hours`, `qveris_finance.fundamentals_derived_ratios` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.fundamentals_segment` | Exact discovery was unstable and provider returned 503 in live smoke on 2026-07-06 | `qveris_finance.news_fin_tagged`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.estimates_consensus` | Do not emit segment revenue/margin scorecard; output segment commentary only with `fallback_used: true` and `primary_tool_unavailable`. |
| `qveris_finance.transcripts_earnings_call` or `qveris_finance.earnings_actual_surprise` | Returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.news_fin_tagged`, `qveris_finance.estimates_consensus`, market reaction tools | Label output as a fallback memo, not a full earnings deep dive. |
| `qveris_finance.alt_patents` / `research_analyst_reports` | Can return filing-like or academic/noisy payloads | Use only after payload-shape validation; otherwise mark missing/low confidence. |

## Removed Or Replaced

Original non-QVeris financial data sources are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, position decisions, portfolio action instructions, or target price commitments.
