## Summary

This static contract example illustrates an A-share factor-screen layout and does not claim live QVeris calls. A real run must show coverage tiers and the comparable subset before any rank.

Controls: `dry_run=false`, `max_calls=12`, `max_age=P1D`, `budget_note=small universe factor screen`.

Factor-screen validity: `degraded` (`insufficient_lookback_observations`, `fiscal_quarter_unproven`, `sentiment_insufficient`). Ranking allowed: `false`.

## Screen Results

| Coverage Tier | Security | Validated Factors | Prices / Return Intervals | Component Coverage | Evidence Status | Missing Fields |
|---|---|---:|---:|---:|---|---|
| partial_not_ranked | 600519.SH | value, liquidity, stability | 20 / 19 | 3/5 | partial | `momentum_60d`, `FQ_comparison`, `theme_heat` |
| partial_not_ranked | 300750.SZ | liquidity, momentum | 20 / 19 | 2/5 | partial | `valuation_ratios`, `FQ_comparison`, `theme_heat`, `events` |
| proxy_only | 002594.SZ | liquidity, issuer-news context | 20 / 19 | 2/5 | proxy_only | `valuation_ratios`, `momentum_60d`, `sentiment`, `FQ_comparison` |

## Evidence

| Factor | Source | Parameters / Scope | Status | Fallback |
|---|---|---|---|---|
| Universe identity | `qveris_finance.ref_symbology` | `symbols=600519.SH,300750.SZ,002594.SZ`, `market=CN` | complete | no |
| Bars and liquidity | `qveris_finance.mkt_bars_adjusted` | 20 prices, 19 adjacent returns | partial | no |
| Valuation and quality | `qveris_finance.fundamentals_derived_ratios` | `FY2025`; FQ unavailable | partial | no |
| Issuer-news sample | audited Web lane | one opened, issuer-matched, in-window source | insufficient | yes |

## Analysis

Comparable subset: none. No cross-sectional rank is produced because the factor components are not comparable across the same complete denominator. Coverage tiers are not a preference order. FY evidence does not establish FQ comparability. The retrieved issuer-news sample contains one relevant item; sentiment remains `insufficient` and is not generalized to the universe or market.

Post-hoc evaluation, if requested, must use bars after the screen `as_of` date and must be labeled historical evaluation rather than a forecast.

## Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `full_market_universe`, `theme_heat`, `sentiment_score`, `valuation_ratios_for_some_names`, `event_flags_for_some_names`, `cross_sectional_rank`.

Suppressed fields: operation advice, target prices, upside/downside language, buy/sell wording, rebalancing instructions.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Illustrative evidence rows above are report-shape examples, not observed results.

Not investment advice.
