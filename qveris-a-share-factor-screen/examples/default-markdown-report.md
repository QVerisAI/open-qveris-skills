# Summary

This static contract example illustrates an A-share factor-screen layout and does not claim live QVeris calls. A real run must show coverage tiers and the comparable subset before any rank.

Controls: `dry_run=false`, `max_calls=12`, `max_age=P1D`, `budget_note=small universe factor screen`.

# Screen Results

| Coverage Tier | Security | Validated Factors | Component Coverage | Evidence Status | Missing Fields |
|---|---|---:|---:|---|---|
| partial_not_ranked | 600519.SH | value, liquidity, stability | 3/5 | partial | `momentum_60d`, `theme_heat` |
| partial_not_ranked | 300750.SZ | liquidity, momentum | 2/5 | partial | `valuation_ratios`, `theme_heat`, `events` |
| proxy_only | 002594.SZ | liquidity, news context | 2/5 | proxy_only | `valuation_ratios`, `momentum_60d`, `sentiment_score` |

# Evidence

| Factor | QVeris Capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Universe identity | `qveris_finance.ref_symbology` | `symbols=600519.SH,300750.SZ,002594.SZ`, `market=CN` | complete | no |
| Bars and liquidity | `qveris_finance.mkt_bars_adjusted` | `lookback_days=60` | partial | no |
| Valuation and quality | `qveris_finance.fundamentals_derived_ratios` | `period=latest` | partial | no |
| News context | `qveris_finance.news_fin_tagged` | `lookback_days=7` | proxy_only | yes |

# Analysis

Comparable subset: none. No cross-sectional rank is produced because the factor components are not comparable across the same complete denominator. Coverage tiers are not a preference order. Tagged news is background context and cannot create a sentiment score by itself.

Post-hoc evaluation, if requested, must use bars after the screen `as_of` date and must be labeled historical evaluation rather than a forecast.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `full_market_universe`, `theme_heat`, `sentiment_score`, `valuation_ratios_for_some_names`, `event_flags_for_some_names`, `cross_sectional_rank`.

Suppressed fields: operation advice, target prices, upside/downside language, buy/sell wording, rebalancing instructions.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Illustrative evidence rows above are report-shape examples, not observed results.

Not investment advice.
