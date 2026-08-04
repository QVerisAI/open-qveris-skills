# QVeris Tool Map — Serenity Supply-Chain Research

Resolve every logical capability from the live registry and inspect uncertain routes before execution.

| Serenity task | Primary logical CAP or lane | Acceptance boundary |
|---|---|---|
| Identity/listing | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master`, `qveris_finance.ref_company_profile` | Match security, issuer, exchange, market, asset type, currency, and listing class; attach accepted identity evidence IDs to every candidate. |
| Industry/theme context | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme` | Classification only; does not prove scarce-layer control. |
| Entity/cross-listing map | `qveris_finance.ref_entity_relationship` | Require explicit relationship fields; no name-only joins. |
| Supplier/customer relationship | `qveris_finance.alt_supply_chain` | Require issuer, counterparty, direction/type, date, and source. Co-mentions are not relationships. |
| Hiring activity | `qveris_finance.alt_job_postings` | Proves postings only, not hiring completion, capacity, revenue, or growth. |
| Patent activity | `qveris_finance.alt_patents` | Proves a documented patent/application event only, not quality, leadership, or commercialization. |
| Government contracts | `qveris_finance.alt_govt_contracts` | Proves an award/contract record only, not revenue recognition, margin, or cash receipt. |
| Filing locator/content | `qveris_finance.filings_regulatory_metadata`, conditional `filings_regulatory_raw` and `filings_structured_xbrl` | Require issuer, document identity, filing date, period, and successful full-content retrieval when signaled. |
| Financial quality | `qveris_finance.fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `fundamentals_segment` | Require aligned issuer, fiscal period/basis, currency, unit, and segment definition. |
| Ratios/valuation context | `qveris_finance.fundamentals_derived_ratios` or accepted quote/statements with an explicit formula | Never infer forward multiples. Scoring requires the same evidence-backed positive finite denominator metric set for every candidate. |
| Price/liquidity context | `qveris_finance.mkt_l1_rt`, `mkt_bars_adjusted`, `mkt_bars_eod`, optional `risk_beta_vol` | Price action is not bottleneck evidence; require timestamps, window, and observation counts. |
| Financing/share structure | `qveris_finance.ownership_share_structure`, conditional ownership/action CAPs | Require dated issuer-matched records; disclose coverage gaps. |
| Events | `qveris_finance.event_calendar_corp`, `event_calendar_earnings` | Event context only; an event calendar does not prove the result. |
| Estimates | `qveris_finance.estimates_consensus` | Require issuer, snapshot date, forecast period, and estimate fields; use as context, not prediction. |
| Value-chain discovery, tenders, project approvals, standards, technical material, news | Audited Web lane | Final body must be opened, matched, dated, hashed, and linked to claim IDs. |

## Candidate-Pool Rules

- Use an explicit/frozen universe first.
- Use classification results only when identity and requested-theme fields validate.
- Use audited Web documents to create leads when CAP classification is insufficient; label them `discovered_lead` until identity CAP acceptance.
- Do not use `qveris_finance.index_constituents` as theme membership.
- Do not use `mkt_top_movers`, price momentum, social attention, or news volume as proof of a scarce layer.

## Causal Limits

- Supply-chain relationship ≠ scarcity or financial impact.
- Job posting ≠ headcount, capacity, orders, or revenue.
- Patent ≠ technical leadership or commercialization.
- Contract award ≠ recognized revenue, margin, or cash.
- Filing/news mention ≠ customer validation.
- Quote/bar movement ≠ thesis confirmation.

## Removed Paths

Do not use raw provider tools, generic `/search` and `/tools/execute`, source-specific finance SDKs, or Web values for structured finance fields. Missing evidence stays missing.
