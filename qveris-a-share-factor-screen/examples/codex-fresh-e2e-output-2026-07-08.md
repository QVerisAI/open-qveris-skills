## Summary

As of 2026-07-08, QVeris CAP evidence supports a partial A-share factor coverage note for `600519.SH`, `300750.SZ`, and `002594.SZ`.

Controls: `dry_run=false`, `max_calls=not set`, `max_age=P1D`, budget note: conservative live CAP use. No web or non-QVeris data was used.

Main result: no cross-sectional factor rank is valid, because the price windows and factor coverage are not comparable across all three securities. `600519.SH` has a usable multi-day EOD bar window; `300750.SZ` and `002594.SZ` only returned one EOD bar each, so momentum, volatility, and liquidity factors are missing for those two.

## Screen Results

| Security | Identity Evidence | Industry Evidence | Latest Validated Price Point | Multi-Day Price Factors | Valuation / Quality | Component Coverage | Evidence Status | Missing Fields |
|---|---|---|---:|---|---|---:|---|---|
| `600519.SH` | Security master matched mainland CNY equity | Food & beverage / baijiu classification matched issuer | 1188.80 CNY on 2026-07-07 | 19 bars, 2026-06-10 to 2026-07-07 | Missing | 3/5 | partial | CN derived ratios unavailable; no 2026-07-08 bar in returned window |
| `300750.SZ` | Symbology matched CNY equity, normalized as `300750.SHZ` | Rejected: semantic mismatch | 361.00 CNY on 2026-07-08 | Missing: one bar only | Missing | 2/5 | partial | security master retry failed; industry rejected; no multi-day bars; CN derived ratios unavailable |
| `002594.SZ` | Symbology matched CNY equity, normalized as `002594.SHZ` | Rejected: semantic mismatch | 87.80 CNY on 2026-07-08 | Missing: one bar only | Missing | 2/5 | partial | security master retry failed; industry rejected; no multi-day bars; CN derived ratios unavailable |

## Evidence

For `600519.SH`, validated EOD bars support a narrow price-factor read: over the returned 19 observations from 2026-06-10 to 2026-07-07, close-to-close return was `-6.83%`, annualized realized volatility from daily log returns was about `24.55%`, average daily volume was about `4.51 million shares`, and drawdown from the returned-window closing high was about `-7.98%`.

For `300750.SZ`, the only accepted price evidence is the 2026-07-08 bar: open `374.00`, high `376.68`, low `361.00`, close `361.00`. One observation cannot support momentum, realized volatility, or liquidity factors.

For `002594.SZ`, the only accepted price evidence is the 2026-07-08 bar: open `86.01`, high `88.34`, low `85.28`, close `87.80`. One observation cannot support momentum, realized volatility, or liquidity factors.

## Analysis

`600519.SH` has the best coverage in this run, but that is a coverage result, not a stock preference. Its returned price window ended on 2026-07-07, one trading day before the requested as-of date, so even its price-factor evidence is partial for a 2026-07-08 note.

`300750.SZ` and `002594.SZ` were validated as CNY equities through `qveris_finance.ref_symbology`, but the security-master route failed after retry and the industry route returned mismatched entities. Their one-bar price payloads are usable only as latest-point observations.

Because valuation/quality ratios returned `unsupported_market` for CN, no PE, PB, ROE, margin, leverage, or comparable quality factor is included.

## Data Quality And Missing Fields

No factor ranking was produced. The comparable-factor gate failed because all three securities did not share the same validated multi-day price window and fiscal-period factor set.

Rejected evidence: `qveris_finance.ref_classification_industry` for `300750.SZ` and `002594.SZ` due to semantic mismatch.

Missing evidence: CN valuation/quality ratios, multi-day EOD bars for `300750.SZ` and `002594.SZ`, and clean security-master validation for the two Shenzhen tickers after retry.

## Trace Appendix

| Capability | Parameters | Success / Failure | Fallback | Rejection Reason |
|---|---|---|---|---|
| `qveris_finance.ref_security_master` | `600519.SH`, CN, 2026-07-08 | success | no | none |
| `qveris_finance.ref_security_master` | `300750.SZ`, CN, 2026-07-08 | failed after retry | `qveris_finance.ref_symbology` | provider_error |
| `qveris_finance.ref_security_master` | `002594.SZ`, CN, 2026-07-08 | failed after retry | `qveris_finance.ref_symbology` | provider_error |
| `qveris_finance.ref_symbology` | `300750.SZ`, CN, 2026-07-08 | success | yes | partial suffix normalization |
| `qveris_finance.ref_symbology` | `002594.SZ`, CN, 2026-07-08 | success | yes | partial suffix normalization |
| `qveris_finance.mkt_bars_eod` | all three, CN, 2026-06-10 to 2026-07-08, D | success | no | one-bar windows rejected for multi-day factors on `300750.SZ`, `002594.SZ` |
| `qveris_finance.fundamentals_derived_ratios` | all three, CN, 2026-07-08 | failed | no | unsupported_market |
| `qveris_finance.ref_classification_industry` | all three, CN, 2026-07-08 | mixed | no | semantic_mismatch for `300750.SZ`, `002594.SZ` |

Not investment advice.