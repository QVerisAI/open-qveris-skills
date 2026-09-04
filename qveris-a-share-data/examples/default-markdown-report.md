## Summary

This static contract example illustrates an A-share data-read layout and does not claim live QVeris calls. A real run with missing bars, events, or heat context must switch to `Latest Snapshot And Coverage Notes` and list unavailable deliverables first.

Controls: `dry_run=false`, `max_calls=7`, `max_age=P1D`, `budget_note=single-security A-share data read`.

`effective_cutoff`: bind from `min(T0,CUT_OFF)` in a live run. `workflow_guard_status`: `not_run_static_example`.

## Evidence

| Claim | Source Type | Parameters / Query | Status | Fallback |
|---|---|---|---|---|
| Symbol resolves to a mainland A-share security | `qveris_finance.ref_symbology` | `symbol=300750.SZ`, `market=CN` | complete | no |
| Latest quote supports snapshot context | `qveris_finance.mkt_l1_rt` | `symbol=300750.SZ`, `market=CN` | complete | no |
| Bars support calculated moving-average context | `qveris_finance.mkt_bars_adjusted` | `count=120`, `frequency=1d` | complete | no |
| Event context is checked for the requested window | `qveris_finance.event_calendar_corp` | `symbol=300750.SZ`, `lookback_days=30` | partial | no |
| Issuer news and qualitative sentiment | `web` | validated issuer name, ticker, and requested window | insufficient until two independent opened pages pass | temporary Web override |

## Market Data Read

Quote and bars can support a descriptive market-data read. MA, RSI, MACD, and BOLL-style fields may be calculated only from validated QVeris bars, and the report must state the lookback used.

Hot industry, concept, heatmap, A+H timeline, and IPO timeline outputs are available only when a verified QVeris CAP exists for those fields. Otherwise they are missing.

Twenty validated price observations create nineteen adjacent returns, not twenty. State both counts whenever a return-based metric is shown.

## Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `sector_heatmap`, `capital_flow`, `a_h_mapping`, `hk_ipo_timeline`, `strong_sentiment_score`.

News/sentiment remains unavailable until opened page bodies, timestamps, issuer/window checks, hashes, and independent publisher-owner counts pass. Do not use the disabled news or sentiment CAPs.

Suppressed fields: paper trading, account/order actions, entry/exit triggers, position size, stop-loss instructions, buy/sell wording.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Illustrative evidence rows above are report-shape examples, not observed results.

Not investment advice.
