# QVeris Tool Map

Source: Tradermonty Trading Skills, https://github.com/tradermonty/claude-trading-skills, MIT, evaluation recent activity 2026-07-06. Local snapshot: `third_party/source_repos/10-tradermonty-trading-skills`, commit `4d63990` on 2026-07-05.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency, and never print raw vendor/provider IDs. Use `qveris_internal`, `internal_failover`, or `unknown` when provenance must be surfaced. In final output, say "non-QVeris sources" instead of naming prohibited providers.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, benchmark, and payload shape before using a payload as evidence.

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
| `qveris_finance.mkt_bars_adjusted` | `MKT.BARS.ADJUSTED` |
| `qveris_finance.risk_beta_vol` | `RISK.BETA_VOL` |
| `qveris_finance.index_levels` | `INDEX.LEVELS` |
| `qveris_finance.ownership_institutional` | `OWNERSHIP.INSTITUTIONAL` |
| `qveris_finance.news_fin_tagged` | `NEWS.FIN.TAGGED` |
| `qveris_finance.index_vix` | `INDEX.VIX` |
| `qveris_finance.mkt_breadth_internals` | `MKT.BREADTH.INTERNALS` |
| `qveris_finance.rates_govt_benchmark` | `RATES.GOVT_BENCHMARK` |
| `qveris_finance.ref_classification_industry` | `REF.CLASSIFICATION.INDUSTRY` |
| `qveris_finance.mkt_top_movers` | `MKT.TOP_MOVERS` |
| `qveris_finance.index_constituents` | `INDEX.CONSTITUENTS` |
| `qveris_finance.event_calendar_earnings` | `EVENT.CALENDAR.EARNINGS` |
| `qveris_finance.event_calendar_macro` | `EVENT.CALENDAR.MACRO` |

## Common Parameter Templates

Use structured parameters; do not pass the user request as a free-text parameter.

| Purpose | Template |
|---|---|
| Single-symbol risk/beta | `{"symbol":"AAPL","market":"US","benchmark":"SPY"}` |
| Portfolio symbol loop | Run one call per symbol when multi-symbol parameters fail: `{"symbol":"NVDA","market":"US"}` |
| Index levels | `{"symbol":"SPX","market":"US","date":"2026-07-07"}`; sanity-check index identity before use |
| VIX proxy | `{"symbol":"VIX","region":"US","date":"2026-07-07"}` |
| Rates proxy | `{"symbol":"US10Y"}`; if rejected, inspect `RATES.GOVT_BENCHMARK` and retry with its documented fields |
| Liquid ETF proxy bars | `{"symbol":"SPY","start_date":"2026-06-07","end_date":"2026-07-07","interval":"1d"}` |
| News and institutional context | `{"symbol":"MSFT","market":"US","limit":5}` |

## Cost And Budget Guardrails

- Minimum useful market-regime monitor: index levels, breadth, macro-event context, VIX, rates, and at least one liquid ETF/index proxy if primary evidence fails.
- Minimum useful portfolio-risk monitor: holdings intake, beta/vol, classification, index/regime proxy, institutional ownership, and news for each major holding.
- If `max_calls` is too low for the minimum useful set, return a budget-limited report and do not label the market risk-on/risk-off or recommend portfolio action.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Portfolio risk | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels`, `qveris_finance.ownership_institutional`, `qveris_finance.news_fin_tagged` |
| Market regime | `qveris_finance.index_levels`, `qveris_finance.index_vix`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.event_calendar_macro`, `qveris_finance.rates_govt_benchmark` |
| Sector rotation | `qveris_finance.ref_classification_industry`, `qveris_finance.mkt_top_movers`, `qveris_finance.index_constituents` |
| Data-quality checker | Validate `as_of`, `missing_fields`, `fallback_used`, and staleness on every QVeris payload |
| Earnings calendar | `qveris_finance.event_calendar_earnings` |

## Proxy Trace Normalization

When primary regime evidence fails, limited proxies are allowed only through QVeris capability names:

| Proxy evidence | Trace as |
|---|---|
| VIX | `qveris_finance.index_vix` |
| Government yields/rates | `qveris_finance.rates_govt_benchmark` |
| Liquid ETF or index proxy bars, such as SPY/QQQ/IWM | `qveris_finance.mkt_bars_adjusted` or `qveris_finance.index_levels`, matching the QVeris route used |

If a raw response exposes an internal provider route, normalize it before writing prose, tables, `qveris_trace`, `missing_fields`, or `data_quality.warnings`.

## Live-Tested Quality Rules

| Issue | Output rule |
|---|---|
| `qveris_finance.index_levels` and `qveris_finance.mkt_breadth_internals` returned 503 in natural-language forward test on 2026-07-06 | Use VIX/rates/liquid ETF proxies only as limited fallback and lower confidence. |
| `qveris_finance.macro_actual_vs_forecast` returned 404 / capability not found in no-limit natural-language retest on 2026-07-07 | Do not call as a primary path unless `cap-detail` first confirms availability; use `event_calendar_macro` only as weaker macro-event context and mark actual-vs-forecast missing. |
| `qveris_finance.flow_sector_capital` returned 404 / capability not found in no-limit natural-language retest on 2026-07-07 | Do not call as a primary path unless `cap-detail` first confirms availability; use `mkt_top_movers`, `index_constituents`, and industry classification as weaker sector context. |
| QVeris `_meta.failover_log` may show internal provider failover | Reflect this in `qveris_trace[].fallback_used` without treating providers as direct dependencies. |

## Removed Or Replaced

Trading/prep/action semantics and external finance integrations are not runtime dependencies. Do not add direct non-QVeris finance data providers, SEC scraping, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are internal migration context; do not repeat them in final output.
