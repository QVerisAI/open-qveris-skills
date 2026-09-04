# Natural Language Test Output - 2026-07-07

## Prompt

```text
用 qveris-finance-skills 做 TSLA 最近 7 天 sentiment 和 valuation note。
```

## Summary

Evidence status: `partial`.

The skill produced a Markdown factor note with qualitative news context and partial valuation inputs. It did not emit a numeric sentiment score because the sentiment CAP failed. It did not infer forward valuation because ratio and consensus CAPs failed.

## Evidence Used

| Factor | Evidence status | User-facing handling |
|---|---|---|
| Entity and quote | `complete` | Used for price snapshot and market-cap context. |
| News context | `proxy_only` | Used qualitatively; no numeric sentiment score. |
| Financial statements | `partial` | Used only when period and payload checks passed. |
| Derived ratios | `insufficient` | No official ratio factor. |
| Consensus | `insufficient` | No forward multiple or expectation claim. |
| Bars/liquidity | `partial` | One-row windows cannot support trend or volatility. |

Unavailable or rejected CAPs were kept out of this evidence table and reported below.

## Data Quality And Missing Fields

| Field | Status | Handling |
|---|---|---|
| `sentiment_text_signals` | missing after repeated `503` | Fall back to qualitative tagged-news context. |
| `news_dedup_cluster` | unavailable, `404` | Do not call as primary unless registry confirms. |
| `fundamentals_derived_ratios` | missing after `503` | Use only manual trailing inputs when source fields exist. |
| `estimates_consensus` | missing after `503` | No forward valuation or expectation claim. |
| `fundamentals_cf` | possible period mismatch | Retry once with stricter documented period params; unresolved mismatch becomes missing. |
| `mkt_bars_adjusted` | insufficient observations | No multi-day trend, realized volatility, or correlation. |
| `news_fin_tagged` | issuer relevance required | Wrong-entity rows would be marked `entity_mix` and excluded from sentiment evidence. |
| Long payloads | summarized | Mark `payload_summarized` or `payload_truncated` instead of expanding raw rows. |

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=TSLA`, `market=US` | success after retry | none |
| `qveris_finance.mkt_l1_rt` | `symbol=TSLA`, `market=US` | success | quote context |
| `qveris_finance.news_fin_tagged` | `symbol=TSLA`, `market=US`, seven-day window | success, broad payload | qualitative context |
| `qveris_finance.sentiment_text_signals` | `symbol=TSLA`, `market=US`, seven-day window | failed after retries, `503` | tagged news only |
| `qveris_finance.fundamentals_is` | `symbol=TSLA`, `market=US`, `period=annual`, `limit=1` | success | trailing input |
| `qveris_finance.fundamentals_bs` | `symbol=TSLA`, `market=US`, `period=annual`, `limit=1` | success | trailing input |
| `qveris_finance.fundamentals_cf` | `symbol=TSLA`, `market=US`, `period=annual`, `limit=1` | rejected if period mismatched | missing if stricter retry still mismatches |
| `qveris_finance.fundamentals_derived_ratios` | `symbol=TSLA`, `market=US` | failed, `503` | raw statements plus quote only |
| `qveris_finance.estimates_consensus` | `symbol=TSLA`, `market=US` | failed, `503` | no forward valuation |

## What This Cannot Support

This output cannot support a numeric sentiment score, forward valuation, return forecast, target-price language, investment advice, or trading action.

Not investment advice.
