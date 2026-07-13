# Summary

The source repo snapshot was read before generating this QVeris version. The QVeris report keeps the original ten-layer taxonomy, but validates only issuer, quote, bars, fundamentals, research, news, and events through `qveris_finance.*` primary routes. Unverified A-share specialty layers are missing by design.

# Evidence

| Source capability | QVeris handling |
|---|---|
| Market data | `qveris_finance.ref_symbology`, `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted` |
| Fundamentals | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios` |
| Research/news/events | `qveris_finance.research_analyst_reports`, `qveris_finance.news_fin_tagged`, `qveris_finance.event_calendar_corp` |
| LHB, unlock, limit-board, capital-flow, ETF options, investor Q&A | Missing unless current `cap-detail` confirms a QVeris finance CAP |

# Analysis

The skill should produce a user-facing Markdown report and keep source-provider details out of prose and trace. Failed or mismatched QVeris calls lower data quality instead of being replaced by original source endpoints.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `lhb_records`, `unlock_calendar`, `limit_board_pool`, `capital_flow`, `etf_options`, `investor_qa`.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Required calls above are a plan, not trace rows.

Not investment advice.
