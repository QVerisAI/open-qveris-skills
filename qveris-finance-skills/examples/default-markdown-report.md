# TSLA Sentiment And Valuation Factor Note

## Summary

Evidence status: `partial`.

The note can present qualitative news context and partial valuation inputs. It cannot produce numeric sentiment, forward valuation multiples, or directional risk conclusions unless the relevant primary QVeris evidence passes validation.

## Factor Table

| Factor | Evidence Status | Read | Missing Or Rejected Inputs |
|---|---|---|---|
| Sentiment | `proxy_only` | Tagged news is background context only. | `sentiment_text_signals`, validated clusters. |
| Valuation | `partial` | Use validated trailing inputs only. | Consensus or derived ratios if unavailable. |
| Liquidity | `insufficient` | Do not compute from fewer than 2 bar observations. | Adequate bars window. |
| Correlation | `insufficient` | Do not compute without validated benchmark and bars. | Valid benchmark/index payload. |
| Entity relevance | `partial` | Use only news rows that match the resolved issuer. | Mixed-entity rows marked `entity_mix`. |

## Evidence Used

Use validated QVeris payloads only. A transport-success response that resolves to the wrong entity, wrong benchmark, stale window, or inconsistent statements belongs in data quality, not in the factor value.

## Data Quality And Missing Fields

- `news_fin_tagged`: qualitative only when sentiment/cluster routes fail.
- `mkt_bars_adjusted`: reject multi-day metrics when fewer than 2 observations return.
- `index_levels`: reject benchmark identity mismatches.
- `fundamentals_cf`: exclude inconsistent CF from aligned valuation tables.
- `FY2025 cash flow`: mark missing if an annual/FY request returns a latest-quarter or TTM-shaped payload after one stricter documented-period retry.
- `news_dedup_cluster`: keep out of evidence unless fresh `cap-detail` confirms availability.
- `entity_mix`: reject similarly named but different entities from sentiment/catalyst evidence.
- `payload_summarized`: summarize long or truncated news payloads in full-factor reports.

## What This Can Support

- Qualitative news context.
- Partial trailing valuation inputs.
- A clear list of missing primary evidence.

## What This Cannot Support

- Numeric sentiment without sentiment evidence.
- Forward multiples without consensus or derived ratios.
- Cannot support return forecast, target price, or buy/sell trigger.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.news_fin_tagged` | `symbol=TSLA`, `market=US`, recent window | example qualitative context | none |
| `qveris_finance.sentiment_text_signals` | `symbol=TSLA`, `market=US`, recent window | example missing | tagged news only |

Include full `qveris_trace` JSON only when requested or when preparing schema fixtures.

Not investment advice.
