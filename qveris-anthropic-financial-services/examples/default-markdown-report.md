# NVDA Earnings Context Memo

## Summary

Evidence status: `partial`.

The memo can summarize the available QVeris earnings context and market quote. It cannot assert beat/miss, management quotes, or aligned cash-flow conclusions unless the corresponding primary QVeris evidence passes validation.

## Evidence Used

| Evidence | Status | Use |
|---|---|---|
| Entity/profile | `complete` | Confirms requested company identity. |
| Earnings calendar | `partial` | Establishes event context when available. |
| Actual/surprise | `insufficient` | Do not state beat/miss if unavailable. |
| Statements | `partial` | Use only aligned fiscal periods. |
| Tagged news | `proxy_only` | Qualitative background only. |

## Analysis

State only conclusions supported by validated QVeris payloads. Keep rejected statement fields out of aligned tables and explain the rejection in data quality.

## Data Quality And Missing Fields

- `earnings_actual_surprise`: unavailable or failed, so beat/miss is not supported.
- `transcripts_earnings_call`: unavailable, so management quotes are not supported.
- `fundamentals_cf`: excluded if fiscal period or net income conflicts with IS.

## What This Can Support

- A context memo.
- A missing-evidence checklist.
- Narrow trailing statement observations from aligned data.

## What This Cannot Support

- Investment recommendation.
- Target price or upside.
- Beat/miss without actual and consensus.
- Management quotes without transcript evidence.

## Trace Appendix

Use a compact table for user-facing trace. Include full `qveris_trace` JSON only when requested or when preparing schema fixtures.

Not investment advice.
