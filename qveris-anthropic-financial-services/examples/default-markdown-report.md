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

Do not list unavailable, rejected, or weak-relevance CAPs as supporting evidence in this section.

## Analysis

State only conclusions supported by validated QVeris payloads. Keep rejected statement fields out of aligned tables and explain the rejection in data quality.

## Data Quality And Missing Fields

- `earnings_actual_surprise`: unavailable or failed, so beat/miss is not supported.
- `transcripts_earnings_call`: unavailable, so management quotes are not supported.
- `fundamentals_cf`: excluded if fiscal period or net income conflicts with IS.
- `FY2025 cash flow`: missing if an annual/FY request returns a latest-quarter or TTM-shaped payload after one stricter documented-period retry.
- `research_analyst_reports`: rejected as `weak_relevance` if rows are academic, technical, broad-topic, or not issuer-specific.
- `payload_summarized`: long news, ownership, insider, transcript, or research payloads are summarized in full-workflow reports.

## What This Can Support

- A context memo.
- A missing-evidence checklist.
- Narrow trailing statement observations from aligned data.

## What This Cannot Support

- Investment recommendation.
- Cannot support target price or upside.
- Beat/miss without actual and consensus.
- Management quotes without transcript evidence.

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.event_calendar_earnings` | `symbol=NVDA`, `market=US` | example status | none |
| `qveris_finance.earnings_actual_surprise` | `symbol=NVDA`, `market=US` | example missing | calendar plus consensus only |

Include full `qveris_trace` JSON only when requested or when preparing schema fixtures.

Not investment advice.
