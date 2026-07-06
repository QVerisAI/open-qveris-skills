---
name: qveris-04-factor-finance
description: QVeris-native adaptation of candidate 4, Finance Skills. Use for sentiment, valuation inputs, earnings recap, liquidity, and correlation factor workflows that require qveris_finance.* CAP data, traceability, and no provider keys.
---

# QVeris 04 Factor Finance

Use this skill to turn the Finance Skills candidate into standardized, trace-backed research factors: sentiment, valuation inputs, earnings recap, liquidity, and correlation. Preserve the factor framing; replace yfinance, dynamic data packages, and third-party APIs with QVeris.

Source record:

| Field | Value |
|---|---|
| Candidate number | 4 |
| Original repository | Finance Skills |
| GitHub URL | https://github.com/himself65/finance-skills |
| License | MIT |
| Evaluation recent activity | 2026-06-14 |
| Local source snapshot | `third_party/source_repos/04-finance-skills` |
| Snapshot latest commit | `87f688e` on 2026-06-07 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve the security with `ref_symbology`, `ref_security_master`, and `ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for each factor and expose stale or missing inputs.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Sentiment factor: `news_fin_tagged`, `news_dedup_cluster`, `sentiment_text_signals`.
2. Valuation input factor: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `fundamentals_derived_ratios`, `mkt_l1_rt`, `estimates_consensus`.
3. Earnings recap factor: `event_calendar_earnings`, `earnings_actual_surprise`, `estimates_consensus`, `transcripts_earnings_call`.
4. Liquidity factor: `mkt_bars_adjusted`, `mkt_breadth_internals`, and available trading aggregate fields from QVeris payloads.
5. Correlation factor: `mkt_bars_adjusted`, `risk_beta_vol`, and benchmark `index_levels`.

## Live Fallback Policy

- If `sentiment_text_signals` returns a provider error, fall back to `news_fin_tagged` and derive only a qualitative news-context factor.
- Mark quantitative sentiment score fields as missing unless `sentiment_text_signals` succeeds.
- If `fundamentals_derived_ratios`, `estimates_consensus`, or `earnings_actual_surprise` fail, keep valuation and earnings factors as partial inputs with missing numeric fields; do not convert them into directional return claims.
- Set `qveris_trace[].fallback_used: true` and include `primary_tool_unavailable` in `missing_fields` for fallback sentiment output.

## Output Requirements

- Use `schemas/output.schema.json` and emit a factor table with value, direction, confidence, evidence, missing fields, and trace.
- Treat sentiment as explanatory input, not a return forecast.
- Do not output buy/sell triggers, target prices, or rebalancing instructions.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use yfinance, Adanos/Funda, dynamic data-package installs, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
