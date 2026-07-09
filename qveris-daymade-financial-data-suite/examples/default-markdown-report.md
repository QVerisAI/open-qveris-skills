# NVDA Financial Data Pack Note

## Summary

Evidence status: `partial`.

This report can support a QVeris-only financial data-pack read when issuer identity, market data, statement periods, ratios, estimates, and news rows pass validation. Missing financial fields remain missing; the report must not substitute default values.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Issuer identity must be resolved before collecting a pack. | `qveris_finance.ref_security_master` | `symbol=NVDA`, `market=US` | required | none |
| Annual statement context can be used only after period checks. | `qveris_finance.fundamentals_is` | `symbol=NVDA`, `period_type=annual`, `limit=3` | partial | statement alignment pending |
| News and research rows require issuer relevance. | `qveris_finance.news_fin_tagged` | `symbol=NVDA`, `market=US`, `limit=5` | qualitative context | none |

## Analysis

The Daymade-style pipeline is converted into a QVeris data-quality pack. Every field is either supported by a validated CAP trace or appears in missing fields. This is especially important for rates, beta, cash flow, shares, and consensus fields.

## Data Quality And Missing Fields

- `missing_fields`: `risk_free_rate`, `validated_research_reports`, `sector_flow`, `pharma_daily_specialty_fields`.
- `data_quality.status`: `partial`.
- No default values are allowed for missing financial fields.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_security_master` | `symbol=NVDA`, `market=US` | planned required call | none |
| `qveris_finance.fundamentals_is` | `symbol=NVDA`, `period_type=annual`, `limit=3` | partial context | statement alignment pending |
| `qveris_finance.news_fin_tagged` | `symbol=NVDA`, `market=US`, `limit=5` | qualitative context | none |

Not investment advice.
