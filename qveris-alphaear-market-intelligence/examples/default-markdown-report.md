# TSLA Market Intelligence Note

## Summary

Evidence status: `partial`.

This report can support a QVeris-only market-intelligence read for issuer identity, price context, tagged-news background, and monitored evidence changes. It cannot support numeric sentiment, a forecast, or a trade trigger unless the relevant QVeris evidence succeeds and passes validation.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Issuer identity should be resolved before analysis. | `qveris_finance.ref_symbology` | `symbol=TSLA`, `market=US` | required | none |
| Tagged news can provide background context. | `qveris_finance.news_fin_tagged` | `symbol=TSLA`, `market=US`, `limit=5` | qualitative only | none |
| Numeric sentiment is not available unless the sentiment CAP succeeds. | `qveris_finance.sentiment_text_signals` | `symbol=TSLA`, `market=US`, recent window | missing in this example | tagged news only |

## Analysis

AlphaEar-style signal tracking is translated into monitoring language. A valid note may say which evidence changed, which evidence is stale, and which fields are missing. It must not turn that monitoring read into a forecast or execution plan.

## Data Quality And Missing Fields

- `missing_fields`: `validated_numeric_sentiment`, `validated_news_cluster`, `forecast_output`.
- `data_quality.status`: `partial`.
- Tagged news is qualitative only; it cannot support strong sentiment, strong catalyst, or directional risk by itself.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=TSLA`, `market=US` | planned required call | none |
| `qveris_finance.news_fin_tagged` | `symbol=TSLA`, `market=US`, `limit=5` | qualitative context | none |
| `qveris_finance.sentiment_text_signals` | `symbol=TSLA`, `market=US`, recent window | missing in example | tagged news only |

Not investment advice.
