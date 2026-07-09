---
name: qveris-alphaear-market-intelligence
description: QVeris-native adaptation of candidate 42, Awesome Finance Skills / AlphaEar. Use for stock lookup, price/fundamental context, finance news, sentiment notes, signal-monitor updates, and market-intelligence reports that must use qveris_finance.* evidence, honest fallback, Markdown output, traceability, and no investment advice.
---

# QVeris AlphaEar Market Intelligence

Use this skill to preserve AlphaEar's stock, news, sentiment, signal-tracking, and reporting workflows while replacing direct public feeds, local databases, model downloads, and prediction tooling with QVeris finance CAP evidence.

Source record:

| Field | Value |
|---|---|
| Candidate number | 42 |
| Original repository | Awesome Finance Skills / AlphaEar |
| GitHub URL | https://github.com/RKiding/Awesome-finance-skills |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-03-29 |
| Local source snapshot | `third_party/source_repos/42-awesome-finance-skills` |
| Snapshot latest commit | `853f09b` on 2026-03-29 |

## Source Adaptation

- Preserve the original AlphaEar intent: ticker lookup, stock price context, financial fundamentals, finance news, sentiment analysis, signal evolution, and structured reporting.
- Treat original scripts, local models, local databases, prediction-market feeds, and time-series forecast logic as migration context only.
- Convert forecasts and "investment signal" wording into descriptive monitoring: evidence can show what changed, but not whether to act.
- Use tagged news only as background unless a QVeris sentiment or cluster capability succeeds and passes issuer relevance checks.
- Keep reports user-readable by default; put full machine-readable trace JSON only in the appendix, fixtures, or when explicitly requested.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Default natural-language output to Markdown, not a large JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note.
- Read `references/qveris-finance-data-quality-rubric.md` before using any payload as evidence.
- Use `references/qveris-finance-retry-policy.md` for 5xx, fetch failures, 404s, payload truncation, and semantic mismatches.
- Normalize every trace label and `capability_id` to `qveris_finance.*`.
- Do not print raw vendor, route, candidate-provider, model, failover, or routing metadata from QVeris safe JSON.
- Reject transport-success payloads that return the wrong entity, wrong benchmark, wrong date window, wrong fiscal period, too-thin bars, empty relevant fields, or corrupted text.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, trade triggers, automated execution plans, and prediction commitments.

## Evidence Gate

- Resolve every issuer through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master` before quoting facts.
- Require returned symbol, company name, exchange, market, asset type, and currency to match the request.
- Require at least 2 observations before computing returns, trends, liquidity, volatility, drawdown, or correlation.
- Require financial statements and derived ratios to match fiscal year, fiscal period, period end, and basis.
- If an annual or FY statement request returns latest-quarter or TTM-shaped data, retry once with stricter documented period parameters after `cap-detail`; if still mismatched, mark the requested period missing.
- Use `qveris_finance.news_fin_tagged` as qualitative background only unless `qveris_finance.sentiment_text_signals` succeeds.
- Do not infer strong sentiment, strong catalysts, or directional risk from tagged news alone.
- Treat removed or unverified routes such as news clusters, prediction-market feeds, and forecast models as `capability_unavailable` unless current `cap-detail` confirms a QVeris finance CAP.

## CAP Invocation

- Prefer native `qveris_finance.*` tools when exposed by the runtime.
- If native tools are unavailable and the run is in this repository root, use: `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- If installed standalone without native `qveris_finance.*` tools and without `qveris-official`, mark `tool_runtime_missing`; do not use web, legacy providers, local databases, or invented data as fallback.
- Use `cap-search` only when the capability ID is uncertain.
- Use `cap-detail` before adding any unvalidated sentiment, cluster, prediction, specialty, or alternate-data capability to the run.
- Keep failed calls and rejected payloads in the trace appendix when they influence missing fields or fallback status.

## Workflows

1. Market-intelligence note: resolve issuer, collect profile, quote/bars, fundamentals, news context, sentiment if available, and monitoring read.
2. Sentiment note: use QVeris sentiment first; if unavailable, use tagged news only as qualitative context with low confidence.
3. Signal-monitor update: compare new validated evidence against the user's prior thesis or watch item, then label evidence as changed/unchanged/unsupported without action language.
4. Report assembly: write Summary, Evidence, Analysis, Data Quality And Missing Fields, Trace Appendix, and final disclaimer.
5. Budget-limited run: call identity/profile first, then the minimum requested evidence; omit optional sentiment, news, or ratios when `max_calls` is too low.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a CAP returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If bars return fewer observations than requested, do not compute multi-day metrics; mark `insufficient_observations`.
- If sentiment or cluster routes fail, use tagged news as background only and mark numeric sentiment missing.
- If a successful payload is semantically wrong, exclude it from evidence and record `semantic_mismatch`, `period_mismatch`, `entity_mix`, `weak_relevance`, or `encoding_artifact`.
- If `max_calls` blocks the minimum useful workflow, return a budget-limited report rather than filling gaps.

## Output Requirements

- Use level-2 Markdown headings exactly: `## Summary`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- Include `missing_fields`, `data_quality.status`, rejected payload reasons, stale fields, and suppressed fields.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- End user-facing reports with a final non-empty line that is exactly `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris finance data sources, web scraping, browser automation, cookies, login state, external provider keys, dynamic data-package installs, local model downloads, automated trading, prediction-market execution, buy/sell triggers, target prices, upside/downside, rebalancing instructions, or execution plans.

## References

- Read `references/qveris-tool-map.md` before choosing calls.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
