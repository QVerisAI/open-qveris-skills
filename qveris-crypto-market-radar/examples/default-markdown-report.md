# Summary

This static contract example shows the shape of a read-only crypto market radar. It does not claim live QVeris calls or current market conditions. A real run must resolve each asset before using spot, history, ranking, technical, or whale evidence.

Controls: `dry_run=true`, `max_calls=0`, `max_age={"spot":"PT15M","history":"P1D","rankings":"PT15M","market_mood":"P1D","whale":"PT1H","news_social":"P1D"}`, `budget_note=static contract example; no calls`.

# Market Snapshot

The minimum asset path is `qveris_finance.crypto_ref_master` followed by `qveris_finance.crypto_spot_rt`. Spot evidence is a timestamped snapshot and cannot support a multi-day trend by itself.

# History And Technical Context

Use `qveris_finance.crypto_bars_history` for a requested window. Derived changes require at least two valid ordered observations; descriptive analytics also require the stated lookback, interval, and enough source observations.

# Rankings And Market Mood

`qveris_finance.crypto_market_rankings` supports cross-sectional discovery. `qveris_finance.crypto_fgi` supports market-wide mood context. Neither is a forecast or asset-specific transaction instruction.

# Whale, News, And Social Context

`qveris_finance.crypto_whale` can support returned large-activity facts after asset, chain, time, amount, unit, and direction checks. Missing direction makes accumulation or distribution interpretations unsupported. News and social evidence remain qualitative corroboration.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing in this static example: `live_asset_identity`, `live_spot`, `live_history`, `live_rankings`, `live_market_mood`, `live_whale_activity`.

Suppressed: wallet control, signing, swaps, orders, target output, return forecasts, and individualized transaction actions.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. The capability names above describe the evidence contract, not observed results.

Not investment advice.
