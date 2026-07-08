---
name: qveris-a-share-data
description: QVeris-native adaptation of candidate 57, A-Share Skill. Use for China A-share real-time quote, historical bars, technical indicator context, corporate events, sector heatmap, A+H listing, IPO timeline, and market-news reports that must use qveris_finance.* CAP evidence, honest fallback, and no investment advice.
---

# QVeris A-Share Data

Use this skill to preserve the A-Share Skill candidate's A-share research-data workflows while replacing local market packages, source-specific scripts, and short-term trading modules with QVeris-only evidence and explicit data-quality controls.

Source record:

| Field | Value |
|---|---|
| Candidate number | 57 |
| Original repository | A-Share Skill |
| GitHub URL | https://github.com/shouldnotappearcalm/a-share-skill |
| License | MIT |
| Evaluation recent activity | 2026-06-24 |
| Local source snapshot | `third_party/source_repos/57-a-share-skill` |
| Snapshot latest commit | `8494623` on 2026-06-24 |

## Source Adaptation

- Preserve the original `a-share-data` workflows: real-time quote, historical bars, technical indicators, corporate events, A+H list, A-to-HK IPO timeline, hot industry/concept reads, market news, and sector info.
- Replace original Python scripts and dependencies (`akshare`, `MyTT`, `pandas`, `numpy`, `requests`) with QVeris CAP calls plus calculated indicators from validated QVeris bars.
- Treat original source fallbacks such as direct market HTTP endpoints, sector APIs, DangInvest, and source-specific caches as migration context only.
- Remove the repository's trading modules from this QVeris skill: short-line trading, MACD trading plans, paper trading, accounts, orders, backtests, position discipline, stop-loss, and entry/exit rules.
- Keep technical indicators descriptive. Do not turn MACD, RSI, MA, or BOLL into a buy/sell/position signal.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Default natural-language output to a Markdown user report, not a JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Read `references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as evidence.
- Use `references/qveris-finance-retry-policy.md` for failed calls, invalid capabilities, payload truncation, and semantic mismatches.
- Normalize all trace labels to `qveris_finance.*`; do not print raw vendor, route, source-provider, or failover names.
- Strip the original candidate's short-term trading and paper-trading behavior. This skill only supports research data reads.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, and trade execution plans even if present in QVeris payloads.

## Evidence Gate

- Resolve each symbol through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master` before calling quote, bars, event, or news routes.
- For A-share requests, require returned market/exchange/listing-class evidence to match the requested mainland security. Reject unrelated listings, funds, indexes, or cross-market substitutions.
- For technical indicators, compute only from validated QVeris bars and require enough observations for the lookback. Label every computed indicator as calculated from QVeris bars.
- For events and IPO/listing timelines, require event date, event type, security identity, and window alignment. Keep out-of-window events out of the analysis section.
- For Chinese text fields, hard reject mojibake or replacement-character artifacts. Do not quote corrupted industry labels, event titles, news snippets, or research titles in user-facing evidence; keep valid numeric/date fields only if identity and window checks pass, and mark the text fields `encoding_artifact`.
- Treat sector views built from security-master metadata as market-activity context, not capital-flow evidence. Use classification, constituents, and top movers only after current `cap-detail` confirms params and fields.
- Treat `qveris_finance.news_fin_tagged` as qualitative context only unless `qveris_finance.sentiment_text_signals` succeeds.
- Call A+H mapping, HK listing timeline, IPO timeline, corporate-event detail, sector heatmap, top-mover, or classification routes only after a current `cap-detail` confirms a QVeris finance CAP and fields. If unavailable, mark missing.
- If the original data script supported a route but no verified QVeris finance CAP exists, report it as missing rather than returning source-specific commands.

## CAP Invocation

- Prefer native `qveris_finance.*` tools when exposed by the runtime.
- If native tools are unavailable and the run is in this repository root, use the repository CLI: `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- If the skill is installed standalone without native `qveris_finance.*` tools and without `qveris-official`, mark `tool_runtime_missing`; do not use web, legacy providers, or invented data as fallback.
- Use `cap-detail` before calling uncertain A-share specialty, classification, corporate-event, EOD-bar, top-mover, or A+H/IPO-timeline routes.
- Keep failed, rejected, and not-called capabilities in `Data Quality And Missing Fields` and the trace appendix, not in the evidence table.

## Workflows

1. Market data read: resolve symbol, fetch quote, fetch bars, validate window, and summarize price/volume fields without trading actions.
2. Technical context: compute requested indicators from validated bars only; if bars are insufficient, mark the indicator missing.
3. Corporate event read: use corporate calendar and earnings calendar where relevant; reject wrong-window events.
4. Sector heatmap read: use industry/theme classification, constituents, and top movers as available; label missing flow or heatmap CAPs.
5. News context read: use tagged finance news and text sentiment when available; keep tagged news qualitative.
6. A+H or IPO timeline read: use security master and event calendar only when fields explicitly support the requested timeline.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a capability returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If bars return fewer observations than requested, do not compute indicators or trends; mark `insufficient_observations`.
- If an event route succeeds but returns the wrong issuer or window, hard reject the payload and mark `semantic_mismatch` or `out_of_window_event`.
- If a successful payload contains corrupted text fields, exclude the corrupted fields from the report body and mark `encoding_artifact`; do not translate, repair, or infer the intended wording.
- If only tagged news is available, write background context with low confidence; do not infer strong sentiment, strong catalysts, or directional risk.

## Output Requirements

- Use level-2 Markdown headings exactly for this user-report structure: `## Summary`, `## Evidence`, `## Market Data Read`, `## Data Quality And Missing Fields`, and `## Trace Appendix`. Do not replace these headings with bold text.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- Include `missing_fields`, `data_quality.status`, stale fields, rejected payload reasons, and suppressed fields.
- End user-facing reports with `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris finance data sources, web scraping, browser automation, cookies, login state, external provider keys, dynamic data-package installs, automated trading, paper trading, short-term trading playbooks, buy/sell triggers, target prices, upside/downside, rebalancing instructions, or execution plans.

## References

- Read `references/qveris-tool-map.md` before choosing calls for an A-share data read.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
