# QVeris Tool Map

Source: Anthropic Financial Services, https://github.com/anthropics/financial-services, Apache-2.0, evaluation recent activity 2026-06-26. Local snapshot: `third_party/source_repos/01-anthropic-financial-services`, commit `4aa51ed` on 2026-06-26.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency, and never print raw vendor/provider IDs. Use `qveris_internal`, `internal_failover`, or `unknown` when provenance must be surfaced. In final output, say "non-QVeris sources" instead of naming prohibited providers.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, fiscal period, and payload shape before using a payload as evidence.

## Direct CAP Invocation

Prefer standardized CAP query over legacy tool discovery:

- Native route: call the exposed `qveris_finance.*` function directly, if present.
- Script route: from the repository root, run `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<name> --param key=value --safe-json`. Use repeatable `--param` flags for shell-safe parameters; reserve `--params '<json>'` for complex nested payloads.
- HTTP route: `POST /api/v1/capabilities/query` with `capability_id`, structured `parameters`, and `strategy: "best"`.
- Discovery route: use `cap-search` and `cap-detail` only to verify unknown capability IDs or params.
- Legacy route: use `/search` plus `/tools/execute` only if CAP query is unavailable; add `legacy_cap_shim_used` to `data_quality.warnings`.

Common CAP IDs for this skill:

| qveris_finance name | capability_id |
|---|---|
| `qveris_finance.ref_symbology` | `REF.SYMBOLOGY` |
| `qveris_finance.ref_security_master` | `REF.SECURITY_MASTER` |
| `qveris_finance.ref_company_profile` | `REF.COMPANY_PROFILE` |
| `qveris_finance.event_calendar_earnings` | `EVENT.CALENDAR.EARNINGS` |
| `qveris_finance.earnings_actual_surprise` | `EARNINGS.ACTUAL_SURPRISE` |
| `qveris_finance.estimates_consensus` | `ESTIMATES.CONSENSUS` |
| `qveris_finance.fundamentals_is` | `FUNDAMENTALS.IS` |
| `qveris_finance.fundamentals_bs` | `FUNDAMENTALS.BS` |
| `qveris_finance.fundamentals_cf` | `FUNDAMENTALS.CF` |
| `qveris_finance.fundamentals_segment` | `FUNDAMENTALS.SEGMENT` |
| `qveris_finance.transcripts_earnings_call` | `TRANSCRIPTS.EARNINGS_CALL` |
| `qveris_finance.news_fin_tagged` | `NEWS.FIN.TAGGED` |
| `qveris_finance.mkt_l1_rt` | `MKT.L1.RT` |
| `qveris_finance.ref_classification_industry` | `REF.CLASSIFICATION.INDUSTRY` |
| `qveris_finance.ref_classification_theme` | `REF.CLASSIFICATION.THEME` |
| `qveris_finance.fundamentals_derived_ratios` | `FUNDAMENTALS.DERIVED_RATIOS` |
| `qveris_finance.rates_govt_benchmark` | `RATES.GOVT_BENCHMARK` |
| `qveris_finance.fx_spot` | `FX.SPOT` |
| `qveris_finance.research_analyst_reports` | `RESEARCH.ANALYST_REPORTS` |
| `qveris_finance.event_calendar_corp` | `EVENT.CALENDAR.CORP` |
| `qveris_finance.ownership_institutional` | `OWNERSHIP.INSTITUTIONAL` |
| `qveris_finance.ownership_insider_trades` | `OWNERSHIP.INSIDER_TRADES` |

## Common Parameter Templates

Use structured parameters; do not pass the user request as a free-text parameter.

| Purpose | Template |
|---|---|
| Entity/profile | `{"symbol":"MSFT","market":"US"}` |
| Earnings calendar/surprise/consensus | `{"symbol":"NVDA","market":"US"}` |
| Statements | `{"symbol":"MSFT","market":"US","period":"annual","limit":3}` or `{"symbol":"NVDA","market":"US","period":"quarterly","limit":4}` |
| Market quote | `{"symbol":"MSFT","market":"US"}` |
| US rate proxy | `{"symbol":"US10Y"}`; if rejected, inspect `RATES.GOVT_BENCHMARK` and retry with its documented fields |
| FX | `{"base_currency":"USD","quote_currency":"USD"}` |
| Tagged news fallback | `{"symbol":"NVDA","market":"US","limit":5}` |

## Cost And Budget Guardrails

- Minimum useful earnings memo: entity/profile, calendar, actual/surprise, consensus, one statement set, market quote, transcript/news fallback.
- Minimum useful DCF input audit: entity/profile, income statement, balance sheet, cash flow, market quote, rates, FX, consensus if available.
- If `max_calls` is too low for the minimum useful set, return a budget-limited report and list not-called capabilities. Do not infer beat/miss, quotes, consensus, or model inputs from memory.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Earnings analysis | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_segment`, `qveris_finance.transcripts_earnings_call`, `qveris_finance.news_fin_tagged`, `qveris_finance.mkt_l1_rt` |
| Peer comps | `qveris_finance.ref_classification_industry`, `qveris_finance.ref_classification_theme`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus` |
| DCF/model update | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.estimates_consensus`, `qveris_finance.rates_govt_benchmark`, `qveris_finance.fx_spot`, `qveris_finance.mkt_l1_rt` |
| Market research | `qveris_finance.research_analyst_reports`, `qveris_finance.news_fin_tagged`, `qveris_finance.event_calendar_corp`, `qveris_finance.ownership_institutional`, `qveris_finance.ownership_insider_trades` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.earnings_actual_surprise` | Provider returned 503 in live smoke on 2026-07-06 | `qveris_finance.estimates_consensus` plus `qveris_finance.event_calendar_earnings` | Do not assert beat/miss unless actual and consensus are both present; mark `fallback_used: true` and add `primary_tool_unavailable` to `missing_fields`. |
| `qveris_finance.transcripts_earnings_call` | Provider returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.news_fin_tagged` | Use news only as context; do not invent management quotes. |
| Statement period alignment | `fundamentals_cf` can return TTM/other periods despite quarterly intent | None | Keep cross-period values out of aligned tables and add a data-quality warning. |
| `qveris_finance.news_dedup_cluster` | Returned 404 / capability not found in no-limit natural-language retest on 2026-07-07 | `qveris_finance.news_fin_tagged` | Do not call as a primary path unless `cap-detail` first confirms availability. |

## Removed Or Replaced

Original MCP/data-provider assumptions are not runtime dependencies. Do not add direct non-QVeris finance data providers, SEC scraping, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are internal migration context; do not repeat them in final output.
