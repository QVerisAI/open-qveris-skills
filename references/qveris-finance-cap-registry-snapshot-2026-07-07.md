# QVeris Finance CAP Registry Snapshot - 2026-07-07

This snapshot documents CAP routes used by QVeris finance skills in this repository as of 2026-07-07, with later audit notes where relevant. Treat it as a dated audit artifact, not a promise that the live registry will remain unchanged.

## 2026-07-22 Runtime Audit Addendum

- Resolve every logical name from the live registry. The current canonical forward-estimates ID is `ESTIMATES.CONSENSUS` for `qveris_finance.estimates_consensus`; the retired `FUNDAMENTALS.CONSENSUS` spelling must not be hard-coded.
- `EVENT.CALENDAR.CORP` is query-shape sensitive: a broad `600519.SH` query can return usable corporate events while an issuer-plus-window query may legitimately be empty. Do not change the issuer merely to obtain data for a benchmark assertion.
- `FLOW.DRAGON_TIGER` list semantics use a trading `date` and `granularity=daily` without a stock symbol. A symbol-scoped request asks whether that issuer appeared on the list and may be a healthy empty result.
- `RESEARCH.ANALYST_REPORTS` may return a signed full-content object; fetch and validate it before declaring the CAP empty.
- Current A-share hard semantic blockers remain service/data issues, not parameter problems, when reproduced: stale `MKT.L1.RT`, wrong-issuer/market `NEWS.FIN.TAGGED`, all-zero `FLOW.CROSS_BORDER` or `FLOW.NORTHBOUND`, and out-of-window `MKT.CN.LOCK_UP`. Keep those layers missing until a fresh call passes the semantic gates.

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

## A-Share Live Verification Update - 2026-07-08

These routes were rechecked with direct QVeris CAP HTTP calls on 2026-07-08. Treat this as a dated live-smoke result, not a permanent guarantee.

| Capability | Detail status | Query smoke status | Default handling |
|---|---|---|
| `qveris_finance.ref_classification_industry` | success | usable payload for `600519.SH` | Can support A-share industry context after identity validation. |
| `qveris_finance.ref_classification_theme` | success | transport success but empty payload for `600519.SH` | Keep theme/concept tags missing unless payload is non-empty. |
| `qveris_finance.mkt_bars_eod` | success | 21 bars for `600519.SH`, 1 bar for `000001.SZ` and `000858.SZ` in the smoke window | Use only after observation-count checks; reject one-bar windows for multi-day metrics. |
| `qveris_finance.analytics_tech_indicators` | success | 503 for RSI smoke test | Prefer calculated indicators from validated bars; mark CAP-based indicator missing on failure. |
| `qveris_finance.mkt_top_movers` | success | usable payload for CN top movers | Proxy evidence only; not a replacement for flow, heatmap, or limit-board pools. |
| `qveris_finance.research_analyst_reports` | success | transport success but empty payload for `600519.SH` | Do not use as evidence unless payload is non-empty and issuer/report relevance validates. |
| `qveris_finance.event_calendar_corp` | success | usable payload for `600519.SH` | Can support event context after issuer/window validation. |
| `qveris_finance.flow_dragon_tiger` | success | 503 for `600519.SH` smoke test | Keep LHB missing on failure. |
| `qveris_finance.mkt_cn_lock_up` | success | 2 rows for `600519.SH` smoke test | Can support lock-up calendar after issuer/window validation. |
| `qveris_finance.flow_large_order` | success | 21 rows for `600519.SH` smoke test | Can support stock-level order-size flow after issuer/window validation. |
| `qveris_finance.flow_northbound` | success | 503 for `600519.SH` smoke test | Keep northbound detail missing on failure. |
| `qveris_finance.flow_cross_border` | success | 503 for northbound CN smoke test | Keep cross-border flow missing on failure. |
| `qveris_finance.flow_sector_capital` | success | returned payload, but smoke row had stock-level fields instead of sector fields | Hard reject for sector-flow claims unless returned fields identify sector/concept explicitly. |
| `qveris_finance.mkt_cn_concept` | success | 503 for `600519.SH` smoke test | Keep concept heat missing on failure. |
| `qveris_finance.event_calendar_ipo` | success | usable payload for CN calendar smoke test | Can support IPO calendar context, not A+H mapping by itself. |
| `qveris_finance.ownership_share_structure` | success | usable payload for `600519.SH` | Can support share-structure context after issuer validation. |
| `qveris_finance.opt_chain` | success | 422 for `510050.SH`, CN ETF option smoke test | Do not use for CN ETF options until params/market support are confirmed. |

## Routes Removed From Primary Paths

| Capability | Observed issue | Rule |
|---|---|---|
| `qveris_finance.news_dedup_cluster` | 2026-07-08 detail succeeded but query returned empty payload for `600519.SH` | Do not use as event-cluster evidence unless query returns non-empty clusters. Use tagged news only as qualitative context. |
| `qveris_finance.macro_actual_vs_forecast` | 404 / invalid capability | Do not call or list as evidence unless a fresh `cap-detail` confirms availability. Use `event_calendar_macro` only as weaker event context and mark actual-vs-forecast missing. |
| `qveris_finance.flow_sector_capital` | 2026-07-08 detail/query succeeded, but smoke payload shape did not prove sector-level semantics | Keep out of primary sector-flow evidence unless returned rows contain explicit sector/concept identifiers. |

## Evidence Placement Rule

Removed, failed, rejected, or weak-relevance capabilities are trace and data-quality facts, not supporting evidence. Keep them out of `Evidence Used`, `Factor Table`, and `Primary Evidence`; place them in `Data Quality And Missing Fields`, `missing_fields`, or `Trace Appendix` with a reason code such as `capability_unavailable`, `failed`, `semantic_mismatch`, `entity_mix`, `weak_relevance`, or `insufficient_observations`.

## Refresh Rule

Refresh this snapshot whenever a primary capability is added, removed, or repeatedly changes behavior. A refresh should include `cap-detail` evidence, observed test date, expected params, and known failure modes.
