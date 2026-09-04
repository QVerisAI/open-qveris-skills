# Summary

This static contract example illustrates an A-share data-layer layout and does not claim live QVeris calls. A real run must validate identity, requested-window bars, and one requested financial layer before optional fan-out.

Controls: `dry_run=false`, `max_calls=6`, `max_age=P1D`, `budget_note=standard data-layer read`.

# Evidence

| Claim | QVeris Capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| Issuer identity matches requested A-share symbol | `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | complete | no |
| Latest quote can support a snapshot read | `qveris_finance.mkt_l1_rt` | `symbol=600519.SH`, `market=CN` | complete | no |
| Thirty-day bars can support simple trend and liquidity context | `qveris_finance.mkt_bars_adjusted` | `symbol=600519.SH`, `start_date=2026-06-08`, `end_date=2026-07-08` | partial | no |
| Analyst report context is not used without non-empty issuer-relevant rows | `qveris_finance.research_analyst_reports` | `symbol=600519.SH`, `limit=5` | missing | none |

# Analysis

Validated QVeris quote and bars evidence can support a compact market-data snapshot and trailing context. Research-report rows are missing in this sample because no non-empty issuer-relevant payload is validated; recommendation and price-objective fields remain suppressed if future rows appear.

Specialty A-share layers from the source repo are not assumed. A missing LHB or capital-flow CAP means the report should say those fields are unavailable, not replace them with top-mover activity.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `lhb_records`, `unlock_calendar`, `northbound_flow`, `capital_flow_minute`, `limit_board_pool`, `etf_option_greeks`, `investor_qa`, `issuer_relevant_analyst_reports`.

Rejected or not-called evidence: `qveris_finance.research_analyst_reports` is trace-only/missing in this sample until a non-empty issuer-relevant payload validates. Any returned wrong-market, wrong-window, truncated, or unverified specialty payload must be excluded from Evidence and listed here.

Suppressed fields: target prices, ratings, upside/downside language, buy/sell wording, execution plans.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Illustrative evidence rows above are report-shape examples, not observed results.

Not investment advice.
