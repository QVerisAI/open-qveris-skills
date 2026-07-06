# QVeris Tool Map

Source: HHXG Market, https://github.com/Niceck/hhxg-top-hhxg-python, MIT, evaluation recent activity 2026-06-20. Local snapshot: `third_party/source_repos/09-hhxg-market`, commit `381d2c3` on 2026-06-20.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, exchange, symbol suffix, and payload shape before using a payload as evidence.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| A-share daily snapshot | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.mkt_top_movers`, `qveris_finance.index_levels` |
| Trading calendar | `qveris_finance.ref_exchange_calendar` |
| Margin financing | `qveris_finance.mkt_margin` |
| News flash | `qveris_finance.news_fin_realtime`, `qveris_finance.news_fin_tagged` |
| Concepts/themes | `qveris_finance.mkt_cn_concept`, `qveris_finance.ref_classification_theme` |
| Dragon-tiger and flows | `qveris_finance.flow_dragon_tiger`, `qveris_finance.flow_northbound`, `qveris_finance.flow_sector_capital`, `qveris_finance.flow_large_order` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.mkt_breadth_internals` | Provider returned 503 for CN in live smoke on 2026-07-06 | `qveris_finance.mkt_l1_rt` with `000001.SH`, then `qveris_finance.mkt_top_movers` | Do not emit breadth counts from quote fallback; mark breadth fields missing, set `fallback_used: true`, and add `primary_tool_unavailable`. |
| `qveris_finance.mkt_top_movers(market: CN)` | Returned `AAPL.US` in natural-language forward test on 2026-07-06 | None | Discard non-CN rows and mark top movers missing/low confidence. |
| `qveris_finance.mkt_margin` / `flow_northbound` | Margin can fail; flow can return all zeros | Mark failed or all-zero/null flow fields low confidence unless corroborated. |

## Removed Or Replaced

A-share third-party market/news/margin endpoints are not runtime dependencies. Do not add direct EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.
