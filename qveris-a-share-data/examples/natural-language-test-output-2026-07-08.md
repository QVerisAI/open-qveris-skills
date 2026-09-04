## Summary

The source repo snapshot was read before generating this QVeris version. The QVeris skill adapts only `a-share-data` and excludes short-line trading, MACD trade planning, and paper-trading modules.

`effective_cutoff` and `workflow_guard_status` must be bound in a live run.

## Evidence

| Source script | QVeris handling |
|---|---|
| `fetch_realtime.py` | `qveris_finance.ref_symbology`, `qveris_finance.mkt_l1_rt` |
| `fetch_history.py` | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.fundamentals_*` |
| `fetch_technical.py` | calculated from validated QVeris bars |
| `fetch_stock_events.py` | `qveris_finance.event_calendar_corp` plus the audited Web lane for issuer news |
| A+H and IPO timeline scripts | missing unless `cap-detail` confirms QVeris fields |

## Market Data Read

Technical context can summarize validated bars, but it cannot become a trade trigger. If bars are too thin, indicators and trend claims are missing.

Twenty prices produce nineteen adjacent returns. A ranking is omitted unless the same-window universe, common factors, and required denominators pass the deterministic workflow guard.

## Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `sector_heatmap`, `a_h_mapping`, `ipo_timeline`, `capital_flow`, `strong_sentiment_score`.

The disabled `qveris_finance.news_fin_tagged` and `qveris_finance.sentiment_text_signals` CAPs are not called.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Required calls above are a plan, not trace rows.

Not investment advice.
