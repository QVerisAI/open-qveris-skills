## Summary

Runtime controls: `dry_run=false`, `max_age=P1D`, `max_calls=unlimited`, budget note: conservative, QVeris finance CAPs only.

As of 2026-07-08, `600519.SH` resolved as the Shanghai A-share listing for Kweichow Moutai / 贵州茅台, ISIN `CNE0000018R8`, CNY. Data quality status is `partial`: market, identity, industry, share structure, ownership-control, latest balance sheet, corporate event, lock-up, and stock-level order-size flow layers were usable. Company profile, income statement, cash-flow statement, derived ratios, issuer-specific news, and sentiment were missing or rejected.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| A-share identity resolved | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN`, `date=2026-07-08` | usable | none |
| Latest quote snapshot available | `qveris_finance.mkt_l1_rt` | `symbol=600519.SH`, `market=CN` | usable | none |
| 21 adjusted daily bars available | `qveris_finance.mkt_bars_adjusted` | `2026-06-08` to `2026-07-08`, `interval=D` | usable; latest bar `2026-07-07` | none |
| Industry classification available | `qveris_finance.ref_classification_industry` | `symbol=600519.SH`, `market=CN` | usable | none |
| Latest balance sheet available | `qveris_finance.fundamentals_bs` | `date=2026-07-08`, `market=CN` | usable as latest Q1 2026 snapshot | annual request rejected |
| Share structure and control data available | `qveris_finance.ownership_share_structure`, `qveris_finance.ref_equity_structure` | `symbol=600519.SH`, `market=CN` | usable | canonical CAP IDs used |
| Corporate event available | `qveris_finance.event_calendar_corp` | `2026-01-01` to `2026-07-08` | usable | none |
| Lock-up calendar available | `qveris_finance.mkt_cn_lock_up` | `2026-01-01` to `2026-12-31` | usable with window caveat | canonical CAP ID used |
| Stock order-size flow available | `qveris_finance.flow_large_order` | `2026-06-08` to `2026-07-08` | usable | canonical CAP ID used |
| News/sentiment unavailable | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | `2026-06-08` to `2026-07-08` | rejected / failed | no sentiment inference |

## Analysis

Validated market snapshot: latest quote price `1199.30` CNY at `2026-07-08T15:09:27`, change `+10.50`, change percent `+0.8832%`, volume `25,776`, open `1188.77`, high `1200.98`, low `1177.00`, previous close `1188.80`.

Validated 21-bar adjusted window: adjusted closes ran from `1234.95577` on 2026-06-08 to `1188.80` on 2026-07-07. Derived from validated bars only: close-to-close return `-3.74%`, average adjusted daily volume about `4.36M` shares, annualized daily log-return volatility about `21.52%`. Latest adjusted bar did not include 2026-07-08, so same-day full-bar metrics are unavailable.

Reference and structure data: security master reports exchange `SHH`, country `CN`, currency `CNY`, sector `Consumer Defensive`, industry `Beverages - Wineries & Distilleries`, IPO date `2001-08-27`. Industry CAP also maps the stock to `食品饮料 / 白酒Ⅱ / 白酒Ⅲ`. Share structure reports `1,250,081,601` shares outstanding, all as A shares and float shares, with `0` restricted shares on 2026-07-08. Using the quote and share count, the simple snapshot market capitalization is approximately `1.499T` CNY.

Latest balance sheet snapshot: Q1 2026 period ending `2026-03-31`, CNY. Total assets `319.919B`, total liabilities `38.783B`, stockholders’ equity `270.894B`, cash and equivalents `48.787B`, inventory `60.692B`, total debt `16.960B`, net debt `-31.827B`.

Corporate and specialty layers: corporate calendar returned a 2026-06-11 annual shareholder meeting event with record date 2026-06-02. Lock-up returned one in-window 2026 event, 2026-05-28, with `2,188,614` unlock shares and `0.17%` unlock ratio; it also returned a 2025-08-30 row outside the requested 2026 window, which is excluded from 2026 evidence. Large-order flow returned 21 rows through 2026-07-07; summed over the window, super-large net was `-151,570.91`, large net `-193,574.65`, medium net `+346,177.56`, small net `-1,032.00` in the CAP’s reported units.

## Data Quality And Missing Fields

`data_quality.status`: `partial`.

Usable fields: identity, ISIN, listing metadata, latest quote, 21 adjusted bars, industry classification, latest balance sheet, share structure, equity-control reference, corporate event, lock-up row, and 21 rows of stock-level order-size flow.

Missing or rejected fields:
- `company_profile`: failed after retryable `503/fetch failed` attempts; marked `failed`.
- `income_statement`: `unsupported_market` for CN; marked `capability_unavailable`.
- `cash_flow_statement`: `unsupported_market` for CN; marked `capability_unavailable`.
- `derived_ratios`: `unsupported_market` for CN; marked `capability_unavailable`.
- `annual_balance_sheet`: first annual request returned Q1 2026; annual interpretation rejected as `period_mismatch`. Re-query without annual period was accepted as latest balance-sheet snapshot.
- `same_day_adjusted_bar_2026_07_08`: missing; adjusted bars ended 2026-07-07.
- `theme_name`: theme payload was duplicated/truncated and had blank theme names; marked `payload_truncated` and `missing_theme_name`.
- `news_context`: tagged news returned unrelated symbols, so rejected as `entity_mix`.
- `sentiment_score`: sentiment CAP failed with `503`; marked `failed`.
- `research_reports`, `LHB/dragon_tiger`, `northbound_flow`, `sector_flow`, `investor_QA`, `ETF_options`: not used as primary evidence in this run; marked `not_called`.

Suppressed fields: target prices, ratings, buy/sell wording, upside/downside, and execution guidance.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. This historical pre-contract output has no independent observed-calls artifact; prior trace claims are not treated as verified.

Not investment advice.
