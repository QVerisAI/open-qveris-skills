# TSLA Market Intelligence Note

## Summary

Evidence status: `partial`.

This static default example defines the report contract. It does not claim any live QVeris payload, numeric sentiment, forecast, or trade trigger.

## Evidence

No validated live payload is claimed in this default example. Evidence belongs here only after a QVeris payload is actually called and passes identity, window, shape, and relevance checks.

## Analysis

AlphaEar-style signal tracking is translated into monitoring language. A valid note may say which evidence changed, which evidence is stale, and which fields are missing. It must not turn that monitoring read into a forecast or execution plan.

## Data Quality And Missing Fields

- `missing_fields`: `validated_numeric_sentiment`, `validated_sentiment_signal_fields`, `validated_news_cluster`, `forecast_output`.
- `data_quality.status`: `partial`.
- Required next calls before a real report can cite evidence: `qveris_finance.ref_symbology`, `qveris_finance.news_fin_tagged`, and `qveris_finance.sentiment_text_signals` if numeric sentiment is requested.
- If sentiment rows have empty `signal`, `text_cue`, score, or label fields, mark `sentiment_signal_empty` and present only a signal-coverage check.
- Tagged news is qualitative only; it cannot support strong sentiment, strong catalyst, or directional risk by itself.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

No live `qveris_trace` is attached to this static default example because no CAP call was executed.

Not investment advice.
