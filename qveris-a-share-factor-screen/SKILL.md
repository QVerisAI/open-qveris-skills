---
name: qveris-a-share-factor-screen
description: QVeris-native adaptation of candidate 32, Alphasift. Use for China A-share universe screening, factor scoring, candidate-pool research, strategy screen review, and post-hoc evaluation that must use qveris_finance.* CAP evidence, transparent missing-data handling, and no investment advice.
---

# QVeris A-Share Factor Screen

Use this skill to preserve Alphasift's research-screening workflow while replacing local market data packages, model-provider assumptions, and stock-picking language with QVeris-only evidence and auditable factor notes.

Source record:

| Field | Value |
|---|---|
| Candidate number | 32 |
| Original repository | Alphasift |
| GitHub URL | https://github.com/ZhuLinsen/alphasift |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-07-03 |
| Local source snapshot | `third_party/source_repos/32-alphasift` |
| Snapshot latest commit | `9f52274` on 2026-07-03 |

## Source Adaptation

- Preserve Alphasift's core shape: strategy catalog, `screen`, hard filters, factor scoring, risk/source-health fields, saved-run metadata, reports, and T+N post-hoc evaluation.
- Replace original data packages and provider paths (`efinance`, `akshare`, `baostock`, `tushare`, `yfinance`, HTTP source fallbacks) with QVeris CAP evidence.
- Remove operational LLM-provider requirements and external analyzers from the runtime contract. Original `litellm`, DSA, and deep-analysis fields are migration context only.
- Suppress or rename fields that imply actions, such as `operation_advice`, invalidators used as trading instructions, buy/sell wording, target prices, and position actions.
- Treat strategy output as a transparent research candidate pool. Only output a rank when the same factor set, price window, fiscal period, and market convention are comparable across at least 3 securities.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Default natural-language output to a Markdown user report, not a JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Read `references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as factor evidence.
- Use `references/qveris-finance-retry-policy.md` for failed calls, invalid capabilities, payload truncation, and semantic mismatches.
- Normalize all trace labels to `qveris_finance.*`; do not print raw vendor, route, source-provider, or failover names.
- Treat screening output as a research candidate pool, not as investment advice or an action list.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, and trade execution plans even if present in QVeris payloads.

## Evidence Gate

- Resolve the universe with `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master`, or an explicit user-supplied ticker list. Use `qveris_finance.index_constituents` only after current `cap-detail` confirms params and fields.
- If the user asks for full-market screening and no validated full-universe route is available within budget, return a budget-limited report with required next calls; do not silently screen a tiny proxy universe.
- For A-share requests, reject securities whose returned market, exchange, listing class, or asset type does not match the requested mainland equity universe.
- Require comparable windows before ranking factors: same price window for momentum/liquidity/volatility; same fiscal period for valuation/quality; same market convention for cross-sectional ranks.
- Require at least 2 bars for simple multi-day metrics and at least the requested lookback length plus one observation for lookback indicators.
- Do not compute percentiles or ranks from fewer than 3 comparable securities; output per-name notes instead.
- For Chinese text fields, hard reject mojibake or replacement-character artifacts. Do not quote corrupted company names, industry labels, event titles, news snippets, or research titles in factor evidence; keep valid numeric/date fields only if identity and window checks pass, and mark the text fields `encoding_artifact`.
- Treat `qveris_finance.news_fin_tagged` as qualitative background only unless `qveris_finance.sentiment_text_signals` succeeds.
- For post-hoc evaluation, separate `as_of` evidence from evaluation-window bars; never let future bars influence the screen score.
- If the original strategy requires a field QVeris cannot validate, mark that factor component missing and disclose the changed denominator.

## CAP Invocation

- Prefer native `qveris_finance.*` tools when exposed by the runtime.
- If native tools are unavailable and the run is in this repository root, use the repository CLI: `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- If the skill is installed standalone without native `qveris_finance.*` tools and without `qveris-official`, mark `tool_runtime_missing`; do not use web, legacy providers, or invented data as fallback.
- Use `cap-detail` before calling sensitive or uncertain routes such as constituents, classification, analyst reports, corporate events, EOD bars, top movers, or text sentiment.
- Keep failed, rejected, or not-called capabilities in `Data Quality And Missing Fields` and the trace appendix, not in the evidence table.

## Workflows

1. Scope the screen: identify universe, as-of date, factor set, maximum calls, and whether post-hoc evaluation is requested.
2. Resolve the universe: validate each identifier and keep unresolved or non-A-share instruments out of the scored set.
3. Collect factor inputs: use bars for momentum/liquidity/volatility, statements and derived ratios for valuation/quality, classification for sector context, and sentiment/news only within their evidence limits.
4. Score transparently: calculate component scores only from validated fields; remove missing components from the denominator and show coverage percentage.
5. Report the screen: present coverage tiers and per-name evidence notes by default; add rank only when all comparability gates pass.
6. Evaluate post-hoc only when requested: fetch evaluation-window bars after the `as_of` date, label the result as historical evaluation, and avoid return forecasts.

## Fallback Policy

- If a primary factor CAP fails after allowed retries, mark that component missing and lower confidence; do not replace it with unsupported inference.
- If only proxy sector or news evidence is available, label the status `proxy_only` and keep claims narrow.
- If cross-sectional comparability fails, avoid ranking and provide per-security evidence notes.
- If `max_calls` prevents universe coverage, return a budget-limited report with the exact QVeris calls still needed.
- If a successful payload contains the wrong security, wrong window, wrong fiscal period, or truncated content, hard reject it and mark the reason.
- If a successful payload contains corrupted text fields, exclude the corrupted fields from the report body and mark `encoding_artifact`; do not translate, repair, or infer the intended wording.

## Output Requirements

- Use level-2 Markdown headings exactly for this user-report structure: `## Summary`, `## Screen Results`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`. Do not replace these headings with bold text.
- Include a factor table with security, validated factor values, component coverage, evidence status, and missing fields. Use rank columns only when comparability gates pass; otherwise use coverage tier or per-name notes.
- Include a concise trace table with `qveris_finance.*` capability, parameters, success/failure, fallback, and rejection reason.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- End user-facing reports with `Not investment advice.`

## Prohibited Capabilities

Do not output investment recommendations, buy/sell triggers, target prices, upside/downside, rebalancing, execution instructions, automated trading, non-QVeris data pulls, web scraping, login/cookie use, provider keys, or strategy claims unsupported by historical evidence.

## References

- Read `references/qveris-tool-map.md` before choosing calls for an A-share factor screen.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
