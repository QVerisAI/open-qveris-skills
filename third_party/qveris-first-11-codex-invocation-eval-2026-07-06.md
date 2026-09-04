# Codex Skill Invocation Evaluation: First 11 QVeris Finance Skills

Date: 2026-07-06

This evaluation simulates Codex invoking each newly created skill against the latest live QVeris smoke report. It checks whether a Codex-style output can satisfy the skill contract: source record, controls, qveris_trace, fallback marking, missing_fields, and investment-advice disclaimer.

Smoke report used: `reports\qveris-live-smoke-first-11-2026-07-06T09-10-26-891Z.json`

## Summary

- Good: 7
- Usable with warning: 4
- Blocked: 0

| Skill | Verdict | Score | Selected live CAP | Failed primary attempts | Issues / warnings |
|---|---:|---:|---|---|---|
| qveris-anthropic-financial-services | usable-with-warning | 3/4 | `qveris_finance.estimates_consensus` | qveris_finance.earnings_actual_surprise 503 | - |
| qveris-langalpha | good | 4/4 | `qveris_finance.fundamentals_cf` | - | - |
| qveris-eodhd-claude-skills | good | 4/4 | `qveris_finance.ref_company_profile` | - | - |
| qveris-finance-skills | usable-with-warning | 3/4 | `qveris_finance.news_fin_tagged` | qveris_finance.sentiment_text_signals 503 | - |
| qveris-investskill | good | 4/4 | `qveris_finance.filings_structured_xbrl` | - | - |
| qveris-tech-earnings-deepdive | usable-with-warning | 3/4 | `qveris_finance.news_fin_tagged` | qveris_finance.fundamentals_segment 503 | - |
| qveris-day1global-skills | good | 4/4 | `qveris_finance.mkt_l1_rt` | - | - |
| qveris-earnings-tracker | good | 4/4 | `qveris_finance.event_calendar_earnings` | - | - |
| qveris-hhxg-market | usable-with-warning | 3/4 | `qveris_finance.mkt_l1_rt` | qveris_finance.mkt_breadth_internals 503 | - |
| qveris-tradermonty-trading-skills | good | 4/4 | `qveris_finance.index_vix` | - | - |
| qveris-financial-analyst-skills | good | 4/4 | `qveris_finance.filings_regulatory_metadata` | - | - |

## Findings

1. The skills are usable as Codex instructions: all 11 can produce a schema-shaped, trace-backed output from live QVeris CAP evidence.
2. Four skills are usable with warning because their primary CAP path failed or was unstable in live testing, but a documented fallback path worked.
3. The weakest usability point is not skill formatting; it is provider health and discovery quality for a few QVeris CAP routes.
4. Some successful QVeris CAP calls expose underlying `source_provider` names such as Alpha Vantage, FMP, EODHD, or Yahoo in provenance. This is acceptable only as QVeris internal provenance, not as direct skill dependency.

## Recommended Fixes

1. Platform side: fix provider routing for `earnings_actual_surprise`, `sentiment_text_signals`, `fundamentals_segment`, and CN `mkt_breadth_internals`.
2. Skill side: keep the live-tested fallback rules already added to the affected skill docs.
3. Product side: expose a clearer CAP provenance field so users do not confuse internal provider provenance with direct third-party access.
4. Test side: keep `third_party/scripts/live_smoke_first_11.mjs` and this invocation evaluator as pre-promotion checks.
