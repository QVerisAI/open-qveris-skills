---
name: qveris-tech-earnings-deepdive
description: QVeris-native adaptation of candidate 6, Tech Earnings Deepdive. Use for evidence-first technology earnings memos covering segment results, transcript themes, competition, moat, valuation inputs, reaction, and risks.
---

# QVeris Tech Earnings Deepdive

Use this skill for technology-company earnings deep dives adapted from Tech Earnings Deepdive. Preserve the multi-perspective memo shape, but convert subjective or investment-action language into evidence, scenarios, uncertainty, and verification steps backed by QVeris CAP tools.

Source record:

| Field | Value |
|---|---|
| Candidate number | 6 |
| Original repository | Tech Earnings Deepdive |
| GitHub URL | https://github.com/webleon/tech-earnings-deepdive-openclaw-skill |
| License | MIT |
| Evaluation recent activity | 2026-03-24 |
| Local source snapshot | `third_party/source_repos/06-tech-earnings-deepdive` |
| Snapshot latest commit | `5bff060` on 2026-03-24 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve entities with `ref_symbology`, `ref_security_master`, and `ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Every thesis, counter-thesis, segment trend, management quote, and reaction datapoint must include `qveris_trace`.
- Show `missing_fields` and confidence; do not infer missing competitive or segment data as fact.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Tech earnings deep dive: `earnings_actual_surprise`, `fundamentals_segment`, `estimates_consensus`, `transcripts_earnings_call`, `news_fin_tagged`.
2. Competition/moat: `ref_classification_theme`, `research_analyst_reports`, `alt_patents`, `alt_job_postings`, `alt_supply_chain`.
3. Valuation/reaction: `mkt_l1_rt`, `mkt_bars_intraday`, `mkt_after_hours`, `fundamentals_derived_ratios`.

## Live Fallback Policy

- If `fundamentals_segment` is not discovered or returns a provider error, fall back to `news_fin_tagged`, `transcripts_earnings_call`, and `estimates_consensus` for segment commentary context.
- Do not produce a segment scorecard as if segment revenue/margin data were present; move segment gaps to `missing_fields`.
- If `transcripts_earnings_call` or `earnings_actual_surprise` fails, do not present a full earnings deep dive; label the output as an estimates/news/market fallback memo.
- Use `alt_patents`, `research_analyst_reports`, and theme outputs only after checking they are actually patents, sell-side/research-like reports, or technology themes for the requested company.
- Set `qveris_trace[].fallback_used: true` and include `primary_tool_unavailable` for any conclusion based on fallback context.

## Output Requirements

- Use `schemas/output.schema.json`.
- Include thesis, evidence, contrary evidence, segment scorecard, risk, missing data, and next verification steps.
- Do not output a position decision, buy/sell point, or target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use original non-QVeris earnings/news/valuation/competition sources, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, position decisions, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
