---
name: qveris-07-global-tech-memo
description: QVeris-native adaptation of candidate 7, Day1Global Skills. Use for global and technology investment memo templates rebuilt as trace-backed QVeris research with market, fundamentals, estimates, macro, geography, and research evidence.
---

# QVeris 07 Global Tech Memo

Use this skill to turn Day1Global Skills into a QVeris-native global/technology memo template. Treat the original repository as methodology and template reference only; do not import its execution chain.

Source record:

| Field | Value |
|---|---|
| Candidate number | 7 |
| Original repository | Day1Global Skills |
| GitHub URL | https://github.com/star23/Day1Global-Skills |
| License | MIT |
| Evaluation recent activity | 2026-04-15 |
| Local source snapshot | `third_party/source_repos/07-day1global-skills` |
| Snapshot latest commit | `562c14b` on 2026-04-15 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve the company, security, market, country, and industry with QVeris reference tools first.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for every market, fundamental, estimate, macro, and research claim.
- List `missing_fields` for geography, segment, or macro gaps.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, country, region, date window, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Global/tech memo: `ref_security_master`, `ref_company_profile`, `mkt_l1_rt`, `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `estimates_consensus`, `news_fin_tagged`, `research_analyst_reports`.
2. Sector/geography context: `ref_classification_industry`, `index_metadata`, `index_levels`, `macro_indicators`, `fx_spot`.
3. Optional technology context: `ref_classification_theme`, `alt_patents`, `alt_job_postings`, `alt_supply_chain`.

## Output Requirements

- Use `schemas/output.schema.json`.
- Preserve memo structure: company context, market/geography backdrop, business drivers, evidence table, contrary evidence, risks, and next checks.
- If FX, macro, or research payloads fail or return the wrong region/content type, mark them missing or low confidence; do not use OpenAlex-style academic rows as sell-side research.
- Do not present a recommendation, position decision, or target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not import original code, non-QVeris data adapters, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
