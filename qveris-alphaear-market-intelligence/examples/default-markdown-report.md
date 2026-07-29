# TSLA Market Intelligence Note

## Summary

Evidence status: `partial`.

`effective_cutoff`: not bound in this static example. `workflow_guard_status`: `not_run_static_example`.

This static default example defines the report contract. It does not claim any live QVeris payload, numeric sentiment, forecast, or trade trigger.

## Evidence

No validated live payload is claimed in this default example. Evidence belongs here only after a QVeris payload is actually called and passes identity, window, shape, and relevance checks.

## Analysis

AlphaEar-style signal tracking is translated into monitoring language. A valid note may say which evidence changed, which evidence is stale, and which fields are missing. It must not turn that monitoring read into a forecast or execution plan.

## Data Quality And Missing Fields

- `missing_fields`: `validated_numeric_sentiment`, `validated_sentiment_signal_fields`, `validated_news_cluster`, `forecast_output`.
- `data_quality.status`: `partial`.
- Required next collection before a real report can cite evidence: QVeris issuer resolution plus opened, body-hashed Web pages for issuer news and qualitative sentiment.
- Do not call `qveris_finance.news_fin_tagged` or `qveris_finance.sentiment_text_signals` while the temporary Web override is active.
- Fewer than two independent publisher owners means `sentiment=insufficient`; any supported label remains scoped to the qualifying source sample.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`; no CAP call was executed.

Not investment advice.
