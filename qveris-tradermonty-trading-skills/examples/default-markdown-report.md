# Portfolio Risk Monitor

## Summary

Evidence status: `partial`.

The monitor can identify concentration and beta/vol evidence when QVeris payloads validate. It cannot present full portfolio VaR, correlation, realized volatility, or market-regime confirmation when bars, benchmark, breadth, or macro evidence is missing or rejected.

## Monitoring Read

State concentration from the user-provided weights using top1, top2, HHI, and effective holdings. Label beta/vol as monitor evidence, not a complete risk model, unless validated bars and benchmark data support the full calculation.

## Primary Evidence

| Evidence | Status | Use |
|---|---|---|
| Holdings weights | `complete` | Concentration review. |
| Beta/vol | `partial` | Beta monitor only when identity checks pass. |
| Bars | `insufficient` | Reject multi-day metrics if fewer than 2 observations return. |
| Index/breadth | `insufficient` | Reject wrong-asset index payloads. |

Unavailable, rejected, or weak-relevance CAPs are not supporting evidence in this section.

## Proxy Evidence

VIX, rates, and liquid ETF bars are `proxy_only` unless primary index and breadth evidence pass validation. Monthly or stale rates are lagged proxies only.

## Data Quality And Missing Fields

- `index_levels`: reject `SPX` responses that are not index evidence.
- `mkt_bars_adjusted`: reject VaR/correlation/volatility calculations from insufficient observations.
- `concentration_thresholds`: high when top1 >= 35%, top2 >= 60%, HHI >= 0.25, or effective holdings <= 4; elevated when top1 is 25%-35%, top2 is 45%-60%, HHI is 0.15-0.25, or effective holdings are 4-7.
- `event_calendar_macro`: macro-event context only, not actual-vs-forecast surprise.
- `news_fin_tagged`: qualitative background only.
- `macro_actual_vs_forecast` and `flow_sector_capital`: not called unless fresh `cap-detail` confirms availability.
- `entity_mix` or `weak_relevance`: broad sector/news rows do not support holding-level risk conclusions.
- `payload_summarized`: summarize long ownership/news payloads in full-workflow reports.

## What This Can Support

- Concentration monitor.
- Beta/vol monitor if QVeris identity checks pass.
- Proxy-only regime context when clearly labeled.

## What This Cannot Support

- Cannot support trade plan, rebalance instruction, target price, or buy/sell point.
- Full portfolio risk model without validated bars, benchmark, and correlation evidence.
- Strong regime call from proxy evidence alone.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.risk_beta_vol` | holding symbols, `benchmark_symbol=SPY` | example partial | beta monitor only |
| `qveris_finance.mkt_breadth_internals` | `market=US` | example missing | VIX/rates/liquid ETF proxies only |

Include full `qveris_trace` JSON only when requested or when preparing schema fixtures.

Not investment advice.
