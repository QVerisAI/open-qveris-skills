# Summary

Prompt tested: use `qveris-a-stock-data-layer` to make a live A-share data-layer read for `600519.SH` with market data, events, flow, news, and A-share specialty coverage.

Live smoke result: the report is usable but `partial`. Core identity, quote, EOD bars, industry, events, lock-up, stock-level order-size flow, top movers, IPO calendar, share structure, and tagged news returned usable QVeris payloads. Theme tags, research reports, LHB, northbound/cross-border flow, concept heat, CN ETF options, and sentiment score did not produce usable evidence in this run.

# Evidence

| Claim | Trace | Params | Status | Fallback |
|---|---|---|---|---|
| `600519.SH` could be resolved as an A-share test instrument. | `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN` | usable payload, 1 row | false |
| Quote and daily-bar routes were live. | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_eod` | `symbol=600519.SH`, `market=CN`, `2026-06-01..2026-06-30` | quote 1 row, bars 21 rows | false |
| Industry context was available, but theme context was not. | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme` | `symbol=600519.SH`, `market=CN` | industry 1 row; theme empty | false |
| Corporate-event and earnings-calendar context were available. | `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_earnings` | `symbol=600519.SH`, `market=CN`, `2026-01-01..2026-12-31` | corp 1 row; earnings 10 rows | false |
| Some A-share specialty layers were usable as narrow evidence. | `qveris_finance.mkt_cn_lock_up`, `qveris_finance.flow_large_order`, `qveris_finance.ownership_share_structure` | `symbol=600519.SH`, `market=CN` | lock-up 2 rows; flow 21 rows; share structure 1 row | false |
| Sector-flow and concept evidence stayed degraded. | `qveris_finance.flow_sector_capital`, `qveris_finance.mkt_cn_concept` | `market=CN`, `symbol=600519.SH` | sector-flow payload shape rejected; concept 503 | true |
| Tagged news was available, but sentiment score was not. | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | `symbol=600519.SH`, `market=CN`, `2026-07-01..2026-07-08` | news 8 rows; sentiment 503 | true |

# Analysis

This skill can now support a live A-share data-layer report for the tested symbol, but it must keep the A-share specialty layer split by evidence quality. The verified usable pieces are narrow: quote, bars, industry, calendar events, lock-up, stock-level order-size flow, top movers, IPO calendar context, share structure, and tagged news.

The run also proves the hard-reject rule is needed. `qveris_finance.flow_sector_capital` returned data, but the sampled row had stock-level fields rather than sector/concept identifiers. That payload should not support a sector-flow claim.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing or rejected fields: `theme_tags`, `research_reports`, `lhb_records`, `northbound_flow`, `cross_border_flow`, `concept_heat`, `sector_flow_verified`, `cn_etf_options`, `strong_sentiment_score`, `investor_qa`, `limit_board_pool`.

Rejected payloads: `qveris_finance.flow_sector_capital` for sector-flow semantics, because the smoke row did not identify a sector or concept.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. This historical pre-contract output has no independent observed-calls artifact; prior trace claims are not treated as verified.

Not investment advice.
