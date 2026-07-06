---
name: qveris-08-earnings-tracker
description: QVeris-native adaptation of candidate 8, Earnings Tracker. Use for earnings calendar, watchlist, industry filtering, post-earnings recap, and price reaction workflows across US, HK, and CN markets.
---

# QVeris 08 Earnings Tracker

Use this skill for earnings calendar and recap workflows adapted from Earnings Tracker. Preserve watchlist, industry filters, US/HK/CN coverage concepts, and recap output; replace all FMP, Alpha Vantage, Yahoo, Polygon, Sina, and WebSearch adapters with QVeris CAP calls.

Source record:

| Field | Value |
|---|---|
| Candidate number | 8 |
| Original repository | Earnings Tracker |
| GitHub URL | https://github.com/Indomi/earnings-tracker |
| License | MIT |
| Evaluation recent activity | 2026-03-18 |
| Local source snapshot | `third_party/source_repos/08-earnings-tracker` |
| Snapshot latest commit | `38deb30` on 2026-03-19 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve watchlist symbols and industry filters with `ref_security_master`, `ref_symbology`, `ref_company_profile`, `ref_classification_industry`, and `ref_classification_theme`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Attach `qveris_trace` to every calendar event, surprise value, transcript quote, news item, and price reaction.
- Feishu or other notification channels are outside the financial data substrate and must not contain secrets.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, out-of-window, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Earnings calendar: `event_calendar_earnings`.
2. Post-earnings recap: `earnings_actual_surprise`, `estimates_consensus`, `transcripts_earnings_call`, `news_fin_realtime`.
3. Watchlist/industry filter: `ref_security_master`, `ref_classification_industry`, `ref_classification_theme`.
4. Price reaction: `mkt_l1_rt`, `mkt_bars_intraday`, `mkt_after_hours`.

## Output Requirements

- Use `schemas/output.schema.json`.
- Calendar rows must include event time, market, source time, missing fields, and trace.
- Filter earnings-calendar rows to the requested window; if QVeris returns earlier/later events, place them under `data_quality.out_of_window_events` and do not label them upcoming.
- Recaps must separate reported facts, estimate comparison, management commentary, and market reaction.
- If `earnings_actual_surprise` or `transcripts_earnings_call` fails, output recap-prep inputs only and mark surprise/transcript fields missing.
- Do not output buy/sell alerts or trading thresholds.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use FMP, Alpha Vantage, Yahoo, Polygon, Sina, WebSearch as a data adapter, EODHD, AkShare, Snowball, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
