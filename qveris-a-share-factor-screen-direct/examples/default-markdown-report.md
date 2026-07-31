## Summary

This static contract example shows the direct-QVeris A-share factor-screen layout. It does not claim live requests. A real run must show coverage tiers and the comparable subset before any rank.

Controls: `dry_run=false`, `max_calls=12`, `max_credits=25`, `max_rows=300`, `max_billable_quantity=600`, `max_age=P1D`, `budget_note=small universe direct factor screen`.

## Screen Results

| Coverage Tier | Security | Validated Factors | Component Coverage | Evidence Status | Missing Fields |
|---|---|---:|---:|---|---|
| partial_not_ranked | 600519.SH | value, liquidity, stability | 3/5 | partial | `momentum_60d`, `text_signal` |
| partial_not_ranked | 300750.SZ | liquidity, momentum | 2/5 | partial | `valuation_quality`, `stability`, `events` |
| proxy_only | 002594.SZ | liquidity, news context | 2/5 | proxy_only | `valuation_quality`, `momentum_60d`, `text_signal` |

## Evidence

| Factor | Discovered Tool Type | Intended Parameters | Evidence Status |
|---|---|---|---|
| Universe identity | China A-share security master and exchange lookup API | symbols, market | illustrative only |
| Bars and liquidity | China A-share historical adjusted daily price and volume bars API | symbols, start/end date, interval, adjustment | illustrative only |
| Valuation and quality | China A-share company financial ratios and statements API | symbols, fiscal period | illustrative only |
| News context | China listed company financial news API | symbols, start/end date | illustrative only |

The rows above describe the report shape and minimum tool types. They are not observed requests or supporting live evidence.

## Analysis

Comparable subset: none. No cross-sectional rank is produced because factor components do not share one complete denominator. Coverage tiers are not a preference order. General news is background context and cannot create a numeric text signal by itself.

Post-hoc evaluation, if requested, must freeze the original `as_of` screen and use bars strictly after that date. Label it historical evaluation, not a forecast.

## Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `full_market_universe`, `text_signal`, `valuation_quality_for_some_names`, `event_flags_for_some_names`, `cross_sectional_rank`.

Suppressed fields: operation advice, target prices, ratings, buy/sell wording, rebalancing, and execution instructions.

No independently saved observed-call artifact backs this static example; the Trace is intentionally empty.

## Trace Appendix

| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |
|---|---|---|---|---|---|---|---|

Observed call count: `0`.

Not investment advice.
