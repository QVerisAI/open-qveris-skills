# META Statement Collection Fallback Note

## Summary

Evidence status: `partial`.

The natural-language test output degrades correctly when an annual cash-flow request returns a mismatched period. The mismatched payload is rejected, the requested field is marked missing, and no default value is inserted.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Cash-flow evidence must match the requested fiscal period. | `qveris_finance.fundamentals_cf` | `symbol=META`, `period=annual`, `fiscal_year=2025`, `limit=1` | rejected period mismatch | stricter retry |
| Stricter retry still must be validated. | `qveris_finance.fundamentals_cf` | `symbol=META`, `period_type=annual`, `fiscal_year=2025`, `fiscal_period=FY`, `limit=1` | missing after retry | none |

## Analysis

The requested FY2025 cash flow is missing due to period mismatch. The report can continue with identity, income statement, or other validated evidence if present, but it must exclude the mismatched cash-flow field from aligned financial tables or valuation inputs.

## Data Quality And Missing Fields

- `missing_fields`: `FY2025 cash flow missing due to period mismatch`, `free_cash_flow`, `capex_basis`, `cash_flow_statement_alignment`.
- `data_quality.status`: `limited`.
- A successful transport response is not usable evidence when the requested period does not match.
- Reconcile same-period CF net income to IS net income before using CF in aligned financial tables; reject material conflicts as `statement_semantic_mismatch`.
- Normalize valuation aliases such as `pe_ttm` to canonical `pe_ratio` before marking valuation fields missing.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. The retry scenario above is a behavior test, not a saved call trace.

Not investment advice.
