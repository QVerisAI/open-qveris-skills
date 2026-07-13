# Summary

This static contract example illustrates an A-share data-read layout and does not claim live QVeris calls. A real run with missing bars, events, or heat context must switch to `Latest Snapshot And Coverage Notes` and list unavailable deliverables first.

Controls: `dry_run=false`, `max_calls=7`, `max_age=P1D`, `budget_note=single-security A-share data read`.

# Evidence

| Claim | QVeris Capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Symbol resolves to a mainland A-share security | `qveris_finance.ref_symbology` | `symbol=300750.SZ`, `market=CN` | complete | no |
| Latest quote supports snapshot context | `qveris_finance.mkt_l1_rt` | `symbol=300750.SZ`, `market=CN` | complete | no |
| Bars support calculated moving-average context | `qveris_finance.mkt_bars_adjusted` | `count=120`, `frequency=1d` | complete | no |
| Event context is checked for the requested window | `qveris_finance.event_calendar_corp` | `symbol=300750.SZ`, `lookback_days=30` | partial | no |
| Tagged news is background only | `qveris_finance.news_fin_tagged` | `symbol=300750.SZ`, `lookback_days=7` | proxy_only | yes |

# Market Data Read

Quote and bars can support a descriptive market-data read. MA, RSI, MACD, and BOLL-style fields may be calculated only from validated QVeris bars, and the report must state the lookback used.

Hot industry, concept, heatmap, A+H timeline, and IPO timeline outputs are available only when a verified QVeris CAP exists for those fields. Otherwise they are missing.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `sector_heatmap`, `capital_flow`, `a_h_mapping`, `hk_ipo_timeline`, `strong_sentiment_score`.

Suppressed fields: paper trading, account/order actions, entry/exit triggers, position size, stop-loss instructions, buy/sell wording.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Illustrative evidence rows above are report-shape examples, not observed results.

Not investment advice.
