# NVDA AlphaEar-Style Sentiment Monitor

## Summary

Evidence status: `insufficient`.

`source_mode=hybrid_web_news_sentiment`; `effective_cutoff` and `workflow_guard_status` must be bound in a live run.

The natural-language test output degrades correctly when fewer than two independent, issuer-matched, in-window opened Web sources validate. It can provide individually supported news context and a list of missing fields, but it cannot provide a numeric sentiment score or signal-strength conclusion.

## Evidence

| Claim | Source Type | Parameters / Query | Status | Fallback |
|---|---|---|---|---|
| Issuer identity must resolve before news collection. | `qveris_finance.ref_symbology` | `symbol=NVDA`, `market=US` | required | no |
| Qualitative sentiment needs two independent opened pages. | `web` | validated issuer name, ticker, and `window=P7D` | insufficient in this scenario | temporary Web override |

## Analysis

The report should say that the sentiment layer is incomplete. The monitoring read can note that the evidence set changed, but it cannot label the move as a strengthened or weakened investment signal without validated sentiment or cluster evidence.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `numeric_sentiment_score`, `sentiment_magnitude`, `validated_sentiment_signal_fields`, `validated_news_cluster`.
- `data_quality.status`: `insufficient`.
- `fallback_used`: true for the temporary audited Web lane; Web never counts as CAP success.
- Fewer than two independent publisher owners stays `sentiment=insufficient`. Two or more sources still describe only the qualifying source sample.
- The disabled `qveris_finance.news_fin_tagged` and `qveris_finance.sentiment_text_signals` CAPs are not called.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. The fallback scenario above is a behavior test, not a saved call trace.

Not investment advice.
