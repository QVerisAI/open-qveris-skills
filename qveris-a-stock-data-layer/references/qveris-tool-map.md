# QVeris Tool Map - A-Stock Data Layer

Use this map after reading `../SKILL.md` and the shared finance data-quality rubric.

Source snapshot used for this map: `third_party/source_repos/58-a-stock-data` at `bcda405`. The source repo is a single large `SKILL.md` with embedded Python covering ten layers and about forty endpoint families. This QVeris map keeps the layer taxonomy but removes direct endpoint execution.

## Primary Routes

| A-Stock Data function | QVeris route | Use | Gate |
|---|---|---|---|
| Symbol and listing metadata | `qveris_finance.ref_symbology` | Resolve ticker, exchange, currency, listing class | Reject unresolved or wrong-market matches. |
| Security master | `qveris_finance.ref_security_master` | Asset type, exchange, sector metadata | Reject index/fund/HK-only/US-only substitutions. |
| Company profile | `qveris_finance.ref_company_profile` | Company description, shares, market cap when available | Use only matched issuer fields. |
| Industry context | `qveris_finance.ref_security_master`, `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry` | Sector or industry metadata when present in validated security/company payloads | Treat as classification context, not sector-flow evidence; theme payloads may be empty. |
| Real-time quote | `qveris_finance.mkt_l1_rt` | Latest price/volume snapshot | Require quote timestamp and matched security. |
| Historical bars | `qveris_finance.mkt_bars_adjusted` | Returns, volume, trend, liquidity inputs | Require requested window and at least 2 observations for multi-day metrics. |
| Financial statements | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf` | Revenue, profit, balance sheet, cash flow | Require period alignment; reject annual/FY mismatch. |
| Ratios | `qveris_finance.fundamentals_derived_ratios` | Valuation/quality inputs | Use only when period and issuer match. |
| Tagged news | `qveris_finance.news_fin_tagged` | Qualitative news context | Do not infer strong sentiment or catalysts by itself. |
| Text sentiment | `qveris_finance.sentiment_text_signals` | Sentiment signal when available | If unavailable, mark numeric sentiment missing. |
| Events | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp` | Earnings and corporate-event context | Reject wrong-window events. |

## Source Layer Conversion

| Original layer | QVeris treatment |
|---|---|
| Market data | Primary route if symbol and window validate. |
| Research | Conditional route for analyst reports after `cap-detail`; suppress recommendations, target prices, and PDF/source-provider details. |
| Signals | Mostly proxy/conditional; hot stocks, northbound flow, LHB, unlock, and concept heat require `cap-detail`. |
| Capital flow and ownership | Use fundamentals/ownership routes only when validated; capital-flow-specific routes are not primary. |
| News | Use tagged news and text sentiment gates; no strong sentiment from tagged news alone. |
| Fundamentals | Use QVeris statement and ratio CAPs with period checks. |
| Filings/announcements | Use only if a verified QVeris announcement/filing/event CAP exists; otherwise corporate calendar/news context. |
| Limit-up/limit-down | Conditional only; top movers are not a substitute for limit-board pools. |
| ETF options | Conditional only; do not infer option Greeks or strategies from equity/ETF quotes. |
| Investor interaction/hot lists | Conditional only; use news/sentiment as weak context when unavailable. |

## Conditional Or Not Primary

Do not call these as default primary routes unless a current `cap-detail` confirms the capability, parameters, and fields:

| Legacy A-share data type | Default handling |
|---|---|
| LHB and unusual trading lists | Detail route exists, but 2026-07-08 smoke query returned 503; mark missing on failure. |
| Share unlock calendar | `qveris_finance.mkt_cn_lock_up` returned usable rows in 2026-07-08 smoke; still validate issuer/window. |
| Industry/theme classification routes | Industry route returned usable payload; theme route returned empty payload in smoke. Use only non-empty validated rows. |
| Corporate event detail routes | `qveris_finance.event_calendar_corp` returned usable rows in smoke; validate event type/date/issuer. |
| Research reports | Mark missing unless `cap-detail` confirms the report CAP and fields; suppress recommendation, rating, target-price, and source metadata fields. |
| EOD bar route | Prefer adjusted bars; use EOD bars only after `cap-detail` confirms params and output fields. |
| Top movers and market heat | `qveris_finance.mkt_top_movers` returned usable rows in smoke; proxy-only and not a limit-board substitute. |
| Stock-level order-size flow | `qveris_finance.flow_large_order` returned usable rows in smoke; validate stock identity and date window. |
| Sector flow | `qveris_finance.flow_sector_capital` returned stock-level shaped rows in smoke; hard reject for sector-flow claims unless rows identify sector/concept fields. |
| Northbound/southbound and cross-border flow | Detail routes exist, but 2026-07-08 smoke queries returned 503; mark missing on failure. |
| Limit-up/limit-down boards and board themes | Mark missing unless a verified QVeris CAP exists; top movers are only a weak proxy. |
| Interactive investor Q&A or hot lists | Mark missing unless a verified QVeris CAP exists. |
| ETF options data | Options CAP detail exists, but `510050.SH` CN option-chain smoke returned 422; mark CN ETF options missing unless market/params are confirmed. |
| Announcements and filings | Use corporate calendar/news only as context unless a verified announcement/filing CAP exists. |

## Removed Source Dependencies

Do not use source-repo dependencies or direct routes: `mootdx`, direct HTTP endpoints, iwencai keys, source-specific anti-ban logic, PDFs from raw report sites, cookies, browser signatures, or source-provider names.

## Trace Labels

Trace entries must expose only:

- `qveris_finance.*` tool name
- parameters
- status
- observed execution ID or `null`
- fallback flag
- missing fields or rejection reason

Use the exact keys `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`, sourced only from saved `observed_calls`. Never expose raw provider IDs, source-provider names, failover logs, cookies, or non-QVeris endpoints.

## Budget Order

1. Canonical A-share identity.
2. Exact requested-window bars.
3. One requested statement or valuation layer.
4. One requested event or news layer.
5. At most one requested specialty route after its core contract is confirmed.

Stop optional fan-out when identity, bars, or the requested financial layer fails validation.
