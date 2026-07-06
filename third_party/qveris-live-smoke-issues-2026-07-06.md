# QVeris Live Smoke Issues: First 11 Finance Skills

Date: 2026-07-06

This note records live QVeris CAP behavior observed while testing the first 11 finance skills. Skill-level fallback policies are implemented in the affected skill docs and tool maps. Platform-level provider failures still need QVeris data-router follow-up.

## Summary

| Skill | Primary CAP | Observed issue | Skill-layer mitigation | Platform follow-up |
|---|---|---|---|---|
| `qveris-anthropic-financial-services` | `qveris_finance.earnings_actual_surprise` | Provider 503 | Use `estimates_consensus` plus `event_calendar_earnings`; do not assert beat/miss without actual/surprise data | Fix route/provider health for `EARNINGS.ACTUAL_SURPRISE` |
| `qveris-finance-skills` | `qveris_finance.sentiment_text_signals` | Provider 503 | Use `news_fin_tagged`; output qualitative news context only | Fix route/provider health for `SENTIMENT.TEXT_SIGNALS` |
| `qveris-tech-earnings-deepdive` | `qveris_finance.fundamentals_segment` | Exact discovery unstable; provider 503 | Use `news_fin_tagged`, `transcripts_earnings_call`, and `estimates_consensus`; mark segment data missing | Fix discovery ranking and provider health for `FUNDAMENTALS.SEGMENT` |
| `qveris-hhxg-market` | `qveris_finance.mkt_breadth_internals` | Provider 503 for CN | Use `mkt_l1_rt` for representative A-share quotes; do not emit breadth counts | Fix CN route/provider health for `MKT.BREADTH.INTERNALS` |

## Trace Policy

When any mitigation path is used:

- Set `qveris_trace[].fallback_used` to `true`.
- Include `primary_tool_unavailable` in `missing_fields`.
- Keep the original failed tool in the smoke report for auditability.
- Do not silently convert fallback data into the primary metric.

## Current Test Harness

Run:

```bash
node third_party/scripts/live_smoke_first_11.mjs
```

The script treats a skill as smoke-pass when at least one representative `qveris_finance.*` CAP path succeeds, while preserving failed primary attempts in the generated report.
