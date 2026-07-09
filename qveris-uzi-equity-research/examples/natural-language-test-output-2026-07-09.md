# 002594.SZ LHB And Trap-Risk Fallback Note

## Summary

Evidence status: `proxy_only`.

The natural-language test output degrades correctly when specialty LHB or flow evidence is unavailable. It can provide identity, market, and qualitative news context, but it cannot support hot-money or trap-risk conclusions.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Specialty LHB evidence requires current CAP verification. | `qveris_finance.flow_dragon_tiger` | `symbol=002594.SZ`, `market=CN`, `window=P30D` | capability unavailable in fallback scenario | none |
| Tagged news can be background context only. | `qveris_finance.news_fin_tagged` | `symbol=002594.SZ`, `market=CN`, `limit=5` | qualitative context | LHB unavailable |

## Analysis

The report should state that LHB, large-order flow, and trap-risk layers are incomplete. It may continue with validated identity and background news, but it cannot infer manipulation, strong sentiment, or market direction from tagged news alone.

## Data Quality And Missing Fields

- `missing_fields`: `validated_lhb_rows`, `validated_large_order_flow`, `trap_risk_social_evidence`, `numeric_sentiment_score`.
- `data_quality.status`: `limited`.
- Specialty rows must not appear as supporting evidence unless identity, date window, and row type match.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`, `safe_to_trade`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.flow_dragon_tiger` | `symbol=002594.SZ`, `market=CN`, `window=P30D` | capability unavailable | none |
| `qveris_finance.news_fin_tagged` | `symbol=002594.SZ`, `market=CN`, `limit=5` | fallback qualitative context | LHB unavailable |

Not investment advice.
