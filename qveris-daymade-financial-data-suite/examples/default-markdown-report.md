# NVDA Financial Data Pack Note

## Summary

Evidence status: `partial`.

This static default example defines the financial data-pack report contract. It does not claim any live QVeris payload. Missing financial fields remain missing; the report must not substitute default values.

## Evidence

No validated live payload is claimed in this default example. Evidence belongs here only after a QVeris payload is actually called and passes issuer, period, window, shape, and relevance checks.

## Analysis

The Daymade-style pipeline is converted into a QVeris data-quality pack. Every field is either supported by a validated CAP trace or appears in missing fields. This is especially important for rates, beta, cash flow, shares, and consensus fields.

## Data Quality And Missing Fields

- `missing_fields`: `risk_free_rate`, `validated_research_reports`, `sector_flow`, `pharma_daily_specialty_fields`.
- `data_quality.status`: `partial`.
- Required next calls before a real data pack can cite evidence: `qveris_finance.ref_security_master`, `qveris_finance.fundamentals_is`, and `qveris_finance.news_fin_tagged`.
- No default values are allowed for missing financial fields.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

No live `qveris_trace` is attached to this static default example because no CAP call was executed.

Not investment advice.
