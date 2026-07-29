# QVeris Tool Map - A-Share Factor Screen

Use this map after reading `../SKILL.md` and the shared finance data-quality rubric.

Source snapshot used for this map: `third_party/source_repos/32-alphasift` at `9f52274`. The source repo contains a Python package with `screen`, strategy YAML files, hard filters, scoring, saved runs, reports, doctor/audit commands, and T+N evaluation. This QVeris map preserves the research screen shape while replacing all data source packages and LLM-provider assumptions.

## Primary Routes

| Factor-screen need | QVeris route | Use | Gate |
|---|---|---|---|
| User-supplied universe validation | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Resolve and validate each security | Reject unresolved or wrong-market entries before scoring. |
| User-supplied or cached universe context | `qveris_finance.ref_security_master`, `qveris_finance.ref_classification_industry` | Validate sector/security metadata and industry context | Theme payloads may be empty; dedicated constituents still require current `cap-detail`. |
| Quote snapshot | `qveris_finance.mkt_l1_rt` | Latest price/market data context | Matched security and timestamp required. |
| Momentum/liquidity/volatility | `qveris_finance.mkt_bars_adjusted`, `qveris_finance.mkt_bars_eod`, `qveris_finance.risk_beta_vol` | Factor inputs and post-hoc bars | Require comparable windows and sufficient observations; one-bar payloads cannot support multi-day factors. |
| Valuation and quality | `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf` | Cross-sectional factor inputs | Require same fiscal period and basis. |
| News risk and attention | `qveris_finance.sentiment_text_signals`, `qveris_finance.news_fin_tagged` | Sentiment when available, context otherwise | Tagged news alone is qualitative only. |
| Earnings event context | `qveris_finance.event_calendar_earnings` | Upcoming or recent earnings flags | Reject out-of-window events. |

## Source Workflow Conversion

| Original Alphasift workflow | QVeris treatment |
|---|---|
| `strategies` | Keep as strategy catalogue semantics; translate strategy fields into required QVeris evidence. |
| `screen` | Keep as a factor screen; use QVeris-only inputs and disclose factor coverage. |
| hard filters | Apply only when required fields are validated; otherwise mark the filter unavailable. |
| score/rank | Compute from validated components only; ranking requires comparable evidence and at least 3 securities. |
| saved runs | Represent in report metadata unless the runtime supplies explicit persistence. |
| `evaluate` / `evaluate-batch` / performance | Historical post-hoc evaluation only, using bars after `as_of`; no forecast claim. |
| hotspot/industry cache | Use classification/top-mover proxies unless verified sector heat CAPs exist. |
| LLM or DSA post-analysis | Remove as runtime dependency; do not use operation-advice fields. |

## Scoring Rules

- Score only validated component inputs.
- Drop missing components from the denominator and disclose component coverage.
- Do not rank if fewer than 3 securities have comparable evidence for the same factor set, price window, fiscal period, and market convention. Use coverage tier or per-name notes instead.
- Never treat a rank as a recommendation, expected return, or trade instruction.
- For post-hoc evaluation, call bars after the historical `as_of` date only after scoring has been fixed.

## Conditional Or Not Primary

| Alphasift-like feature | Default handling |
|---|---|
| Full-market A-share universe | Use only when `index_constituents` or a validated universe route supports it within budget and current `cap-detail` succeeds; otherwise budget-limited. |
| Dedicated industry/theme classification | Industry route returned usable payload in 2026-07-08 smoke; theme route returned empty payload. Use only non-empty validated rows. |
| EOD bars | Live smoke returned 21 bars for one symbol and one bar for two others; keep observation-count gates before scoring. |
| Corporate event detail routes | Use earnings calendar by default; call corporate-event detail only after current `cap-detail` confirms fields. |
| Top movers / heat proxies | Live smoke returned usable CN top-mover payload; label proxy-only and do not use as factor rank by itself. |
| Strategy registry or custom filters | Translate to factor definitions and data needs; unsupported factors become missing fields. |
| Natural-language stock picking | Convert to a research screen with no advice language. |
| Saved runs | Represent as report metadata only unless the environment supplies persistent storage. |
| T+N evaluation | Historical post-hoc evaluation only; no forecast or action claim. |

## Removed Source Dependencies

Do not use source-repo dependencies or provider routes: `efinance`, `akshare`, `baostock`, `tushare`, `yfinance`, `litellm`, external HTTP analyzers, local data-source caches, or non-QVeris API keys.

## Trace Labels

Trace entries must come only from saved `observed_calls` and expose exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`. Use `execution_id=null` when the observed call returned none; never expose internal provider/route metadata or add planned calls.
