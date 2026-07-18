---
name: qveris-a-stock-data-layer
description: QVeris-native adaptation of candidate 58, A-Stock Data. Use for China A-share quote, history, company profile, financial statement, news, research, sector, announcement, unlock, limit-move, and data-layer reports that must use qveris_finance.* CAP evidence, trace-backed fallback, and no investment advice.
---

# QVeris A-Stock Data Layer

Use this skill to preserve the A-Stock Data candidate's broad A-share data-layer intent while replacing legacy endpoints, scraping, and provider-specific dependencies with QVeris finance CAP calls.

Source record:

| Field | Value |
|---|---|
| Candidate number | 58 |
| Original repository | A-Stock Data |
| GitHub URL | https://github.com/simonlin1212/a-stock-data |
| License | Apache-2.0 |
| Evaluation recent activity | 2026-06-28 |
| Local source snapshot | `third_party/source_repos/58-a-stock-data` |
| Snapshot latest commit | `bcda405` on 2026-06-28 |

## Source Adaptation

- Preserve the original ten-layer research/data intent: market data, research reports, signals, capital/ownership, news, fundamentals, filings, limit-up/limit-down, ETF options, and investor interaction.
- Replace the original embedded Python and direct source routing with QVeris CAP calls. The source repo's endpoints, headers, anti-ban rules, `mootdx`, `requests`, `stockstats`, and optional iwencai key are migration context only.
- Convert original valuation flows to evidence-gated trailing or consensus-input notes; do not output target prices, upside/downside, trade setups, or option strategies.
- Convert limit-up, LHB, unlock, capital-flow, ETF-option, hot-list, and investor-Q&A layers to conditional capabilities: call them only after current `cap-detail` confirms a QVeris finance CAP and matching fields.
- Keep broad data-layer reports concise for users; put full call details and rejected payloads in the trace appendix.

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Execute every finance data call through this Skill's `scripts/qveris_finance_adapter.mjs`, or through a native wrapper that runs the byte-identical adapter; never call `/capabilities/query` directly from the workflow.
- Default natural-language output to a Markdown user report, not a JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Read `references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as evidence.
- Use `references/qveris-finance-retry-policy.md` for 5xx, fetch failures, 404s, payload truncation, and semantic mismatches.
- Read `references/qveris-finance-capability-fallbacks.json` before replacing a failed CAP. Use only a listed same-claim fallback, preserve its declared evidence downgrade, and keep unlisted capabilities missing.
- Build trace, call counts, retries, and timestamps only from saved `observed_calls`. Never invent an execution ID or a call that was only planned; use `execution_id=null` when an observed call returned no ID.
- Sanitize every output surface, including Evidence, Sources, prose, params, responses, and Trace. Strip provider names, provider API URLs, raw route/tool IDs, candidates, failover, credentials, and routing metadata recursively; the Trace row remains exactly `tool_name`, `params`, `status`, `execution_id`, `fallback_used`, and `missing_fields`.
- Sanity-check entity, market, exchange, asset type, currency, date window, fiscal period, and payload shape before using data.
- Treat a successful transport response with wrong A-share identity, wrong date window, wrong fiscal period, or too-thin bars as rejected evidence.
- Suppress target prices, upside/downside, ratings, buy/sell wording, rebalancing instructions, and trade execution plans even if present in a QVeris payload.

## Evidence Gate

- Resolve every issuer or instrument through `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master` before quoting it.
- For A-share requests, require returned market/exchange/listing-class evidence to match the requested mainland security. Reject payloads that resolve to a US-listed company, Hong Kong-only listing, index, fund, or unrelated ordinary share.
- Do not guess exchange suffixes from numeric tickers. If QVeris cannot resolve the symbol, mark `symbol_resolution_missing`.
- Require at least 2 observations for multi-day return, trend, volume, liquidity, volatility, or drawdown; otherwise use the payload only as a latest-point snapshot.
- For financial statements, require fiscal year, fiscal period, period end, and statement basis to match. If an annual/FY request returns latest-quarter or TTM data, retry once with stricter documented fields after `cap-detail`; if still mismatched, mark the requested statement missing.
- For Chinese text fields, hard reject mojibake or replacement-character artifacts. Do not quote corrupted company names, industry labels, event titles, news snippets, or research titles in user-facing evidence; keep valid numeric/date fields only if identity and window checks pass, and mark the text fields `encoding_artifact`.
- Treat `qveris_finance.news_fin_tagged` as qualitative context only unless `qveris_finance.sentiment_text_signals` succeeds.
- Use analyst/research rows only after a current `cap-detail` confirms issuer, report type, and date fields for the route. Suppress recommendation and target fields.
- Do not use unverified A-share specialty data such as industry/theme classification routes, corporate-event detail routes, top movers, capital flow, northbound flow, LHB, unlock calendars, limit-up boards, investor Q&A, ETF options, or concept heat as primary evidence unless a current `cap-detail` confirms a callable QVeris finance CAP with matching fields.
- If the user asks for a source-repo-only layer that QVeris has not verified, answer with `capability_unavailable` or `not_called`, not with legacy source instructions.

## CAP Invocation

- Standardized CAP invocation is mandatory. A missing CAP or runtime becomes `capability_unavailable` or `tool_runtime_missing`; it never authorizes a legacy raw route.
- Use native `qveris_finance.*` tools only when that runtime applies the same Skill-owned adapter and returns a `qveris.finance-parameter-adaptation.v1` audit; otherwise use this Skill's CLI.
- If native tools are unavailable and the run is in this repository root, use the repository CLI: `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`.
- Treat the Skill-owned CLI as the mandatory finance adapter: it resolves the live canonical CAP, filters and losslessly converts parameters, never copies sample values, permits at most three fully audited attempts, and rejects `success=false`, missing required fields, wrong entity/market/date/period, and stale real-time data. Use only its `qveris.finance-parameter-adaptation.v1` audit and actual attempt parameters in Trace.
- Permit only evidence-preserving repairs: an explicit option underlying may satisfy a live `symbol` field; an exact-date request may use `daily` after a missing-granularity error; an explicit Q1/Q2/Q3/Q4/FY context may map to provider-declared `0331/0630/0930/1231` codes after an invalid-period error. A corrected call must still pass every evidence gate.
- If the Skill-owned scripts are missing and no native `qveris_finance.*` runtime exposes the identical adapter audit, mark `tool_runtime_missing`; do not use web, legacy providers, or invented data as fallback.
- Use `cap-search` only when the capability ID is uncertain. Use `cap-detail` before adding any unvalidated A-share specialty, classification, research-report, corporate-event, EOD-bar, or top-mover capability to the run.
- Keep `cap-detail` and failed calls in the trace appendix when they influence missing fields or fallback status.
- For a listed replacement, use `cap-query-chain --chain-json <JSON>` or make the same explicit canonical CAP calls through the native runtime. A chain may contain at most three distinct `qveris_finance.*` CAPs; record `qveris.finance-capability-fallback.v1`, and never hide the failed primary CAP.

## Workflows

1. Identity gate: resolve symbol and security master. Stop the run if canonical A-share identity cannot be validated.
2. Requested-window bars: fetch the exact requested window next. If bars fail identity/window validation or are too thin for the requested analysis, return a latest snapshot or insufficient report and stop optional fan-out.
3. One financial/valuation layer: call only the single statement or valuation layer most relevant to the request; validate market support and period before expanding.
4. Event/news layer: call corporate event or tagged news only when requested or needed for the core answer.
5. Optional specialty layer: spend remaining budget on at most one requested classification, flow, LHB, unlock, limit-move, investor-Q&A, or ETF-option route after `cap-detail` confirms its contract.
6. Expand only after the preceding core gates succeed. Do not fan out across ten source layers merely because they exist in the source skill.

## Fallback Policy

- If QVeris returns 503, fetch failure, timeout, or all candidates failed, retry at most twice under the shared retry policy.
- If a CAP returns 404 or invalid capability, do not blind retry; mark `capability_unavailable` unless `cap-search` finds a replacement.
- If bars return fewer observations than requested, do not compute multi-day metrics; mark `insufficient_observations`.
- If identity, requested-window bars, or the requested financial layer fails its semantic gate, stop specialty fan-out and return the partial result with exact required next calls.
- If A-share specialty data is unavailable, return a partial data-layer report with missing fields rather than substituting web or legacy endpoints.
- Do not treat a proxy fallback as equivalent primary evidence. Apply the exact `complete`, `partial`, or `proxy_only` status and forbidden-claim list from `references/qveris-finance-capability-fallbacks.json`.
- If a successful payload contains corrupted text fields, exclude the corrupted fields from the report body and mark `encoding_artifact`; do not translate, repair, or infer the intended wording.
- If only tagged news is available, write background context with low confidence; do not infer strong sentiment, strong catalysts, or directional risk.

## Output Requirements

- Use level-2 Markdown headings exactly for this user-report structure: `## Summary`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`. Do not replace these headings with bold text.
- Include a concise evidence table with claim, `qveris_finance.*` capability, parameters, status, and fallback.
- Render the Trace Appendix with the exact parseable header `| tool_name | params | status | execution_id | fallback_used | missing_fields |`; use compact JSON values, one row per observed attempt, and no planned/not-called rows.
- For live, fresh, or E2E output, save and validate an `observed_calls.v1` sidecar whose calls record `request_kind=capabilities/query` and canonical `capability_id`; without a verified sidecar, place the unverified note before `## Trace Appendix` and emit only the exact header plus separator with no rows.
- Put full `qveris_trace` JSON only in the appendix, schema fixture, or when the user asks for machine-readable output.
- Include `missing_fields`, `data_quality.status`, stale fields, rejected payload reasons, and suppressed fields.
- End user-facing reports with `Not investment advice.`

## Prohibited Capabilities

Do not use non-QVeris finance data sources, web scraping, browser automation, cookies, login state, external provider keys, dynamic data-package installs, automated trading, buy/sell triggers, target prices, upside/downside, rebalancing instructions, or execution plans.

## References

- Use shared finance contract version `2026-07-18.3`; repository CI verifies the local rubric, retry policy, CAP registry, and output schema against `references/qveris-finance-shared-manifest.json` hashes.
- Use `references/qveris-finance-capability-fallbacks.json` for the audited cross-CAP replacement boundary.
- Read `references/qveris-tool-map.md` before choosing calls for an A-share data-layer report.
- Read `references/qveris-finance-data-quality-rubric.md` before treating any payload as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP fails, returns the wrong shape, or needs fallback.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` before adding a route to the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
