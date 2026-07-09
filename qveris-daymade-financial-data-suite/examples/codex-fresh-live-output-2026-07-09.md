# NVDA Fresh Live Financial Data Pack Attempt

## Summary

Evidence status: `insufficient`.

Fresh live output record from the current Codex run. A QVeris credential was present, but the minimum security-master CAP returned `fetch failed`, so no financial data pack, statement, research, news, or sector daily conclusion is supported.

## Evidence

No validated live payload is available. Failed CAP attempts are recorded in Data Quality And Missing Fields and Trace Appendix, not as supporting evidence.

## Analysis

The skill should stop at an honest degradation path. Missing financial fields must remain missing; no default beta, growth, rate, margin, statement, or sector value can be substituted.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `market_data`, `financial_statements`, `validated_research_reports`, `daily_report_universe`.
- `data_quality.status`: `limited`.
- Live attempted capability: `qveris_finance.ref_security_master`.
- Failure reason: `fetch failed`.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_security_master` | `symbol=NVDA`, `market=US` | failed: fetch failed | none |

Not investment advice.
