# QVeris Tool Map

Source: Finance Skills, https://github.com/himself65/finance-skills, MIT, evaluation recent activity 2026-06-14. Local snapshot: `third_party/source_repos/04-finance-skills`, commit `87f688e` on 2026-06-07.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Controls: accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; when omitted in natural language, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Treat QVeris `_meta.source_provider` as provenance only, never as a direct skill dependency, and never print raw vendor/provider IDs. Use `qveris_internal`, `internal_failover`, or `unknown` when provenance must be surfaced. In final output, say "non-QVeris sources" instead of naming prohibited providers.
- Suppress target-price, upside, recommendation, and buy/sell fields from QVeris payloads.
- Validate requested entity, market, date window, fiscal period, and payload shape before using a payload as evidence.
- Treat failed, rejected, unavailable, or weak-relevance CAPs as trace/data-quality facts only. Do not list them in `Evidence Used` or the positive side of the `Factor Table` as supporting evidence.
- Summarize long or truncated payloads in full-workflow reports; mark `payload_summarized` or `payload_truncated` instead of expanding raw rows.
- Apply `../../references/qveris-finance-retry-policy.md` for retry/no-retry decisions and `../../references/qveris-finance-cap-registry-snapshot-2026-07-07.md` for primary-path freshness.
- Apply the shared rubric at `../../references/qveris-finance-data-quality-rubric.md`; transport-success payloads that fail identity, window, benchmark, or statement-consistency checks are hard rejects.

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
| `qveris_finance.news_fin_tagged` | `NEWS.FIN.TAGGED` |
| `qveris_finance.sentiment_text_signals` | `SENTIMENT.TEXT_SIGNALS` |
| `qveris_finance.fundamentals_is` | `FUNDAMENTALS.IS` |
| `qveris_finance.fundamentals_bs` | `FUNDAMENTALS.BS` |
| `qveris_finance.fundamentals_cf` | `FUNDAMENTALS.CF` |
| `qveris_finance.fundamentals_derived_ratios` | `FUNDAMENTALS.DERIVED_RATIOS` |
| `qveris_finance.mkt_l1_rt` | `MKT.L1.RT` |
| `qveris_finance.estimates_consensus` | `ESTIMATES.CONSENSUS` |
| `qveris_finance.event_calendar_earnings` | `EVENT.CALENDAR.EARNINGS` |
| `qveris_finance.earnings_actual_surprise` | `EARNINGS.ACTUAL_SURPRISE` |
| `qveris_finance.transcripts_earnings_call` | `TRANSCRIPTS.EARNINGS_CALL` |
| `qveris_finance.mkt_bars_adjusted` | `MKT.BARS.ADJUSTED` |
| `qveris_finance.mkt_breadth_internals` | `MKT.BREADTH.INTERNALS` |
| `qveris_finance.risk_beta_vol` | `RISK.BETA_VOL` |
| `qveris_finance.index_levels` | `INDEX.LEVELS` |

## Common Parameter Templates

Use structured parameters; do not pass the user request as a free-text parameter.

| Purpose | Template |
|---|---|
| Entity/profile | `{"symbol":"TSLA","market":"US"}` |
| News and sentiment window | `{"symbol":"TSLA","market":"US","start_date":"2026-06-30","end_date":"2026-07-07"}` |
| Statements and ratios | `{"symbol":"TSLA","market":"US","period":"annual","limit":1}` |
| Strict statement-period retry | Inspect `cap-detail` first; if the fields are documented, retry with a stricter shape such as `{"symbol":"TSLA","market":"US","period":"annual","fiscal_year":2025,"period_type":"annual","limit":1}` |
| Market quote | `{"symbol":"TSLA","market":"US"}` |
| Earnings recap | `{"symbol":"AAPL","market":"US"}` |
| Liquidity bars | `{"symbol":"AAPL","market":"US","start_date":"2026-06-07","end_date":"2026-07-07"}` |
| Beta/vol | `{"symbol":"AAPL","market":"US","benchmark_symbol":"SPY"}` |
| Benchmark/index | `{"symbol":"SPX","market":"US","start_date":"2026-06-07","end_date":"2026-07-07"}`; sanity-check that returned payload is actually the requested benchmark |

## Evidence Gate Checklist

- Confirm returned symbol, company name, exchange, market, and asset type match the requested security before citing company data.
- Confirm returned index or benchmark identity before using benchmark payloads. Reject `SPX` or benchmark responses that resolve to a non-index security.
- Require at least 2 observations for multi-day bars before computing liquidity, return, trend, correlation, realized volatility, drawdown, or beta from bars.
- Align IS, BS, and CF by fiscal year, fiscal period, and period ending before creating valuation tables.
- If an annual/FY request returns a latest-quarter or TTM-shaped statement payload, reject it for the requested period, retry once with stricter documented period fields, and mark the requested statement missing if it still does not match.
- Exclude same-period CF if CF net income materially conflicts with IS net income; mark `statement_semantic_mismatch`.
- Treat `news_fin_tagged` as qualitative context only when sentiment or cluster routes fail; do not infer numeric sentiment, strong catalysts, or directional risk from tagged news alone.
- Require news and sentiment rows to match the resolved issuer by symbol, company name, market, ISIN, or another explicit issuer identity. Mark likely wrong-entity rows such as similarly named non-issuers as `entity_mix` and keep them out of factor values.
- Label manual trailing ratios as calculated inputs; do not infer forward multiples unless `estimates_consensus` or `fundamentals_derived_ratios` succeeds.

## Cost And Budget Guardrails

- Minimum useful sentiment factor: entity/profile, tagged news, sentiment_text_signals.
- Minimum useful valuation factor: entity/profile, quote, statements, ratios, consensus.
- Minimum useful earnings/liquidity/correlation snapshot: calendar, surprise, consensus, bars, beta/vol, benchmark/index.
- If `max_calls` is too low for the minimum useful set, return a budget-limited report and list not-called factors. Do not emit numeric factor values unless the corresponding QVeris capability succeeded.

## Workflows To Preserve

| Workflow | QVeris tools |
|---|---|
| Sentiment factor | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` |
| Valuation inputs | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.mkt_l1_rt`, `qveris_finance.estimates_consensus` |
| Earnings recap | `qveris_finance.event_calendar_earnings`, `qveris_finance.earnings_actual_surprise`, `qveris_finance.estimates_consensus`, `qveris_finance.transcripts_earnings_call` |
| Liquidity/correlation | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_breadth_internals`, `qveris_finance.risk_beta_vol`, `qveris_finance.index_levels` |

## Live-Tested Fallbacks

| Primary capability | Observed issue | Fallback | Output rule |
|---|---|---|---|
| `qveris_finance.sentiment_text_signals` | Provider returned 503 in live smoke on 2026-07-06 | `qveris_finance.news_fin_tagged` | Output qualitative news context only; do not emit numeric sentiment score; mark `fallback_used: true` and add `primary_tool_unavailable` to `missing_fields`. |
| `qveris_finance.news_dedup_cluster` | Returned 404 / capability not found in no-limit natural-language retest on 2026-07-07 | `qveris_finance.news_fin_tagged` | Do not call as a primary path unless `cap-detail` first confirms availability. |
| `qveris_finance.fundamentals_derived_ratios` or `qveris_finance.estimates_consensus` | Returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.mkt_l1_rt` plus available fundamentals | Emit partial valuation inputs only; mark ratio/consensus fields missing. |
| `qveris_finance.earnings_actual_surprise` | Returned 503 in natural-language forward test on 2026-07-06 | `qveris_finance.event_calendar_earnings` plus `qveris_finance.estimates_consensus` when available | Do not state actual surprise or beat/miss without actual and consensus. |
| `qveris_finance.mkt_bars_adjusted` | Multi-day requests can return only one usable observation | None | Hard reject for return, liquidity, correlation, realized volatility, drawdown, trend, or VaR calculations; mark `insufficient_observations`. |
| `qveris_finance.index_levels` | Benchmark/index requests can resolve to the wrong security | None or validated ETF proxy | Hard reject if identity does not match requested index/benchmark; mark `semantic_mismatch`. |
| `qveris_finance.fundamentals_cf` | CF fields can be cross-period, including annual requests returning latest-quarter or TTM-shaped data, or semantically inconsistent with IS | Stricter documented period params after `cap-detail` | Exclude from aligned valuation tables; if the retry still mismatches, mark the requested statement missing, e.g. `FY2025 cash flow missing due to period mismatch`; mark semantic conflicts as `statement_semantic_mismatch`. |
| `qveris_finance.news_fin_tagged` | Can return broad or truncated news sets when limits are weakly enforced | None | Use as qualitative context only; mark `overbroad_news` when relevance is weak or truncated. |

Removed or unavailable capabilities such as `qveris_finance.news_dedup_cluster` must not appear in `Evidence Used` or factor values. Record them only in `Data Quality And Missing Fields`, `missing_fields`, or `Trace Appendix` with `capability_unavailable` or `not_called`.

## Removed Or Replaced

Dynamic data-package installs and external finance APIs are not runtime dependencies. Do not add direct non-QVeris finance data providers, SEC scraping, browser automation, cookies, login state, third-party keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are internal migration context; do not repeat them in final output.
