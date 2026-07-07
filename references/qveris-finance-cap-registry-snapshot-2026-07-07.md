# QVeris Finance CAP Registry Snapshot - 2026-07-07

This snapshot documents the CAP routes used by the three reviewer-ready finance skills as of 2026-07-07. Treat it as a dated audit artifact, not a promise that the live registry will remain unchanged.

## Primary Callable Routes

| Capability | Skill usage | Status |
|---|---|---|
| `qveris_finance.ref_symbology` | entity validation | primary |
| `qveris_finance.ref_security_master` | entity validation, sector metadata | primary |
| `qveris_finance.ref_company_profile` | company profile, market cap, shares | primary |
| `qveris_finance.mkt_l1_rt` | quote and snapshot price | primary |
| `qveris_finance.fundamentals_is` | income statement | primary with period checks |
| `qveris_finance.fundamentals_bs` | balance sheet | primary with period checks |
| `qveris_finance.fundamentals_cf` | cash flow | primary with period and semantic hard gates |
| `qveris_finance.news_fin_tagged` | qualitative news context | primary or fallback, qualitative only |
| `qveris_finance.mkt_bars_adjusted` | bars, liquidity, proxy ETF bars | primary only when observation count is sufficient |
| `qveris_finance.risk_beta_vol` | beta/vol monitor | primary for beta/vol snapshot |
| `qveris_finance.index_vix` | regime proxy | proxy route |
| `qveris_finance.event_calendar_earnings` | earnings event context | primary or fallback |
| `qveris_finance.event_calendar_macro` | macro event context | weak proxy, not actual-vs-forecast |

## Routes With Observed Failure Or Weak Evidence

| Capability | Observed issue | Default handling |
|---|---|---|
| `qveris_finance.earnings_actual_surprise` | 503/provider errors in live tests | Fall back to calendar plus consensus when available; do not state beat/miss. |
| `qveris_finance.transcripts_earnings_call` | 503/provider errors in live tests | Fall back to tagged news as context only; do not invent management quotes. |
| `qveris_finance.sentiment_text_signals` | 503/provider errors in live tests | Fall back to tagged news as qualitative context only; do not emit sentiment score. |
| `qveris_finance.fundamentals_derived_ratios` | 503/provider errors in live tests | Use raw statements and quote as partial trailing inputs only. |
| `qveris_finance.estimates_consensus` | 503/provider errors in live tests | Do not infer forward multiples or consensus surprise. |
| `qveris_finance.mkt_breadth_internals` | 503/provider errors in live tests | Use VIX/rates/liquid ETF proxies only as proxy evidence. |
| `qveris_finance.index_levels` | Can resolve `SPX` to a non-index security | Validate identity; reject wrong asset and use validated ETF proxy only if clearly labeled. |
| `qveris_finance.rates_govt_benchmark` | Can return stale/monthly observations | Use as lagged proxy only. |
| `qveris_finance.index_constituents` | Param sensitivity and provider failures observed | Use only after `cap-detail` confirms params; mark missing on failure. |

## Routes Removed From Primary Paths

| Capability | Observed issue | Rule |
|---|---|---|
| `qveris_finance.news_dedup_cluster` | 404 / invalid capability | Do not call unless a fresh `cap-detail` confirms availability. |
| `qveris_finance.macro_actual_vs_forecast` | 404 / invalid capability | Do not call unless a fresh `cap-detail` confirms availability. Use `event_calendar_macro` only as weaker event context. |
| `qveris_finance.flow_sector_capital` | 404 / invalid capability | Do not call unless a fresh `cap-detail` confirms availability. Use top movers, constituents, and classification as weaker sector context. |

## Refresh Rule

Refresh this snapshot whenever a primary capability is added, removed, or repeatedly changes behavior. A refresh should include `cap-detail` evidence, observed test date, expected params, and known failure modes.
