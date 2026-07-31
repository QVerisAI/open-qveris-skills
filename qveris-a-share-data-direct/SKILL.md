---
name: qveris-a-share-data-direct
description: Direct-QVeris adaptation of candidate 57, A-Share Skill. Use for China A-share quotes, historical bars, descriptive technical context, issuer events, sector context, A+H listing, IPO timelines, and market-news reports that must discover and call generic QVeris tools directly, validate identity and time windows, degrade honestly, and avoid investment advice.
---

# QVeris A-Share Data Direct

Use this skill for A-share research-data reads through direct QVeris tool discovery and execution. Keep the original data workflows, remove trading behavior, and treat every external value as untrusted until it passes identity, window, shape, and freshness checks.

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

- Preserve real-time quote, historical bars, descriptive technical indicators, corporate events, A+H list, A-to-HK IPO timeline, hot industry or theme reads, market news, and sector information.
- Replace local packages, source-specific scripts, direct vendor routes, and persistent provider caches with direct QVeris discovery and execution.
- Remove short-line trading, MACD plans, paper trading, accounts, orders, backtests, position rules, stop-loss rules, and entry or exit instructions.
- Keep MA, RSI, MACD, and BOLL descriptive. Never turn them into a recommendation or trade signal.

## Runtime Contract

- Use only direct QVeris discovery and execution with `QVERIS_API_KEY`.
- Use the first available tier:
  1. Bundled audited HTTP runtime: `node scripts/qveris_direct_runtime.mjs` when `exec` and Node.js are available.
  2. Native `qveris_discover` and `qveris_call` when the bundled runtime cannot run.
  3. Direct HTTP through `http_request`: `POST /api/v1/search`, `POST /api/v1/tools/execute?tool_id=...`, and `POST /api/v1/tools/by-ids` for same-session inspection.
- If neither tier exists, return `tool_runtime_missing`. Do not use web pages, original vendor endpoints, local finance packages, or invented values as structured-data substitutes.
- Read `references/qveris-direct-runtime-contract.md` before any live request. Resolve the configured `QVERIS_BASE_URL`; never hardcode or guess a deployment host.
- Write every discovery query in English as a tool-type description. Never send an issuer name, ticker, or factual question as the discovery query.
- Preserve the returned `search_id`, or normalize a native `discovery_id` to `search_id` in Trace, and pair it with the selected `tool_id` for execution.
- Accept `dry_run`, `max_calls`, `max_credits`, `max_rows`, `max_billable_quantity`, `max_age`, and `budget_note`. Default to `dry_run=false`, `max_calls=8`, `max_credits=20`, `max_rows=250`, `max_billable_quantity=500`, `max_age=P1D`, and a conservative budget note.
- Count every observed discovery, inspection, execution, and retry against `max_calls`. Never hide discovery overhead.
- Estimate credits, rows, and billable quantity from inspected billing metadata before execution. Stop on an unknown bounded estimate or any exceeded limit.
- Read `references/qveris-direct-data-quality-rubric.md` before accepting payloads. Read `references/qveris-direct-retry-policy.md` after any failed, rejected, thin, or truncated response.
- Build trace rows and call counts only from observed requests. Never add planned, skipped, or budget-blocked requests to Trace.
- Never expose credentials, authorization headers, cookies, secrets, or raw responses that contain them.
- Raw `tool_id` and `search_id` values may appear only in `## Trace Appendix` or machine-readable fixtures. Do not repeat them in Summary, Evidence, prose, filenames, or user-facing source lists.
- For live, fresh, or E2E output, use the audited runtime to save a sanitized `observed_calls.v1` sidecar. Trace must equal its `qveris_trace` projection row-for-row.
- Suppress target prices, ratings, buy or sell wording, position guidance, rebalancing instructions, and execution plans.

## Direct Invocation

1. Read `references/qveris-direct-runtime-contract.md`, define the minimum evidence set, and reserve calls and credits for discovery plus execution. If the budget cannot cover the minimum useful pair, return a budget-limited report without external claims.
2. Read `references/qveris-direct-tool-map.md`. Discover one English tool type at a time. Prefer a result with clear parameters, strong observed reliability, suitable China-market coverage, and the required output shape.
3. Save the returned search token and chosen tool identifier together. Validate required parameter names, types, formats, date rules, market coverage, and examples before execution.
4. Execute with structured values extracted from the request. For native tools, pass the selected identifier and its matching discovery token to `qveris_call`. For HTTP, send the same pair to `/tools/execute`.
5. Cache a successful tool only in the current session. Before reuse, inspect it through `/tools/by-ids` when that route is available and budgeted; reuse only if the schema and market coverage still match. If inspection is unavailable, rediscover instead of trusting a stale cache.
6. Validate the returned issuer, listing, market, exchange, asset type, window, timestamp, row count, units, and text encoding. Mark a transport-success payload `rejected` when it fails semantic validation.
7. Record one Trace row for every observed `search`, `tools/by-ids`, and `tools/execute` attempt. Normalize native discovery and call operations to those request kinds.
8. When the audited runtime is available, annotate semantic rejection in the saved sidecar instead of editing report Trace by hand.

## Evidence Gate

- Resolve each symbol with a directly discovered China A-share security-master or symbology tool before using quote, bar, event, sector, or news data.
- Require mainland listing evidence to match the requested security. Reject funds, indexes, unrelated listings, and cross-market substitutions.
- Normalize unambiguous six-digit symbols to `.SH` or `.SZ` only when exchange rules support the inference. Reject ambiguous codes and user-supplied market conflicts.
- Normalize bars through the bundled runtime. Use an explicit adjusted-close field or a documented and tested factor formula; otherwise reject with `adjustment_basis_unclear`.
- For “last N trading days,” use exactly N sorted, deduplicated rows. Reject thin windows instead of labeling a different count as N.
- Compute technical indicators only from validated bars and only with enough observations for every lookback. Label each result as calculated from QVeris-supplied bars.
- Build one canonical technical-fact record containing latest close, MA20, MA60, `close_vs_ma20`, and `close_vs_ma60`. Render every section from that record; reject contradictory relations.
- For events and IPO or listing timelines, require event date, event type, issuer identity, and requested-window alignment.
- Reject mojibake and replacement-character text. Do not repair or infer corrupted company names, industry labels, event titles, or news text.
- Treat industry classification, constituents, and top movers as market-activity context, not fund-flow evidence.
- Treat general or tagged news as qualitative context unless a directly called text-sentiment tool returns issuer-matched evidence.
- Use A+H mapping, IPO timeline, dedicated sector view, top movers, or issuer-event tools only when discovery metadata and returned fields prove the requested semantics.

## Workflows

1. Market data: resolve symbol, discover and call quote and bar tools, validate freshness and window, then summarize price and volume without trading language.
2. Technical context: compute requested indicators from validated bars; mark missing values when observations are insufficient.
3. Corporate events: call issuer-event or earnings-calendar tools and reject wrong-issuer or out-of-window rows.
4. Sector context: call classification, constituent, sector-performance, or top-mover tools as available; label proxies and missing fund-flow evidence.
5. News context: call issuer-news and optional text-sentiment tools; keep mixed-entity or broad-market rows out of issuer conclusions.
6. A+H or IPO timeline: use directly discovered security-mapping and event-calendar tools only when both listing identity and dates are explicit.

## Fallback Policy

- Follow `references/qveris-direct-retry-policy.md` and stay inside the remaining call budget.
- On a poor discovery result, try at most one rephrased English tool-type query when budget permits.
- On a parameter error, inspect once when possible, correct only documented parameters, and retry once.
- On an explicitly transient failure, retry the same request once. Do not retry semantic mismatches as transport failures.
- A second candidate from the same discovery result may be used with the same returned search token when its schema is validated. Mark the execution row `fallback_used=true`.
- If bars are thin, do not calculate trends or indicators. If issuer, event, or window identity fails, reject the payload.
- If requested core evidence is unavailable, switch the report mode to `Latest Snapshot And Coverage Notes`. The first Summary sentence must list every requested deliverable that could not be produced.

## Output Requirements

- Use these level-2 headings exactly: `## Summary`, `## Evidence`, `## Market Data Read`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- In Evidence, identify tools only by human-readable tool type, such as `China A-share daily bars API`. Do not include raw identifiers or search tokens there.
- Render the Trace Appendix with this exact header:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

- Use compact JSON for `params` and `missing_fields`. Use `null` for non-applicable cells.
- For a successful discovery row, record the English query, returned search token, and chosen tool identifier. If no relevant tool was chosen, use `tool_id=null` and add a reason to `missing_fields`.
- For an execution row, use `query=null` and preserve the exact tool and search pair used. For an inspection row, use `query=null` and the inspected tool identifier.
- Report `missing_fields`, `data_quality.status`, stale fields, rejected-payload reasons, and suppressed fields.
- Echo all call, credit, row, and billable-quantity controls and their observed or estimated usage.
- Keep full machine-readable trace JSON in fixtures, the appendix, or a user-requested machine output only.
- End every user-facing report with exactly `Not investment advice.`

## Prohibited Behavior

Do not use non-QVeris finance sources, web scraping, browser automation, cookies, login state, external provider keys, dynamic package installs, automated or paper trading, short-term playbooks, recommendations, target prices, portfolio instructions, or execution plans.

## References

- Read `references/qveris-direct-runtime-contract.md` before any live direct request.
- Read `references/qveris-direct-tool-map.md` before discovery.
- Read `references/qveris-direct-data-quality-rubric.md` before treating a payload as evidence.
- Read `references/qveris-direct-retry-policy.md` after a failed, rejected, thin, or truncated call.
- Use `examples/default-markdown-report.md` as the primary user-facing shape.
- Use `fixtures/qveris/*.json` only as machine-readable schema fixtures.
