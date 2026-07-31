## Summary

This static shape example makes no live-data claim. A real run with unavailable bars, events, or sector context must switch to `Latest Snapshot And Coverage Notes` and list unavailable deliverables in the first sentence.

Controls: `dry_run=false`, `max_calls=8`, `max_age=P1D`, `budget_note=single-security direct A-share read`.

## Evidence

| Claim | QVeris tool type | Parameters | Status | Fallback |
|---|---|---|---|---|
| The symbol resolves to a mainland A-share security | China A-share security master symbol lookup API | `symbol=300750.SZ` | complete | no |
| A current quote supports snapshot context | China A-share real-time stock quote API | `symbol=300750.SZ` | complete | no |
| Daily bars support calculated moving-average context | China A-share historical daily price bars API | `symbol=300750.SZ`, `count=120` | complete | no |
| Issuer events were checked for the requested window | China listed company corporate events calendar API | `symbol=300750.SZ`, `lookback_days=30` | partial | no |
| Issuer-matched news is qualitative context | China listed company financial news API | `symbol=300750.SZ`, `lookback_days=7` | proxy_only | yes |

These rows illustrate report shape only. In a real report, retain a row only when its observed execution and payload pass the data-quality gate.

## Market Data Read

Quote and bars may support a descriptive market-data read. Calculate MA, RSI, MACD, and BOLL only from validated QVeris-supplied bars, state each lookback, and keep the wording non-prescriptive.

Sector performance, A+H mapping, and IPO timelines remain missing unless directly discovered tools return fields that prove those meanings.

## Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `sector_fund_flow`, `a_h_mapping`, `hk_ipo_timeline`, `text_sentiment`.

Suppressed fields: paper trading, account or order actions, entry or exit triggers, position size, stop-loss instructions, target prices, ratings, and buy or sell wording.

Observed call count: `0`. Evidence rows above are illustrative and are not observed results.

## Trace Appendix

| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |
|---|---|---|---|---|---|---|---|

Not investment advice.
