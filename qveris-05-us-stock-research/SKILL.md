---
name: qveris-05-us-stock-research
description: QVeris-native adaptation of candidate 5, InvestSkill. Use for US stock 10-K digest, bear case, catalyst calendar, competitor analysis, DCF valuation inputs, and earnings call analysis using qveris_finance.* CAP evidence.
---

# QVeris 05 US Stock Research

Use this skill for US stock research workflows adapted from InvestSkill. Preserve the taxonomy around 10-K digest, bear case, catalysts, competitors, DCF inputs, and earnings calls; replace SEC scraping, external transcript sources, and third-party valuation feeds with QVeris filings, news, market, and fundamentals tools.

Source record:

| Field | Value |
|---|---|
| Candidate number | 5 |
| Original repository | InvestSkill |
| GitHub URL | https://github.com/yennanliu/InvestSkill |
| License | MIT |
| Evaluation recent activity | 2026-07-05 |
| Local source snapshot | `third_party/source_repos/05-investskill` |
| Snapshot latest commit | `49aa5da` on 2026-07-05 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Resolve symbols, companies, and CIKs with `ref_symbology`, `ref_security_master`, and `ref_company_profile`.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Every filing quote, red flag, catalyst, metric, and transcript claim must carry `qveris_trace`.
- Treat missing filing sections or XBRL fields as `missing_fields`, not facts.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, filing form, accession, fiscal period, and payload shape before using data; if a payload is stale, cross-period, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. 10-K digest: `filings_regulatory_metadata`, `filings_regulatory_raw`, `filings_structured_xbrl`.
2. Bear case/red flags: `filings_*`, `fundamentals_derived_ratios`, `news_fin_tagged`, `ownership_insider_trades`.
3. Catalyst calendar: `event_calendar_corp`, `event_calendar_earnings`, `event_calendar_ipo`, `news_fin_realtime`.
4. Competitor analysis: `ref_classification_industry`, `ref_classification_theme`, `fundamentals_derived_ratios`, `research_analyst_reports`.
5. DCF valuation inputs: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `estimates_consensus`, `rates_govt_benchmark`, `mkt_l1_rt`.
6. Earnings call analysis: `transcripts_earnings_call`, `earnings_actual_surprise`, `estimates_consensus`.

## Output Requirements

- Use `schemas/output.schema.json`.
- Output evidence-first sections: claim, source span or tool payload, interpretation, uncertainty, missing fields.
- If `filings_regulatory_raw` fails or `filings_structured_xbrl` returns metadata-like output instead of facts, limit the response to a filing-activity/red-flag sketch and do not quote 10-K sections.
- DCF output is an assumption and sensitivity table only; no target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use SEC scraping, external transcript sites, external valuation feeds, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
