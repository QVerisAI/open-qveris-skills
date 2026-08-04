# QVeris Tool Map — Market Research

Resolve logical names through the live finance catalog and inspect current parameters before execution. This map is a workflow policy, not a static CAP-ID registry.

| Evidence layer | Primary logical CAP | Acceptance boundary |
|---|---|---|
| Security identity | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Match issuer/security, market, exchange, asset type, currency, and listing class. |
| Company profile | `qveris_finance.ref_company_profile` | Match issuer and profile date; do not treat descriptive text as segment financials. |
| Cross-listing/entity relationship | `qveris_finance.ref_entity_relationship`, security master | Require explicit relationship/share-class fields; never join by name alone. |
| Industry/theme classification | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme` | Context only; an empty theme payload stays missing. |
| Quote and price date | `qveris_finance.mkt_l1_rt` | Require security identity, currency, and timestamp at or before cutoff. |
| Historical price/liquidity | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_bars_eod` | Require requested window, adjustment convention, and sufficient observations. |
| Income statement | `qveris_finance.fundamentals_is` | Require issuer, fiscal year/period, period end, basis, currency, unit. |
| Balance sheet | `qveris_finance.fundamentals_bs` | Require issuer, point-in-time period, currency, and unit. |
| Cash flow | `qveris_finance.fundamentals_cf` | Require issuer, aligned period/basis, currency, unit, and semantic consistency with IS. |
| Segment evidence | `qveris_finance.fundamentals_segment` | Require explicit segment/geography definition and period; never assign group revenue to one segment. |
| Ratios/valuation inputs | `qveris_finance.fundamentals_derived_ratios` | Use only non-empty issuer/period-matched fields. Otherwise calculate trailing metrics from accepted raw inputs with full provenance. |
| Forward estimates | `qveris_finance.estimates_consensus` | Require issuer, snapshot date, forecast period, currency/unit, and estimate definition. |
| Corporate/earnings events | `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_earnings` | Calendar context only; require event type, issuer, and window. |
| Corporate actions | `qveris_finance.mkt_corporate_actions`, `qveris_finance.mkt_dividends`, `qveris_finance.mkt_splits` | Require security, action type, effective date, and adjustment basis. |
| Regulatory filing index | `qveris_finance.filings_regulatory_metadata` | Require issuer, form/accession or stable locator, filing date, and cutoff. |
| Filing content/XBRL | `qveris_finance.filings_regulatory_raw`, `qveris_finance.filings_structured_xbrl` | Conditional after cap-detail and full-content validation; match issuer, filing, period, and fields. |
| Ownership/share structure | `qveris_finance.ownership_share_structure`, other verified ownership CAPs | Use only explicit holder/share/date fields; disclose incomplete market coverage. |
| FX normalization | conditional `qveris_finance.fx_spot` after live `cap-detail` | Record pair direction, observation date, and source. A spot rate is not an undisclosed average-period translation convention. |
| Supply-chain relationships | `qveris_finance.alt_supply_chain` | Require issuer, counterparty, relationship direction/type, observation date, and source. Relationship does not prove financial impact. |
| Analyst research | `qveris_finance.research_analyst_reports` | Supplemental context only after issuer/report relevance and full-content validation. |
| Industry structure, market reports, standards, filings, tenders, news | Audited Web lane | Open and hash final documents. Preserve claim attribution; do not replace structured CAP layers. |

## Universe Rules

- Prefer an explicit user universe or approved frozen universe.
- A classification CAP may generate candidates only when every row proves security identity and the requested classification.
- Audited Web may generate `discovered_lead` records. Resolve each lead through identity CAPs before it enters a peer table.
- Never call `qveris_finance.index_constituents` as a general universe builder.
- Never use `qveris_finance.mkt_top_movers` as sector membership, breadth, capital flow, or a research universe.

## Historical Valuation Rule

For a historical cutoff, combine an accepted EOD price at or before the cutoff with period-aligned share structure and balance-sheet cash/debt. Do not use a current ratio snapshot as historical valuation evidence. Preserve the enterprise-value bridge and reject stale, missing, zero, or negative denominators.

## Removed Paths

Do not use generic QVeris Discover/Inspect/Call, `/tools/execute`, raw provider routes, CapIQ/FactSet-specific calls, AkShare, browser-extracted quotes, or model-memory values. A missing CAP is a disclosed gap.
