# 600519.SH Equity Research Method Audit

## Summary

Evidence status: `partial`.

This static default example defines the equity research method-audit contract. It does not claim any live QVeris payload, target output, upside/downside, LHB conclusion, trap-risk conclusion, or trading action.

## Evidence

No validated live payload is claimed in this default example. Evidence belongs here only after a QVeris payload is actually called and passes issuer, market, period, window, row-type, and relevance checks.

## Analysis

UZI-style deep analysis is converted into an evidence-backed method audit. The report can show which valuation inputs exist, which specialty layers are missing, and which risk checks remain untested. It must not produce a target output or action recommendation.

## Data Quality And Missing Fields

- `missing_fields`: `validated_lhb_rows`, `validated_large_order_flow`, `validated_trap_risk_social_evidence`, `forward_valuation_assumptions`.
- `data_quality.status`: `partial`.
- Required next calls before a real method audit can cite evidence: `qveris_finance.ref_symbology`, CN financial or ratio CAPs only after the A-share availability matrix confirms support, and conditional `qveris_finance.flow_dragon_tiger` direct fallback only when LHB is explicitly requested and discovery is unavailable.
- Tagged news alone cannot support proof of manipulation, fraud, strong sentiment, or directional risk.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`, `safe_to_trade`.

## Trace Appendix

No live `qveris_trace` is attached to this static default example because no CAP call was executed.

Not investment advice.
