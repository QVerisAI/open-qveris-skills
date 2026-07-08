## Summary

- Scope: `600519.SH`, `000001.SZ`, `000858.SZ`; as-of `2026-07-08`; QVeris-only; no web search; no file changes.
- Runtime controls: `dry_run=false`, `max_calls=unlimited`, `max_age=P1D`, conservative budget use.
- Result: comparable cross-sectional factor ranking is **not supported** because only `600519.SH` returned a sufficient multi-day EOD window; valuation/quality ratios were unavailable for CN market through `qveris_finance.fundamentals_derived_ratios`.

## Screen Results

| Security | Name / Identity | Industry | Latest Usable Market Point | Multi-Day Factor Window | Valuation / Quality | Component Coverage | Evidence Status | Missing / Rejected Fields |
|---|---|---|---:|---|---|---:|---|---|
| `600519.SH` | 贵州茅台 / Kweichow Moutai; CN, CNY, SHH validated | 食品饮料 / 白酒Ⅱ / 白酒Ⅲ | EOD close `1188.80` on `2026-07-07` | 21 bars, `2026-06-08` to `2026-07-07`; return `-5.87%`; avg volume `4,357,837`; ann. vol `24.17%` | Missing | `4/5` | `partial` | L1 stale timestamp; valuation ratios unsupported for CN |
| `000001.SZ` | 平安银行 from market/industry payload; security master partial | 银行 / 股份制银行Ⅱ | L1 `10.53`, `+0.57%`, `2026-07-08 11:30`; EOD one-bar `10.53` | Insufficient: 1 bar only | Missing | `2/5` plus partial identity | `partial` | `ref_symbology` mismatch; multi-day factors unavailable; ratios unsupported |
| `000858.SZ` | 五粮液 from market payload; security master partial | Rejected: classification returned non-target instrument | L1 `71.49`, `-0.32%`, `2026-07-08 11:30`; EOD one-bar `71.49` | Insufficient: 1 bar only | Missing | `1/5` plus partial identity | `partial` | `ref_symbology` mismatch; industry semantic mismatch; multi-day factors unavailable; ratios unsupported |

No investment ranking is produced. The table is a factor-evidence coverage screen, not a preference order.

## Evidence

| Evidence Type | `600519.SH` | `000001.SZ` | `000858.SZ` |
|---|---|---|---|
| Security master | `Kweichow Moutai Co., Ltd.`, `600519.SH`, CN, CNY, exchange `SHH`, ISIN `CNE0000018R8` | symbol `000001.SZ`, CNY, listing date `1991-07-15`; name/exchange blank | symbol `000858.SZ`, CNY, listing date `2013-11-06`; name/exchange blank |
| Symbology | Validated as `600519.SS`, same issuer, CN/CNY/SHH | Rejected: returned `000001.SH`, not requested `.SZ` | Rejected: returned `000858.SH`, not requested `.SZ` |
| Industry | 贵州茅台, 食品饮料, 白酒Ⅱ, 白酒Ⅲ | 平安银行, 银行, 股份制银行Ⅱ | Rejected: returned `0401003`, “04央行票据3(已到期)” |
| EOD bars | 21 observations, correct symbol | 1 observation, correct symbol/name | 1 observation, correct symbol/name |
| L1 quote | Rejected as stale: timestamp `2025-06-16` | Valid point snapshot: `2026-07-08T11:30`, CNY | Valid point snapshot: `2026-07-08T11:30`, CNY |
| Derived ratios | CN unsupported, no usable payload | CN unsupported, no usable payload | CN unsupported, no usable payload |

## Analysis

`600519.SH` has the strongest evidence coverage because identity, industry, and 21-day EOD factor window all passed validation. Its usable window shows negative simple momentum over the sampled period, with sufficient observations for realized volatility and average volume context.

`000001.SZ` has usable same-day point-in-time market and industry evidence, but multi-day factor scoring is blocked by a one-bar EOD payload and incomplete/mismatched reference identity fields.

`000858.SZ` has usable same-day market point evidence, but industry classification is rejected due to a semantic mismatch, and multi-day factor scoring is also blocked by a one-bar EOD payload.

Because the valuation/quality capability returned `unsupported_market` for CN and the EOD windows are not comparable across all three securities, this note should be read as a coverage and evidence-quality screen only.

## Data Quality And Missing Fields

| Issue | Affected Securities | Reason Code | Treatment |
|---|---|---|---|
| `fundamentals_derived_ratios` unavailable for CN | All three | `unsupported_market` | Valuation and profitability factors marked missing |
| One-bar EOD payload | `000001.SZ`, `000858.SZ` | `insufficient_observations` | No momentum, volatility, or multi-day liquidity metrics |
| `ref_symbology` returned `.SH` for `.SZ` requests | `000001.SZ`, `000858.SZ` | `semantic_mismatch` | Rejected as identity evidence |
| Industry classification returned non-equity/bond-like instrument | `000858.SZ` | `semantic_mismatch` | Rejected as industry evidence |
| L1 timestamp stale | `600519.SH` | `stale_proxy` | Rejected for current snapshot; EOD bars retained |
| Security master fields blank | `000001.SZ`, `000858.SZ` | `partial_identity` | Used only with corroborating market/industry payloads |

## Trace Appendix

| Capability | Parameters | Status | Fallback | Rejection / Note |
|---|---|---|---|---|
| `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN` | success | false | Valid identity |
| `qveris_finance.ref_security_master` | `symbol=000001.SZ`, `market=CN` | success | false | Partial fields only |
| `qveris_finance.ref_security_master` | `symbol=000858.SZ`, `market=CN` | success | false | Partial fields only |
| `qveris_finance.ref_symbology` | each symbol, `market=CN` | mixed | false | `600519.SH` valid; `.SZ` names rejected due `.SH` mismatch |
| `qveris_finance.mkt_bars_eod` | `2026-06-08` to `2026-07-08`, `interval=D`, `market=CN` | mixed | false | `600519.SH`: 21 bars; `.SZ`: 1 bar each |
| `qveris_finance.mkt_l1_rt` | each symbol, `market=CN` | mixed | false | `.SZ` valid point snapshots; `600519.SH` stale timestamp |
| `qveris_finance.fundamentals_derived_ratios` | each symbol, `market=CN`, `date=2026-07-08` | failure | false | CN market unsupported |
| `qveris_finance.ref_classification_industry` | each symbol, `market=CN` | mixed | false | `600519.SH`, `000001.SZ` valid; `000858.SZ` semantic mismatch |

Not investment advice.
