# Natural Language Test Output - 2026-07-07

## Prompt

```text
用 qveris-tradermonty-trading-skills 看这个只读组合风险：AAPL 40%、NVDA 35%、MSFT 25%。
```

## Summary

Evidence status: `proxy_only`.

The skill produced a Markdown risk/regime monitor. It identified concentration and beta-heavy exposure from holding weights and beta/vol evidence, but it did not present a full portfolio risk model because bars, breadth, index, macro, and correlation evidence were incomplete or rejected.

## Primary Evidence

| Area | Evidence status | User-facing handling |
|---|---|---|
| Holdings intake | `complete` | Read-only concentration analysis. |
| Holding beta/vol | `partial` | Used as monitor evidence, not a full risk model. |
| Index/breadth | `insufficient` | No full market-regime call. |
| Historical bars | `insufficient` | No VaR, drawdown, realized volatility, or correlation matrix. |
| News/institutional | `partial` | Context only when payloads pass quality checks. |

Failed, rejected, unavailable, and weak-relevance capabilities were kept out of `Primary Evidence` and reported below.

## Proxy Evidence

| Proxy | Status | Handling |
|---|---|---|
| `qveris_finance.index_vix` | available in tests | Proxy-only regime evidence. |
| `qveris_finance.rates_govt_benchmark` | stale/monthly risk | Lagged proxy only. |
| `qveris_finance.mkt_bars_adjusted` for liquid ETFs | thin windows possible | Proxy-only; no multi-day risk metrics without enough observations. |

## Data Quality And Missing Fields

| Field | Status | Handling |
|---|---|---|
| `mkt_breadth_internals` | repeated `503` | Missing; lower regime confidence. |
| `index_levels` for `SPX` | semantic mismatch observed | Hard reject wrong asset; do not use as index evidence. |
| `macro_actual_vs_forecast` | unavailable, `404` | Use `event_calendar_macro` only as weak event context. |
| `flow_sector_capital` | unavailable, `404` | Use top movers, constituents, and classification only as weaker sector context. |
| `mkt_bars_adjusted` | possible one-row return | No correlation, VaR, trend, drawdown, or realized volatility. |
| News or sector rows | issuer/benchmark relevance required | Mark `entity_mix` or `weak_relevance` when rows do not match the resolved holding or benchmark. |
| Long payloads | summarized | Mark `payload_summarized` or `payload_truncated` instead of expanding raw rows. |

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.risk_beta_vol` | `symbol=AAPL/NVDA/MSFT`, `market=US`, `benchmark_symbol=SPY` | success or retry success | beta monitor only |
| `qveris_finance.ref_classification_industry` | holding symbols | success when available | sector exposure context |
| `qveris_finance.index_levels` | `symbol=SPX`, `market=US` | rejected on wrong asset | no primary index evidence |
| `qveris_finance.mkt_breadth_internals` | `market=US` | failed after retries, `503` | proxy-only regime |
| `qveris_finance.index_vix` | `symbol=VIX`, `region=US` | success when available | proxy evidence |
| `qveris_finance.rates_govt_benchmark` | `symbol=US10Y` | usable only if fresh enough | lagged proxy |
| `qveris_finance.mkt_bars_adjusted` | liquid ETF symbols, date window | insufficient if fewer than 2 observations | latest-point context only |
| `qveris_finance.event_calendar_macro` | US date window | available as event context | not macro surprise |

## What This Cannot Support

This output cannot support a rebalance instruction, trade plan, buy/sell action, target-price language, full portfolio VaR, or correlation matrix.

Not investment advice.
