# Summary

Request: produce a read-only BTC/ETH/SOL market radar with a strict call budget. This is a static natural-language contract test, so evidence status is `budget_limited` and no current market claim is made.

Controls: `dry_run=true`, `max_calls=0`, `max_age={"spot":"PT15M","history":"P1D","rankings":"PT15M","market_mood":"P1D","whale":"PT1H","news_social":"P1D"}`, `budget_note=contract test without live calls`.

# Market Snapshot

Asset identity and current prices are unsupported because `qveris_finance.crypto_ref_master` and `qveris_finance.crypto_spot_rt` were planned but not called.

# History And Technical Context

Historical performance and technical context are unsupported because `qveris_finance.crypto_bars_history` and analytics CAPs were not called. No point-in-time value is substituted for a time-series calculation.

# Rankings And Market Mood

Cross-sectional rankings and market-wide mood are unsupported because `qveris_finance.crypto_market_rankings` and `qveris_finance.crypto_fgi` were not called.

# Whale, News, And Social Context

Whale activity and qualitative corroboration are unsupported because `qveris_finance.crypto_whale`, finance-news, and social-context CAPs were not called.

# Data Quality And Missing Fields

`data_quality.status`: `budget_limited`

Missing fields: `asset_identity`, `spot_snapshot`, `history`, `technical_context`, `market_rankings`, `market_mood`, `whale_activity`, `news_context`, `social_context`.

Suppressed: wallet control, signing, swaps, orders, return forecasts, and transaction instructions.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`.

Not investment advice.
