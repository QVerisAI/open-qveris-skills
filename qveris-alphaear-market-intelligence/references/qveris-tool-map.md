# QVeris Tool Map

Source: Awesome Finance Skills / AlphaEar, https://github.com/RKiding/Awesome-finance-skills, Apache-2.0, evaluation recent activity 2026-03-29. Local snapshot: `third_party/source_repos/42-awesome-finance-skills`, commit `853f09b` on 2026-03-29.

## Runtime Policy

- Runtime data source: `qveris_finance.*` CAP tools only.
- Credential: `QVERIS_API_KEY` only.
- Required trace fields: `tool_name`, `capability_id`, `entity`, `market`, `params`, `as_of`, `retrieved_at`, `fallback_used`, `missing_fields`.
- Trace `capability_id` values must also use normalized `qveris_finance.*` names, not short CAP codes.
- Treat raw QVeris response metadata as internal provenance only. Build sanitized trace rows that keep only normalized capability names, parameters, success/failure, fallback, validation result, and missing fields.
- Apply `qveris-finance-data-quality-rubric.md` and `qveris-finance-retry-policy.md` before using any payload as evidence.

## Primary CAPs

| Workflow need | Primary QVeris CAPs | Evidence rule |
|---|---|---|
| Symbol lookup | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | Resolve issuer before all other calls. |
| Company context | `qveris_finance.ref_company_profile`, `qveris_finance.ref_classification_industry` | Use only matched issuer and market fields. |
| Price context | `qveris_finance.mkt_l1_rt`, `qveris_finance.mkt_bars_adjusted` | Require quote timestamp and at least 2 bars for multi-day metrics. |
| Fundamentals | `qveris_finance.fundamentals_is`, `qveris_finance.fundamentals_bs`, `qveris_finance.fundamentals_cf`, `qveris_finance.fundamentals_derived_ratios` | Require fiscal-period and basis alignment. |
| Forward inputs | `qveris_finance.estimates_consensus` | Use only matching forward-period fields; otherwise mark missing. |
| News context | `qveris_finance.news_fin_tagged` | Qualitative background only unless stronger evidence succeeds. |
| Sentiment | `qveris_finance.sentiment_text_signals` | Numeric sentiment is allowed only when this CAP succeeds and rows match the issuer. |
| Earnings/event context | `qveris_finance.event_calendar_earnings`, `qveris_finance.event_calendar_corp` | Reject out-of-window events. |

## Conditional CAPs

- Use `cap-detail` before calling news clusters, specialty sentiment, alternate data, prediction, forecast, or market-probability routes.
- Do not call removed or unstable routes as a primary path unless current `cap-detail` confirms availability and fields.
- If no QVeris CAP maps to an AlphaEar source feature, mark `capability_unavailable`; do not call the legacy feature.

## AlphaEar Migration Map

| Original AlphaEar surface | QVeris adaptation |
|---|---|
| Stock search and prices | Resolve identity, quote, and bars through QVeris. |
| Fundamentals | Use QVeris statement, ratio, and consensus CAPs with fiscal-period gates. |
| Finance news | Use tagged news as background and events as dated evidence. |
| Sentiment model | Use QVeris text sentiment only; otherwise qualitative context. |
| Signal tracker | Describe evidence changes without action language. |
| Reporter | Produce Markdown report plus trace appendix. |
| Forecast or prediction tools | Mark unsupported unless a current QVeris CAP is verified; never emit forecasts as advice. |

## Hard Rejects

- Wrong issuer, wrong market, wrong asset type, wrong benchmark, or wrong currency.
- Fewer than 2 bars for multi-day return, trend, volatility, liquidity, drawdown, or correlation.
- Statement period mismatch, including annual/FY requests returning latest-quarter or TTM-shaped payloads.
- Tagged-news-only output used as numeric sentiment, strong catalyst, or directional risk.
- Raw internal QVeris provider, route, failover, or model metadata in user-facing report or trace.

## Budget Order

1. `qveris_finance.ref_symbology`
2. `qveris_finance.ref_security_master`
3. Requested core evidence, such as bars, fundamentals, news, or sentiment
4. Optional ratios, consensus, events, or extra news rows
5. Conditional CAP discovery only when the user asked for that feature
