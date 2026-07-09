# 600519.SH Equity Research Method Audit

## Summary

Evidence status: `partial`.

This report can support a QVeris-only equity research method audit for issuer identity, basic market context, validated ratios, and missing specialty layers. It cannot support a target output, upside/downside, LHB conclusion, trap-risk conclusion, or trading action without validated evidence.

## Evidence

| Claim | qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| A-share identity must include the exchange suffix. | `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | required | none |
| Valuation context is descriptive unless assumptions are complete. | `qveris_finance.fundamentals_derived_ratios` | `symbol=600519.SH`, `market=CN` | partial | no model output |
| LHB and flow layers are conditional. | `qveris_finance.flow_dragon_tiger` | `symbol=600519.SH`, `market=CN`, `window=P30D` | not called in default example | capability verification required |

## Analysis

UZI-style deep analysis is converted into an evidence-backed method audit. The report can show which valuation inputs exist, which specialty layers are missing, and which risk checks remain untested. It must not produce a target output or action recommendation.

## Data Quality And Missing Fields

- `missing_fields`: `validated_lhb_rows`, `validated_large_order_flow`, `validated_trap_risk_social_evidence`, `forward_valuation_assumptions`.
- `data_quality.status`: `partial`.
- Tagged news alone cannot support proof of manipulation, fraud, strong sentiment, or directional risk.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`, `safe_to_trade`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | planned required call | none |
| `qveris_finance.fundamentals_derived_ratios` | `symbol=600519.SH`, `market=CN` | descriptive context | no model output |
| `qveris_finance.flow_dragon_tiger` | `symbol=600519.SH`, `market=CN`, `window=P30D` | conditional not called | capability verification required |

Not investment advice.
