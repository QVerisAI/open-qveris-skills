---
name: qveris-11-financial-document-modeling
description: QVeris-native adaptation of candidate 11, Financial Analyst Skills. Use for financial document organization, data extraction, calculations, modeling inputs, DCF assumptions, and trace-backed JSON generation from QVeris filings and fundamentals.
---

# QVeris 11 Financial Document Modeling

Use this skill for financial document extraction, calculations, modeling, and JSON generation adapted from Financial Analyst Skills. Prefer QVeris filings and structured fundamentals over local PDF/model pipelines; local user-provided documents are fallback inputs only.

Source record:

| Field | Value |
|---|---|
| Candidate number | 11 |
| Original repository | Financial Analyst Skills |
| GitHub URL | https://github.com/Ruinius/financial-analyst-skills |
| License | MIT |
| Evaluation recent activity | 2026-06-08 |
| Local source snapshot | `third_party/source_repos/11-financial-analyst-skills` |
| Snapshot latest commit | `e886093` on 2026-06-08 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY` for default financial data.
- Resolve company, ticker, CIK, and filing identity with QVeris reference and filing tools.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, `max_calls=12`, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Include `qveris_trace` for every extracted field, calculation input, model assumption, and JSON node.
- If a user supplies a local document, treat parsing as fallback, mark `fallback_used: true`, and never upload or expose private content unless explicitly requested by the user.
- Treat QVeris `_meta.source_provider` as provenance only; never call, request credentials for, or depend on those internal providers directly.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, filing form, accession, fiscal period, and payload shape before using data; if a payload is stale, cross-period, metadata-only, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Workflows

1. Document classification/organization: `filings_regulatory_metadata`, `filings_regulatory_raw`, `filings_structured_xbrl`.
2. Financial data extraction: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `fundamentals_segment`, `filings_structured_xbrl`.
3. Financial calculations: `fundamentals_derived_ratios`, `mkt_l1_rt`, `mkt_bars_adjusted`.
4. Financial modeling/DCF inputs: `fundamentals_is`, `fundamentals_bs`, `fundamentals_cf`, `estimates_consensus`, `rates_govt_benchmark`, `fx_spot`.
5. JSON model generator: emit trace-backed JSON; do not depend on local PDF extraction by default.

## Output Requirements

- Use `schemas/output.schema.json`.
- Each extracted field must include source, period, unit, confidence, missing status, and trace.
- Calculations must distinguish QVeris-provided ratios from derived local calculations.
- If `filings_structured_xbrl` returns filing metadata rather than XBRL facts, do not label it structured XBRL evidence; fall back to QVeris fundamentals and mark XBRL line items missing.
- Align statement periods before modeling; if annual requests return quarterly or TTM-like cash flow data, keep that input separate and lower confidence.
- DCF output is assumptions and sensitivity only; no target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with: `不构成投资建议 / Not investment advice.`

## Prohibited Capabilities

Do not use local PDF/model pipelines as default financial data, EODHD, Yahoo, FMP, Alpha Vantage, Polygon, AkShare, Snowball, Sina, SEC scraping, Longbridge, FinViz, Alpaca, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Use `fixtures/qveris/sample-output.json` as the minimum output shape.
