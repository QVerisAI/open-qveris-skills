# NVDA Direct Sentiment Coverage Monitor

## Summary

`report_mode: coverage_monitor`

Evidence status: `insufficient`.

This static behavior example shows the required degradation when direct sentiment evidence is unavailable or has empty fields. It claims no observed request.

## Evidence

No validated sentiment or news result is present. A live report may add evidence only after issuer-matched, in-window direct QVeris output passes the data-quality rubric.

## Analysis

The note may state that sentiment coverage is unavailable. It may not label sentiment as neutral, weak, strengthened, or weakened without a documented scale and non-empty issuer-matched values. News headlines alone do not establish a directional signal.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `numeric_sentiment_score`, `sentiment_scale`, `independent_source_sample`.
- `data_quality.status`: `insufficient`.
- Primary discovery query: `company news text sentiment analysis API`.
- Optional context query: `company financial news API with publication timestamp`.
- A next-best tool is usable only after its own parameter, identity, and window checks.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

Trace verification: unverified static example; no observed-call sidecar exists.

## Trace Appendix

| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |
|---|---|---|---|---|---|---|---|

Observed call count: `0`.

Not investment advice.
