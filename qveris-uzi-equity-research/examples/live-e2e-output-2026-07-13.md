# qveris-uzi-equity-research Live E2E

## Summary

Case `uzi-a-share-specialty-gate` executed one live QVeris CAP call. Observed status: `failed`; broader skill conclusions remain out of scope for this contract check.

## Evidence

The live CAP attempt failed, so it supplies call-availability evidence only and no positive market or issuer evidence.

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- `data_quality.status`: `insufficient`.
- `missing_fields`: `["cap_call_failed"]`.
- Observed-call artifact: `live-e2e-output-2026-07-13.observed-calls.json`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| `qveris_finance.flow_dragon_tiger` | `{"symbol":"002594.SZ","market":"CN","start_date":"2026-06-13","end_date":"2026-07-13"}` | failed | 425a3a8e-013b-41a4-8b89-6b888d743edc | false | `["cap_call_failed"]` |

Observed call count: `1`.

Not investment advice.
