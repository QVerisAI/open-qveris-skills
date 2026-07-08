# QVeris Tool Map - A-Share Data

Use this map after reading `../SKILL.md` and the shared finance data-quality rubric.

Source snapshot used for this map: `third_party/source_repos/57-a-share-skill` at `8494623`. The source repo contains the `a-share-data` skill plus separate trading, MACD, and paper-trading skills. This QVeris map adapts only the data skill and explicitly removes trading behavior.

## Primary Routes

| A-Share Skill function | QVeris route | Use | Gate |
|---|---|---|---|
| Symbol resolution | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Resolve mainland A-share symbol and exchange | Reject wrong-market substitutions. |
| Company and classification context | `qveris_finance.ref_company_profile`, `qveris_finance.ref_security_master`, `qveris_finance.ref_classification_industry` | Company and industry/sector metadata when present | Use only matched issuer fields; theme payloads may be empty. |
| Real-time quote | `qveris_finance.mkt_l1_rt` | Latest quote snapshot | Require quote timestamp and matched instrument. |
| Historical bars | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_bars_eod` | Price/volume history and calculated indicators | Require requested window and enough observations. |
| Technical context | Calculated from validated bars | Moving averages, range, volatility-like context | Label as calculated; no trading signal. |
| Events | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp`, `qveris_finance.event_calendar_ipo` | Earnings, corporate, and IPO calendar context | Reject wrong-window events; IPO calendar is not A+H mapping by itself. |
| News | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | Tagged news and sentiment when available | Tagged news alone is qualitative only. |
| Sector activity | `qveris_finance.ref_security_master`, `qveris_finance.ref_classification_industry`, `qveris_finance.mkt_top_movers` | Sector metadata and mover proxy context | Dedicated flow or heatmap routes still require semantic field validation. |

## Source Script Conversion

| Original script or module | QVeris treatment |
|---|---|
| `fetch_realtime.py` | Use quote/security master/bars CAPs; do not call direct source endpoints. |
| `fetch_history.py` and fallback routes | Use QVeris bars and fundamentals; reject thin or wrong-window payloads. |
| `fetch_technical.py` | Calculate indicators from validated QVeris bars only; no signal advice. |
| `fetch_stock_events.py` | Use corporate events, earnings calendar, news, and sentiment where validated. |
| `fetch_danginvest.py` | Replace hot industry/concept/news reads with tagged news and validated security metadata by default; call classification or top-mover CAPs only after `cap-detail`, then label proxy-only. |
| `fetch_sector_info.py` | Use security master and classification; concept fields are not guaranteed. |
| `fetch_ah_stocks.py` and `fetch_ah_ipo_timeline.py` | Conditional only; use verified security/event fields or mark missing. |
| trading/MACD/paper-trading folders | Removed from this skill. |

## Conditional Or Not Primary

| Original function | Default handling |
|---|---|
| A+H mapping and HK listing timeline | Use security master/event calendar only if fields explicitly identify both listings; otherwise missing. |
| IPO timeline | Use event calendar only if event type and date fields match; otherwise missing. |
| Dedicated industry/theme classification | Industry route returned usable payload in 2026-07-08 smoke; theme route returned empty payload. Use only non-empty validated rows. |
| Corporate event detail routes | Corporate-event route returned usable rows in smoke; validate event type/date/security. |
| EOD bars | Live smoke showed usable and thin payload cases; observation count remains mandatory. |
| Top movers / heat proxies | Live smoke returned usable CN top-mover payload; label proxy-only. |
| Stock-level order-size flow | `qveris_finance.flow_large_order` returned usable rows in smoke; validate stock identity/date. |
| Lock-up calendar | `qveris_finance.mkt_cn_lock_up` returned usable rows in smoke; validate stock identity/date. |
| Sector heatmap with capital flow | Do not infer flow from top movers; `flow_sector_capital` smoke returned stock-level shaped rows, so reject unless sector/concept fields are present. |
| 24/7 market news | Use finance tagged news; do not treat it as a strong sentiment signal by itself. |
| Paper trading or short-term trade planning | Removed from the QVeris skill. |

## Removed Source Dependencies

Do not use source-repo dependencies or direct routes: `akshare`, `MyTT`, source-specific HTTP calls, DangInvest routes, paper-trading services, order/account CLIs, trading playbooks, or non-QVeris provider names.

## Trace Labels

Trace entries must expose only `qveris_finance.*` capability names, parameters, status, fallback, and rejection/missing-field reasons. Do not expose internal provider route names.
