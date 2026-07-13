# QVeris Tool Map

Source: UZI-Skill, https://github.com/wbh604/UZI-Skill, MIT, evaluation recent activity 2026-07-07. Local snapshot: `third_party/source_repos/34-uzi-skill`, commit `fce996c` on 2026-07-07.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Required trace fields: `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, `missing_fields`.
- Build rows only from saved `observed_calls`; use normalized `qveris_finance.*` tool names and `execution_id=null` when the call returned none.
- Treat raw QVeris response metadata as internal provenance only. Strip provider, route, candidate, failover, model, persona, and wrapper metadata from the sanitized trace.
- UZI-derived review labels are monitoring language only. Do not convert them into actions.

## Primary CAPs

| Workflow need | Primary QVeris CAPs | Evidence rule |
|---|---|---|
| Symbol and listing | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Reject unresolved, fund, index, or wrong-market matches. |
| Company and industry | `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry` | Use matched issuer and classification only. |
| Price and technical context | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol` | Require sufficient bars for multi-day metrics. |
| Financials | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios` | US/HK: require fiscal-period alignment and measurement basis. CN/A-share: use only after the A-share availability matrix allows it for the current run. |
| Forward inputs | `qveris_finance.estimates_consensus` | Use only supported periods; otherwise mark missing. |
| Events and news | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp`, `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | Events must be in-window; tagged news is qualitative only. |
| Research context | `qveris_finance.research_analyst_reports` | Conditional evidence after issuer, report type, and date validation. |

## Conditional A-Share CAPs

- Use `cap-detail` before LHB, large-order flow, northbound flow, lock-up, limit-move, concept, sector heat, top-mover, or investor-interaction routes.
- If `cap-detail` or alias discovery is unavailable for an explicitly requested LHB or flow layer, attempt at most one direct canonical CAP ID fallback from the table below, then stop and mark missing on failure or semantic mismatch.
- Only use rows whose stock identity, market, date, and row type match the requested analysis.
- If a specialty route is unavailable, empty, or semantically mismatched, mark `capability_unavailable`, `empty_payload`, or `semantic_mismatch`; do not use legacy data.

## A-Share Availability Matrix

Use this matrix before applying US-style research defaults to a CN/A-share request.

| Layer | CN/A-share default | QVeris CAP handling |
|---|---|---|
| Identity/listing | Primary | `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master`; require `.SH` or `.SZ` listing evidence. |
| Quote/bars | Primary when observations pass | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted`, or verified CN bar CAPs; require at least 2 bars for multi-day metrics. |
| Company/industry | Primary when identity passes | `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry`. |
| IS/BS/CF | Conditional | Use only when CAP response explicitly supports `market=CN` and fiscal period aligns; otherwise mark `market_support_unverified`. |
| Derived ratios | Conditional | Use only when CAP returns non-empty CN issuer-matched fields; otherwise mark missing rather than calculating unsupported valuation outputs. |
| Estimates/forward inputs | Conditional | Do not infer forward multiples without issuer-matched consensus or estimate fields. |
| Research reports | Conditional | Require non-empty issuer/report/date fields; suppress ratings and targets. |
| LHB/hot money | Conditional specialty | Use `qveris_finance.flow_dragon_tiger` after detail or direct canonical fallback; row type must identify LHB data. |
| Large-order flow | Conditional specialty | Use `qveris_finance.flow_large_order` after detail or direct canonical fallback; stock/date rows must match. |
| Northbound/cross-border flow | Conditional specialty | Use `qveris_finance.flow_northbound` or `qveris_finance.flow_cross_border` after detail or direct canonical fallback; keep missing on 503/empty/mismatch. |
| News/sentiment/trap risk | Qualitative unless stronger evidence succeeds | Tagged news is background only; no proof of manipulation, fraud, strong sentiment, or directional risk from tagged news alone. |

## Canonical A-Share Specialty Fallbacks

Use only when the user explicitly asks for the layer and live discovery is unavailable or unstable.

| Requested layer | Canonical fallback CAP ID | Stop condition |
|---|---|---|
| LHB / dragon-tiger list | `qveris_finance.flow_dragon_tiger` | Stop after one failed, empty, or semantically mismatched direct call. |
| Large-order flow | `qveris_finance.flow_large_order` | Stop after one failed, empty, or mismatched direct call. |
| Northbound flow | `qveris_finance.flow_northbound` | Stop after one failed, empty, or mismatched direct call. |
| Cross-border flow | `qveris_finance.flow_cross_border` | Stop after one failed, empty, or mismatched direct call. |
| Lock-up calendar | `qveris_finance.mkt_cn_lock_up` | Stop after one failed, empty, or mismatched direct call. |

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
- US-style financial, ratio, or estimate CAP assumptions applied to CN/A-share requests without matrix confirmation.
- LHB or flow data used without current CAP verification and row-level identity checks.
- Tagged-news-only output used as proof of manipulation, fraud, strong sentiment, or directional risk.
- Raw internal QVeris provider, route, failover, model, persona, or script metadata in user-facing report or trace.

## Budget Order

1. `qveris_finance.ref_symbology`
2. `qveris_finance.ref_security_master`
3. One requested 20/60-day bar window
4. CN financial availability check
5. At most one explicitly requested specialty call
6. Peers, news, events, research, and extra discovery only after the core gates succeed
