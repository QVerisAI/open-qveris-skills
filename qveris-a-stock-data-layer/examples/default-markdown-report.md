# Summary

This A-share data-layer read validates the requested issuer through QVeris, uses quote and bars evidence for the market-data layer, and keeps unverified specialty layers out of the conclusion. LHB, unlock calendar, capital flow, limit-board pools, ETF options, and investor Q&A are listed as missing until a current QVeris CAP confirms those fields.

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

| Tool | Params | Result | Fallback | Notes |
|---|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=600519.SH`, `market=CN` | success | false | identity matched |
| `qveris_finance.mkt_l1_rt` | `symbol=600519.SH`, `market=CN` | success | false | quote timestamp validated |
| `qveris_finance.mkt_bars_adjusted` | `symbol=600519.SH`, `start_date=2026-06-08`, `end_date=2026-07-08` | success | false | enough observations for simple context |
| `qveris_finance.research_analyst_reports` | `symbol=600519.SH`, `limit=5` | empty or not validated | false | missing; not used as positive evidence |

Not investment advice.
