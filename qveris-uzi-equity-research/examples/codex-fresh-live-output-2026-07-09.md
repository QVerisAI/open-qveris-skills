# 600519.SH Fresh Live Equity Research Attempt

## Summary

Evidence status: `insufficient`.

Fresh live output record from the current Codex run. A QVeris credential was present, but the minimum A-share identity CAP returned `fetch failed`, so no equity research, valuation-method, LHB, flow, or trap-risk conclusion is supported.

## Evidence

No validated live payload is available. Failed CAP attempts are recorded in Data Quality And Missing Fields and Trace Appendix, not as supporting evidence.

## Analysis

The skill should stop at an honest degradation path. It can say issuer identity could not be validated. It must not guess the exchange, use specialty A-share layers, infer trap risk, or produce a trading conclusion.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `market_data`, `valuation_inputs`, `validated_lhb_rows`, `trap_risk_evidence`.
- `data_quality.status`: `limited`.
- Live attempted capability: `qveris_finance.ref_symbology`.
- Failure reason: `fetch failed`.
- Suppressed fields: `target_price`, `upside`, `recommendation`, `buy_sell`, `safe_to_trade`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | failed: fetch failed | none |

Not investment advice.
