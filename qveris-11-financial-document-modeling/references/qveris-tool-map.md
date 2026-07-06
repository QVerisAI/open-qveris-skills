# QVeris Tool Map

Source: Financial Analyst Skills, https://github.com/Ruinius/financial-analyst-skills, MIT, evaluation recent activity 2026-06-08. Local snapshot: `third_party/source_repos/11-financial-analyst-skills`, commit `e886093` on 2026-06-08.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, filing form, accession, fiscal period, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Document classification | `qveris_finance.filings_regulatory_metadata`, `qveris_finance.filings_regulatory_raw`, `qveris_finance.filings_structured_xbrl` |
| Financial extraction | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_segment`, `qveris_finance.filings_structured_xbrl` |
| Financial calculations | `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted` |
| Financial modeling | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.fx_spot` |
| JSON model generator | Trace-backed JSON from QVeris filing and fundamentals payloads |

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.filings_regulatory_metadata` can ignore `form_type=10-K` | Verify returned form/accession before declaring a latest 10-K. |
| `qveris_finance.filings_structured_xbrl` can return filing metadata rather than XBRL facts | Do not label metadata as XBRL line items; fall back to fundamentals and mark XBRL facts missing. |
| Annual cash-flow requests can return quarterly/TTM-like periods | Keep mismatched periods separate and lower confidence. |
| Ratio payloads can include target-price fields | Suppress them and list under `suppressed_fields`. |

## Removed Or Replaced

Local PDF/model pipeline is fallback only, not the default data substrate. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
