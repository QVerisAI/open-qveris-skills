# QVeris Tool Map

Source: Anthropic Financial Services, https://github.com/anthropics/financial-services, Apache-2.0, evaluation recent activity 2026-06-26. Local snapshot: `third_party/source_repos/01-anthropic-financial-services`, commit `4aa51ed` on 2026-06-26.

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
| Earnings analysis | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_segment`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_tagged`, `qveris_finance.mkt_l1_rt` |
| Peer comps | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus` |
| DCF/model update | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.fx_spot`, `qveris_finance.mkt_l1_rt` |
| Market research | `qveris_finance.research_analyst_reports`, `qveris_finance.news_dedup_cluster`, `qveris_finance.event_calendar_corp`, `qveris_finance.ownership_institutional`, `qveris_finance.ownership_insider_trades` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.earnings_actual_surprise` | Provider returned 503 in live smoke on 2026-07-06 | `qveris_finance.estimates_consensus` plus `qveris_finance.event_calendar_earnings` | Do not assert beat/miss unless actual and consensus are both present; mark `fallback_used: true` and add `primary_tool_unavailable` to `missing_fields`. |
| `qveris_finance.transcripts_earnings_call` | Provider returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.news_fin_tagged` | Use news only as context; do not invent management quotes. |
| Statement period alignment | `fundamentals_cf` can return TTM/other periods despite quarterly intent | None | Keep cross-period values out of aligned tables and add a data-quality warning. |

## Removed Or Replaced

Original MCP/data-provider assumptions are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
