# NVDA AlphaEar-Style Sentiment Monitor

## Summary

Evidence status: `proxy_only`.

The natural-language test output degrades correctly when primary sentiment evidence is unavailable or returns empty signal fields. It can provide qualitative news context and a list of missing fields, but it cannot provide a numeric sentiment score or signal-strength conclusion.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Primary sentiment is needed for a numeric score. | `qveris_finance.sentiment_text_signals` | `symbol=NVDA`, `market=US`, `window=P7D` | failed or empty in fallback scenario | tagged news |
| Tagged news is background context only. | `qveris_finance.news_fin_tagged` | `symbol=NVDA`, `market=US`, `limit=5` | fallback context | primary sentiment failed |

## Analysis

The report should say that the sentiment layer is incomplete. The monitoring read can note that the evidence set changed, but it cannot label the move as a strengthened or weakened investment signal without validated sentiment or cluster evidence.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `numeric_sentiment_score`, `sentiment_magnitude`, `validated_sentiment_signal_fields`, `validated_news_cluster`.
- `data_quality.status`: `proxy_only`.
- `fallback_used`: true for the tagged-news context.
- Empty `signal`, `text_cue`, score, or label fields are `sentiment_signal_empty`, not weak sentiment.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. The fallback scenario above is a behavior test, not a saved call trace.

Not investment advice.
