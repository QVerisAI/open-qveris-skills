# TSLA Direct Market Intelligence Note

## Summary

`report_mode: coverage_monitor`

Evidence status: `insufficient`.

This static format example claims no live QVeris result. Identity, price, fundamentals, news, and sentiment remain unverified.

## Evidence

No validated live evidence is present. Add a claim here only after a direct discovery and execution pair passes identity, window, shape, and relevance checks.

## Analysis

AlphaEar-style signal tracking is descriptive monitoring. A supported note may identify changed, unchanged, stale, or missing evidence, but it must not turn that record into a forecast or action instruction.

## Data Quality And Missing Fields

- `missing_fields`: `issuer_identity`, `requested_market_data`, `fundamentals`, `news_context`, `sentiment`.
- `data_quality.status`: `insufficient`.
- Required first query: `listed security identity and company profile lookup API`.
- Follow with the user's requested tool type, such as `real-time stock quote and historical price bars API`.
- No request was executed in this static example.
- Suppressed fields: `forecast`, `target_price`, `upside`, `recommendation`, `buy_sell`.

Trace verification: unverified static example; no observed-call sidecar exists.

## Trace Appendix

| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |
|---|---|---|---|---|---|---|---|

Observed call count: `0`.

Not investment advice.
