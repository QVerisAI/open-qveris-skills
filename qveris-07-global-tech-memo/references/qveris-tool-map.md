# QVeris Tool Map

Source: Day1Global Skills, https://github.com/star23/Day1Global-Skills, MIT, evaluation recent activity 2026-04-15. Local snapshot: `third_party/source_repos/07-day1global-skills`, commit `562c14b` on 2026-04-15.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, country, region, date window, fiscal period, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Global/tech memo | `qveris_finance.ref_security_master`, `qveris_finance.ref_company_profile`, `qveris_finance.mkt_l1_rt`, `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.news_fin_tagged`, `qveris_finance.research_analyst_reports` |
| Sector/geography context | `qveris_finance.ref_classification_industry`, `qveris_finance.index_metadata`, `qveris_finance.index_levels`, `qveris_finance.macro_indicators`, `qveris_finance.fx_spot` |
| Technology context | `qveris_finance.ref_classification_theme`, `qveris_finance.alt_patents`, `qveris_finance.alt_job_postings`, `qveris_finance.alt_supply_chain` |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.fx_spot` returned 503 in natural-language forward test on 2026-07-06 | Mark FX missing; do not convert currencies unless a fresh QVeris FX value is present. |
| `qveris_finance.research_analyst_reports` returned OpenAlex-style academic material | Do not label academic rows as sell-side research; use only as background or mark missing. |
| `qveris_finance.macro_indicators(region: EU)` returned US/industry-like rows | Mark region macro context low confidence or missing. |

## Removed Or Replaced

Original code and non-QVeris adapters are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
