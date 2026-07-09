# TSLA Fresh Live Market Intelligence Attempt

## Summary

Evidence status: `insufficient`.

Fresh live output record from the current Codex run. A QVeris credential was present, but the minimum identity CAP returned `fetch failed`, so no issuer, news, sentiment, or signal-monitor conclusion is supported.

## Evidence

No validated live payload is available. Failed CAP attempts are recorded in Data Quality And Missing Fields and Trace Appendix, not as supporting evidence.

## Analysis

The skill should stop at an honest degradation path. It can say the market-intelligence read is unavailable due to live CAP connectivity failure. It must not infer identity, sentiment, catalyst, forecast, or signal direction.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `news_context`, `validated_numeric_sentiment`, `signal_monitoring_evidence`.
- `data_quality.status`: `limited`.
- Live attempted capability: `qveris_finance.ref_symbology`.
- Failure reason: `fetch failed`.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=TSLA`, `market=US` | failed: fetch failed | none |

Not investment advice.
