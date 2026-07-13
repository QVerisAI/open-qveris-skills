# Summary

Prompt tested: use `qveris-a-share-factor-screen` to run a live A-share research screen for `600519.SH`, `000001.SZ`, and `000858.SZ`.

Live smoke result: the screen must degrade to `partial` and avoid ranking. All three symbols resolved and had quote payloads, but the June 2026 EOD-bar window was comparable for only one symbol. `600519.SH` returned 21 bars, while `000001.SZ` and `000858.SZ` returned 1 bar each. Valuation ratio calls returned 422 for all three names.

# Screen Results

| Security | Identity | Quote | Bars For `2026-06-01..2026-06-30` | Valuation ratios | Screen status |
|---|---|---|---|---|---|
| `600519.SH` | validated | usable payload | 21 rows | failed, 422 | evidence note only |
| `000001.SZ` | validated | usable payload | 1 row | failed, 422 | insufficient observations |
| `000858.SZ` | validated | usable payload | 1 row | failed, 422 | insufficient observations |

# Evidence

| Claim | Trace | Params | Status | Fallback |
|---|---|---|---|---|
| The universe was resolvable. | `qveris_finance.ref_security_master` | `symbols=600519.SH,000001.SZ,000858.SZ`, `market=CN` | 3 usable payloads | false |
| Quote context was available for all names. | `qveris_finance.mkt_l1_rt` | same symbols, `market=CN` | 3 usable payloads | false |
| Multi-day factor ranking was not supported by comparable bars. | `qveris_finance.mkt_bars_eod` | `2026-06-01..2026-06-30`, `interval=1d` | 21, 1, and 1 rows | true |
| Valuation factor inputs were unavailable. | `qveris_finance.fundamentals_derived_ratios` | same symbols, `market=CN` | 422 for all three | true |

# Analysis

The correct screen output is not a ranked list. The live evidence supports only per-name coverage notes because the price windows are not comparable and valuation ratios failed. This is the desired guardrail behavior for Alphasift-style factor screens: a rank requires comparable, validated factor inputs across at least 3 securities.

# Data Quality And Missing Fields

`data_quality.status`: `insufficient`

Missing fields: `comparable_multi_day_bars_for_all_names`, `valuation_ratios`, `cross_sectional_percentiles`, `factor_rank`, `theme_heat`, `sentiment_score`.

Rejected computations: multi-day momentum, liquidity, volatility, and factor rank, because two securities returned only one bar in the requested window.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. This historical pre-contract output has no independent observed-calls artifact; prior trace claims are not treated as verified.

Not investment advice.
