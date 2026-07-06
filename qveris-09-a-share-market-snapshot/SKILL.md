---
name: qveris-09-a-share-market-snapshot
description: QVeris-native adaptation of candidate 9, HHXG Market. Use for A-share market snapshot, exchange calendar, margin financing watch, news flash, concept/theme, dragon-tiger, northbound, sector flow, and large-order analysis.
---

# QVeris 09 A Share Market Snapshot

Use this skill for A-share daily market snapshots adapted from HHXG Market. Preserve the compact JSON plus markdown output shape for market breadth, index moves, concepts, margin financing, news flashes, and flows; replace all third-party A-share endpoints with QVeris A-share CAP capabilities.

Source record:

| Field | Value |
|---|---|
| Candidate number | 9 |
| Original repository | HHXG Market |
| GitHub URL | https://github.com/Niceck/hhxg-top-hhxg-python |
| License | MIT |
| Evaluation recent activity | 2026-06-20 |
| Local source snapshot | `third_party/source_repos/09-hhxg-market` |
| Snapshot latest commit | `381d2c3` on 2026-06-20 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve symbols, exchange, concepts, and trading calendar with QVeris reference tools.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for every index, breadth, mover, concept, margin, news, and flow datapoint.
- Mark news and flashes with confirmation status, source time, and `missing_fields`; do not amplify unverified items.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, exchange, symbol suffix, and payload shape before using data; if a payload is stale, cross-market, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. A-share daily snapshot: `mkt_l1_rt`, `mkt_breadth_internals`, `mkt_top_movers`, `index_levels`.
2. Trading calendar: `ref_exchange_calendar`.
3. Margin financing: `mkt_margin`.
4. News flash: `news_fin_realtime`, `news_fin_tagged`.
5. Concepts/themes: `mkt_cn_concept`, `ref_classification_theme`.
6. Dragon-tiger and flows: `flow_dragon_tiger`, `flow_northbound`, `flow_sector_capital`, `flow_large_order`.

## Live Fallback Policy

- If `mkt_breadth_internals` returns a provider error for CN, fall back to `mkt_l1_rt` on representative A-share indexes or securities, then optionally `mkt_top_movers`.
- Do not report advance/decline breadth counts unless `mkt_breadth_internals` succeeds.
- If `mkt_top_movers(market: CN)` returns non-CN securities, discard those rows and mark `top_movers` missing/low confidence.
- If margin calls fail or northbound/flow outputs are all zero/null, label them low confidence instead of treating them as confirmed flow.
- Set `qveris_trace[].fallback_used: true` and include `primary_tool_unavailable` in `missing_fields` for snapshot sections built from fallback quotes.

## Output Requirements

- Use `schemas/output.schema.json`.
- Return both `analysis.markdown_snapshot` and `analysis.json_snapshot` when possible.
- Label each news item as confirmed, developing, or unverified based on QVeris fields; lower confidence for unverified items.
- Do not output buy/sell points, hot-stock chase language, or target price commitments.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use A-share third-party market/news/margin endpoints, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
