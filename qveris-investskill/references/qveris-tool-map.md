# QVeris Tool Map

Source: InvestSkill, https://github.com/yennanliu/InvestSkill, MIT, evaluation recent activity 2026-07-05. Local snapshot: `third_party/source_repos/05-investskill`, commit `49aa5da` on 2026-07-05.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, filing form, accession, fiscal period, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| 10-K digest | `qveris_finance.filings_regulatory_metadata`, `qveris_finance.filings_regulatory_raw`, `qveris_finance.filings_structured_xbrl` |
| Bear case/red flags | `qveris_finance.filings_regulatory_raw`, `qveris_finance.filings_structured_xbrl`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.news_fin_tagged`, `qveris_finance.ownership_insider_trades` |
| Catalyst calendar | `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_ipo`, `qveris_finance.news_fin_realtime` |
| Competitor analysis | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.research_analyst_reports` |
| DCF valuation inputs | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.mkt_l1_rt` |
| Earnings call analysis | `qveris_finance.transcripts_earnings_call`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.filings_regulatory_raw` returned 503 in natural-language forward test on 2026-07-06 | Do not quote 10-K sections; mark raw filing text missing. |
| `qveris_finance.filings_structured_xbrl` can return metadata-like payloads | Treat as metadata, not XBRL facts; use fundamentals only for numeric fields and mark XBRL facts missing. |
| Insider/news payloads can be truncated | Use them only as evidence sketches with low/limited confidence. |

## Removed Or Replaced

SEC scraping, external transcript sources, and third-party valuation feeds are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
