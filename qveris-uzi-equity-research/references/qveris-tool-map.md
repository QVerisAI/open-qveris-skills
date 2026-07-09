# QVeris Tool Map

Source: UZI-Skill, https://github.com/wbh604/UZI-Skill, MIT, evaluation recent activity 2026-07-07. Local snapshot: `third_party/source_repos/34-uzi-skill`, commit `fce996c` on 2026-07-07.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Trace `capability_id` values must also use normalized `qveris_finance.*` names, not short CAP codes.
- Treat raw QVeris response metadata as internal provenance only. Build sanitized trace rows that keep only normalized capability names, parameters, success/failure, fallback, validation result, and missing fields.
- UZI-derived review labels are monitoring language only. Do not convert them into actions.

## Primary CAPs

| Workflow need | Primary QVeris CAPs | Evidence rule |
|---|---|---|
| Symbol and listing | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Reject unresolved, fund, index, or wrong-market matches. |
| Company and industry | `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry` | Use matched issuer and classification only. |
| Price and technical context | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol` | Require sufficient bars for multi-day metrics. |
| Financials | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios` | Require fiscal-period alignment and measurement basis. |
| Forward inputs | `qveris_finance.estimates_consensus` | Use only supported periods; otherwise mark missing. |
| Events and news | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp`, `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | Events must be in-window; tagged news is qualitative only. |
| Research context | `qveris_finance.research_analyst_reports` | Conditional evidence after issuer, report type, and date validation. |

## Conditional A-Share CAPs

- Use `cap-detail` before LHB, large-order flow, northbound flow, lock-up, limit-move, concept, sector heat, top-mover, or investor-interaction routes.
- Only use rows whose stock identity, market, date, and row type match the requested analysis.
- If a specialty route is unavailable, empty, or semantically mismatched, mark `capability_unavailable`, `empty_payload`, or `semantic_mismatch`; do not use legacy data.

## UZI Migration Map

| Original UZI surface | QVeris adaptation |
|---|---|
| Deep analysis | Evidence-backed Markdown research note. |
| Valuation models | Method and assumption audit only; no target output. |
| Investor panel | Removed from runtime; no persona vote in user reports. |
| LHB analyzer | Conditional QVeris LHB or flow context only. |
| Trap detector | Evidence-backed risk-monitor checklist with missing signal disclosure. |
| HTML/report generator | Markdown report with trace appendix. |

## Hard Rejects

- Wrong issuer, wrong market, wrong listing class, index/fund substitutions, or guessed exchange suffix.
- Fewer than 2 bars for multi-day return, trend, volatility, liquidity, drawdown, or correlation.
- Period-mismatched statements used as valuation inputs.
- LHB or flow data used without current CAP verification and row-level identity checks.
- Tagged-news-only output used as proof of manipulation, fraud, strong sentiment, or directional risk.
- Raw internal QVeris provider, route, failover, model, persona, or script metadata in user-facing report or trace.

## Budget Order

1. `qveris_finance.ref_symbology`
2. `qveris_finance.ref_security_master`
3. Quote/bars and fundamentals required for the requested review
4. News/events and research context when relevant
5. Conditional A-share specialty discovery only when requested
