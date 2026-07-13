# QVeris Tool Map

Source: Daymade Financial Suite, https://github.com/daymade/claude-code-skills, MIT, evaluation recent activity 2026-07-06. Local snapshot: `third_party/source_repos/37-daymade-claude-code-skills`, commit `d2d566f` on 2026-07-06.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Required trace fields: `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, `missing_fields`.
- Build rows only from saved `observed_calls`; use normalized `qveris_finance.*` tool names and `execution_id=null` when the call returned none.
- Treat raw QVeris response metadata as internal provenance only. Strip provider, route, candidate, failover, credential, and wrapper metadata from the sanitized trace.
- Missing financial fields must remain missing. Do not substitute defaults for beta, rates, growth, shares, margins, or statement fields.

## Primary CAPs

| Workflow need | Primary QVeris CAPs | Evidence rule |
|---|---|---|
| Entity resolution | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Resolve every symbol and market before collection. |
| Company profile | `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry` | Use matched issuer and classification only. |
| Market data | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol` | Require timestamps, windows, and enough observations. |
| Statements | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf` | Require fiscal-period alignment and clear measurement basis. |
| Ratios and estimates | `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.estimates_consensus` | Use only matched periods and issuer rows. |
| Events | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_ipo` | Reject out-of-window or wrong-issuer events. |
| News and research | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals`, `qveris_finance.research_analyst_reports` | Research rows require issuer, report type, and date validation. |

## Canonical Valuation Field Map

Normalize these aliases before deciding whether a field is missing. Keep the raw field name in internal validation notes when useful, but expose only the canonical name in user-facing `missing_fields`.

| Canonical field | Accepted QVeris aliases | Basis rule |
|---|---|---|
| `pe_ratio` | `pe_ratio`, `pe_ttm`, `trailing_pe` | Use only trailing/TTM basis unless a forward-period field is explicit. |
| `price_to_sales` | `price_to_sales`, `ps_ratio_ttm`, `price_sales_ttm` | Use only matched issuer and same market currency. |
| `price_to_book` | `price_to_book`, `pb_ratio`, `pb_ratio_ttm` | Require book-value basis to be clear. |
| `ev_to_ebitda` | `ev_to_ebitda`, `ev_ebitda`, `enterprise_value_to_ebitda` | Require enterprise value and EBITDA basis to be present or QVeris-derived. |
| `market_cap` | `market_cap`, `mkt_cap`, `market_value` | Require quote timestamp or as-of date. |
| `free_cash_flow` | `free_cash_flow`, `fcf`, `operating_cash_flow_minus_capex` | Require CF period alignment and capex sign/basis clarity. |

## Aligned Statement Contract

Before calculating a cross-statement ratio, emit one row per fact with `canonical_field`, `value`, `currency`, `period_end`, `fiscal_period`, `period_type`, `measurement_basis`, and `source_field`. Exclude any row that differs in issuer, currency, period end, fiscal period, or basis. Reconcile CF net income to IS net income separately; only a passing reconciliation may unlock CF-derived operating-quality ratios.

For every news, research, or event row, emit `issuer_relevance`, `row_type`, and `why_included`. `weak` relevance belongs in background only.

## Conditional CAPs

- Use `cap-detail` before A-share specialty news, industry daily, sector heat, pharma, research, cluster, or event-detail routes.
- If a feature maps to no verified QVeris CAP, mark `capability_unavailable`.
- Industry or pharma daily reports may use validated securities, bars, events, and news as proxy evidence, but must not claim complete flow, heat, or ranking coverage when those CAPs are missing.

## Daymade Migration Map

| Original Daymade surface | QVeris adaptation |
|---|---|
| Financial data collector | QVeris identity, market data, statements, ratios, estimates, and data-quality pack. |
| A-share news fetcher | QVeris tagged news and event context only; unsupported source feeds become missing fields. |
| Structured news/research SDKs | QVeris news, sentiment, research, and event CAPs with issuer relevance gates. |
| Gangtise-style research pipeline | QVeris research and event structuring when validated; otherwise `capability_unavailable`. |
| Pharma daily report | QVeris sector/universe monitor using validated stocks, market data, news, and events. |
| Chat delivery or external notification | Out of scope; deliver only the Markdown report in the current conversation. |

## Hard Rejects

- Wrong issuer, wrong market, wrong asset type, wrong currency, or wrong date window.
- Defaults substituted for missing financial data.
- Statement period mismatch or unclear basis used in an aligned data pack.
- Same-period CF net income materially conflicting with IS net income used in an aligned data pack.
- Valuation aliases treated as missing before applying the canonical valuation field map.
- Research or analyst rows without issuer, report type, or date validation.
- Tagged-news-only output used as numeric sentiment, strong catalyst, or directional risk.
- Raw internal QVeris provider, route, failover, credential, or delivery-channel metadata in user-facing report or trace.

## Budget Order

1. `qveris_finance.ref_symbology`
2. `qveris_finance.ref_security_master`
3. User-requested core data pack or daily-report universe
4. Statements, bars, news, and events needed for the requested workflow
5. Optional research, sentiment, sector proxy, or conditional discovery
