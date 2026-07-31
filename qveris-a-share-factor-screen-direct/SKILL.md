---
name: qveris-a-share-factor-screen-direct
description: Direct-QVeris adaptation of candidate 32, Alphasift. Use for China A-share universe screening, transparent factor scoring, candidate-pool research, strategy-screen review, and historical post-hoc evaluation that must discover suitable finance tools with English tool-type queries, execute them directly through QVeris, disclose missing data, and avoid investment advice.
---

# QVeris A-Share Factor Screen Direct

Preserve Alphasift's research-screening shape while replacing local market-data packages, model-provider assumptions, and action language with direct QVeris tool discovery and execution.

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

- Preserve the strategy catalogue, `screen`, hard filters, factor scoring, source-health fields, saved-run metadata, reports, and T+N historical evaluation.
- Replace source data packages and provider-specific routes with generic QVeris `discover` and `call` operations.
- Remove runtime dependencies on external analyzers or model providers.
- Suppress fields that imply action, including `operation_advice`, target prices, ratings, buy/sell wording, position changes, and execution plans.
- Treat every result as a research candidate pool. Rank only securities that share an identical validated factor set, price window, fiscal period, measurement basis, and market convention, with at least three comparable securities.

## Runtime Contract

- Use only direct QVeris discovery, inspection, and execution with `QVERIS_API_KEY`; never expose the credential.
- Prefer native `qveris_discover` and `qveris_call` when available. Otherwise use direct HTTP `POST /search`, `POST /tools/by-ids`, and `POST /tools/execute` through an available HTTP request tool.
- If neither runtime tier exists, mark `tool_runtime_missing`. Do not use the repository script for finance-like raw tool execution.
- Default natural-language output to a Markdown report, not a JSON object.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`. Default to `dry_run=false`, no hard call limit, `max_age=P1D`, and a conservative budget note, then echo the controls.
- Count every observed `/search`, `/tools/by-ids`, and `/tools/execute` attempt against `max_calls`, including failures, retries, alternative tools, and session-cache inspection. A local calculation does not consume the QVeris call budget.
- Stop before a request that would exceed `max_calls`. List it as a required next tool type, not as an observed call or Trace row.
- Read `references/qveris-direct-data-quality-rubric.md` before accepting any payload as factor evidence.
- Use `references/qveris-direct-retry-policy.md` for failed searches, invalid parameters, payload truncation, and semantic mismatches.
- Build call counts, retry claims, timestamps, and Trace rows only from saved observed requests. Never invent a result, identifier, retry, timestamp, or per-security call.
- Keep raw returned `tool_id` and `search_id` or `discovery_id` values out of Summary, Screen Results, Evidence, Analysis, and Data Quality prose. They may appear only in the Trace Appendix or a machine-readable fixture.
- Recursively remove credentials, authorization headers, signed URLs, and internal routing metadata from every artifact.
- End every user-facing report with `Not investment advice.`

## Direct Invocation

### Discover

Translate the user's request into an English description of an API tool type. Never put a company name, ticker, factual question, or desired answer in a discovery query.

Good query patterns:

- `China A-share listed securities universe and exchange lookup API`
- `China A-share historical adjusted daily price and volume bars API`
- `China A-share company financial ratios and statements API`
- `China A-share company industry classification API`
- `China listed company financial news API`
- `China listed company earnings and corporate events API`

Use one discovery result only for the tool type described by that search. Select a tool using mainland-China coverage, parameter clarity, output relevance, success rate, and execution time. Preserve the returned search or discovery identifier with the chosen `tool_id`; never pair a tool with an identifier from another search.

### Validate And Call

Read the selected tool's parameter schema. Fill every required parameter, preserve declared types and formats, and pass security identifiers, dates, windows, and market filters as structured parameters rather than natural language. Before accepting the result, validate:

- requested security, exchange, mainland market, listing class, and asset type;
- requested start/end dates, lookback, observation count, and as-of cutoff;
- fiscal year, fiscal period, period end, currency, unit, and measurement basis;
- row shape, required fields, truncation state, and text encoding.

For native tools, call `qveris_discover`, retain its returned discovery identifier and selected tool identifier, then pass both to `qveris_call` with validated parameters.

For direct HTTP:

1. Send `{"query":"<English tool-type description>","limit":10}` to `POST /search`.
2. Retain the returned `search_id` and the selected result's `tool_id`.
3. Send `{"search_id":"<paired search_id>","parameters":{...},"max_response_size":20480}` to `POST /tools/execute?tool_id=<tool_id>`.

### Session Cache

- Cache a successful tool identifier, its paired search/discovery identifier, and its parameter schema only for the current session.
- Before reusing that cached tool later in the same session, call `/tools/by-ids`; count the inspection against `max_calls` and record it as observed.
- Reuse only when inspection confirms the same tool type, supported market, and compatible schema. Otherwise rediscover.
- Never persist or reuse a raw tool or discovery identifier across sessions.

## Evidence Gate

- Resolve the universe with a discovered A-share security-master, exchange-lookup, listed-universe, or index-constituent tool, or validate an explicit user-supplied ticker list.
- If the user asks for a full-market screen and no discovered tool can validate full coverage within budget, return a budget-limited report; do not silently use a tiny proxy universe.
- Reject returned instruments whose security, exchange, market, listing class, or asset type does not match the requested mainland equity universe.
- Assign every requested security one coverage tier before displaying factor values: `complete_comparable`, `partial_not_ranked`, `proxy_only`, or `insufficient`.
- Require identical validated factor sets, price windows, fiscal periods, measurement bases, and market conventions before ranking. Rank only the complete comparable subset.
- Require at least two bars for simple multi-day metrics and at least the requested lookback plus one observation for lookback indicators.
- Do not compute percentiles or ranks from fewer than three comparable securities; provide per-security notes instead.
- Hard reject mojibake and replacement-character artifacts in Chinese names, industry labels, event titles, news snippets, or research titles. Retain numeric/date fields only when identity and window checks pass, and mark rejected text `encoding_artifact`.
- Treat general financial news as qualitative background. Create a numeric sentiment factor only when the executed tool returns a documented sentiment signal that passes identity and window validation.
- For post-hoc evaluation, freeze the screen using only evidence at or before `as_of`, then collect evaluation-window bars after that date. Never let future bars affect the original score.
- If a strategy component cannot be validated, mark it missing and disclose the changed denominator.

## Workflow

1. Scope the universe, as-of date, factor set, `max_calls`, freshness requirement, and whether historical post-hoc evaluation is requested.
2. Plan the minimum useful sequence of discovery and execution requests before spending the budget.
3. Discover the universe/identity tool, validate its schema, execute it, and exclude unresolved or non-A-share instruments.
4. Discover and execute only the factor-input tool types needed: bars for momentum/liquidity/volatility, financials for valuation/quality, classification for sector context, and events/news within their evidence limits.
5. Partition coverage into tiers and build a per-security missing-factor matrix before scoring.
6. Score only a subset with the same complete factor denominator. Do not renormalize different denominators into one rank.
7. Report coverage tiers and gaps before any rank.
8. If requested, run a separately labeled historical post-hoc evaluation after freezing the original screen.

## Fallback Policy

- If discovery yields no relevant tool, rephrase the English tool-type query once when budget permits. Do not turn the query into an entity question.
- If execution reports a parameter error, inspect the selected tool once, correct only documented parameters, and retry once when budget permits.
- If a tool fails after the allowed retry, try another relevant result from the same search or run one rephrased discovery. Preserve the proper search/tool pairing and mark an executed alternative that supports the result with `fallback_used=true`.
- Do not retry a payload that succeeds in transport but fails security identity, market, window, period, observation-count, or encoding validation. Record the execution as `rejected` and try an alternative only when budget permits.
- If only proxy sector or qualitative news evidence is usable, label the affected component `proxy_only` and keep conclusions narrow.
- If comparability fails, omit ranking and provide per-security evidence notes.
- Do not invent data or silently switch to provider-specific APIs.

## Trace Contract

- Record one row per observed `search`, `tools/execute`, or `tools/by-ids` attempt. Include failed, rejected, retry, and alternative attempts; exclude planned, skipped, and budget-blocked requests.
- Use the exact Markdown header and order:

`| request_kind | query | tool_id | params | status | search_id | fallback_used | missing_fields |`

- Use `null` for non-applicable cells. Encode `query` as a JSON string or `null`, `params` as compact JSON, and `missing_fields` as a JSON array.
- Normalize a returned native discovery identifier into `search_id` in the report and fixtures.
- Use `status=success` for transport success accepted for possible evidence, `status=failed` for request failure, and `status=rejected` for transport success that fails semantic validation.
- Trace proves a request occurred; it does not prove the payload was accepted as evidence.

## Output Requirements

- Use these exact level-2 headings: `## Summary`, `## Screen Results`, `## Evidence`, `## Analysis`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Include security, validated factor values, component coverage, evidence status, and missing fields in the factor table. Add rank only when every comparability gate passes.
- Name evidence by tool type and validated dataset, not by raw tool identifier.
- If a live/fresh report lacks an independently saved observed-call artifact, place an unverified note before `## Trace Appendix` and render only the exact Trace header plus separator with no rows.
- Put full machine-readable observed-call JSON only in the appendix, fixtures, or a machine-readable response requested by the user.

## Prohibited Behavior

Do not output investment recommendations, buy/sell triggers, ratings, target prices, upside/downside, rebalancing, execution instructions, automated trading, non-QVeris data pulls, login/cookie use, provider keys, or strategy claims unsupported by historical evidence.

## References

- Read `references/qveris-direct-tool-map.md` before choosing discovery queries for an A-share factor screen.
- Read `references/qveris-direct-data-quality-rubric.md` before treating a payload as evidence.
- Read `references/qveris-direct-retry-policy.md` when discovery or execution fails, returns the wrong shape, or needs an alternative.
- Use `examples/default-markdown-report.md` as the primary user-facing shape example.
- Use `fixtures/qveris/*.json` as machine-readable schema fixtures only.
