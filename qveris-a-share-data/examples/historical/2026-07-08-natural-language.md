# Summary

Prompt tested: use `qveris-a-share-data` to make a live quote, history, technical-context, event, sector, and news read for `600519.SH`.

Live smoke result: the market-data read is usable but `partial`. Quote, EOD bars, industry classification, corporate events, earnings events, lock-up calendar, stock-level order-size flow, top movers, IPO calendar, share structure, and tagged news returned usable evidence. Technical-indicator CAP, theme tags, concept heat, northbound flow, cross-border flow, CN ETF options, and sentiment score did not return usable evidence.

# Evidence

| Claim | Trace | Params | Status | Fallback |
|---|---|---|---|---|
| Quote and historical bars were available for the tested symbol. | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_eod` | `symbol=600519.SH`, `market=CN` | quote 1 row; bars 21 rows | false |
| Technical context should be calculated from validated bars in this run. | `qveris_finance.analytics_tech_indicators`, `qveris_finance.mkt_bars_eod` | RSI request and same EOD bar window | technical CAP 503; bars usable | true |
| Event context was available. | `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_ipo` | 2026 windows | corp 1 row; earnings 10 rows; IPO calendar 1 row | false |
| Sector and flow context was mixed. | `qveris_finance.ref_classification_industry`, `qveris_finance.mkt_top_movers`, `qveris_finance.flow_large_order` | CN params | usable payloads | false |
| Some source-repo specialty reads stayed missing. | `qveris_finance.flow_dragon_tiger`, `qveris_finance.flow_northbound`, `qveris_finance.mkt_cn_concept`, `qveris_finance.opt_chain` | CN params | 503 or 422 | true |

# Market Data Read

The skill can produce a live research-data read for the tested symbol. The technical section should use the 21 validated EOD bars as the only supported basis for calculated context. It should not use the failed technical-indicator CAP or turn any indicator into a trading action.

The sector section can include industry classification and top-mover proxy context, but it cannot claim sector-flow strength from `qveris_finance.flow_sector_capital` unless rows explicitly identify sector or concept fields.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `technical_indicator_cap_values`, `theme_tags`, `concept_heat`, `lhb_records`, `northbound_flow`, `cross_border_flow`, `verified_sector_flow`, `cn_etf_options`, `sentiment_score`, `a_h_mapping`.

Rejected payloads: `qveris_finance.flow_sector_capital` for sector-flow semantics in this smoke run.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. This historical pre-contract output has no independent observed-calls artifact; prior trace claims are not treated as verified.

Not investment advice.
