---
name: qveris-market-research
description: Build auditable sector, thematic, competitive-landscape, and peer-comps research across A-share, Hong Kong, US, and cross-market universes. Use for industry primers, value-chain maps, normalized company comparisons, research-candidate prioritization, and review-gated research drafts that require standardized qveris_finance.* CAP evidence, audited Web document evidence, deterministic validity checks, traceability, and no investment advice.
---

# QVeris Market Research

Build a review-ready market-research draft from validated evidence. Preserve the source package's brief, evidence matrix, claim/calculation ledgers, cross-market normalization, and two review gates while replacing generic QVeris Discover/Inspect/Call and provider-specific paths with standardized finance CAPs plus an audited public-document lane.

Source record:

| Field | Value |
|---|---|
| Source package | `qveris-market-research` 2.1.0 |
| Package owner | WonderfulValley |
| Source repository | https://github.com/WonderfulValley/qveris-finbot |
| Package SHA-256 | `028889ab19e237c553bc3b7f758ec719e5f78d9d62e17fefe8349277d3e72e0d` |
| Package build date | 2026-08-03 |
| License | MIT |

## Runtime Contract

- Use the Skill-owned `scripts/qveris_finance_adapter.mjs` for every structured finance call. A native `qveris_finance.*` tool is acceptable only when it returns the same `qveris.finance-parameter-adaptation.v1` audit.
- Never call `/capabilities/query` directly from the workflow. If native parity is unavailable, run `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<name> --param key=value --safe-json`.
- Use only `QVERIS_API_KEY`. Never expose credentials, provider names, raw routes, candidates, failover metadata, signed URLs, or raw tool IDs.
- Accept and echo `dry_run`, `max_calls`, `max_web_operations`, `max_age`, `budget_note`, `source_mode`, `T0`, `CUT_OFF`, and input `as_of`. Capture immutable `T0` at workflow start when absent. When `CUT_OFF` is absent but the user supplied `as_of`, bind that value to `CUT_OFF`; only when both are absent set `CUT_OFF=T0`. Persist report `as_of=effective_cutoff`; never bind input `as_of` to `T0`. Default to `dry_run=false`, `max_calls=24`, `max_web_operations=20`, `max_age=P1D`, a conservative budget note, and `source_mode=hybrid_cap_audited_web`.
- With `dry_run=true`, catalog and `cap-detail` inspection plus local planning/validation are allowed, but `/capabilities/query`, Web search/open, full-content retrieval, accepted evidence, Trace rows, and non-empty `web_sources.v1` sidecars are forbidden. Emit `workflow_stage=planned`, `planned_universe`, `evidence_matrix`, and `planned_calls` instead.
- Count only observed `/capabilities/query` attempts against `max_calls`; retries count. Catalog/detail control-plane reads do not count. A full-content download is part of its originating CAP attempt, not a new finance call. Count every Web search/open attempt against `max_web_operations`. Each `planned_calls.call_estimate` is the worst-case attempt reserve under its stated batch assumption, including the initial attempt and every retry or documented correction allowed by the retry policy. Sum required worst-case estimates against `max_calls`. If that minimum plan does not fit, make no optional calls and return `budget_limited`. Also return `budget_limited` when observed attempts have exhausted `max_calls` and a required `evidence_matrix` row remains `status=missing`.
- Read `references/qveris-finance-data-quality-rubric.md`, `references/qveris-finance-retry-policy.md`, and `references/qveris-workflow-semantic-guards.md` before treating CAP data as evidence.
- Read `references/qveris-web-research-policy.md` before collecting public documents, industry context, issuer news, or candidate leads.
- Build call counts, timestamps, retries, and Trace only from saved `observed_calls`. Keep Web operations in `web_trace` and `web_sources.v1`.

## Evidence Gate

- Freeze and persist `cutoff={T0,CUT_OFF,effective_cutoff}` with `effective_cutoff=min(T0,CUT_OFF)` before collection; `as_of` must equal it. Never replace a supplied cutoff, fiscal period, price date, comparison window, or review checkpoint with a later value.
- Resolve every company and security through `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master`, or `qveris_finance.ref_company_profile` before attaching evidence.
- Validate every entity-scoped row, not merely one row in a payload. Reject missing, mixed, or wrong identity, market, exchange, asset type, currency, or listing class.
- Resolve the universe from a user list, an approved frozen universe, validated classification evidence, or audited Web leads. Web leads remain `discovered_lead` until QVeris identity validation succeeds.
- Require explicit fiscal year, fiscal period, period end, and annual/single-quarter/cumulative/TTM basis for financial comparisons. Do not compare unaligned statements.
- Preserve raw and normalized value, currency, unit, price date, period, accounting basis, formula, and evidence IDs. Reject a displayed derived value when any input or provenance field is missing.
- For `N` sorted validated prices, derive exactly `N-1` adjacent returns. Record both counts.
- Assign each peer `complete_comparable`, `partial_not_ranked`, `proxy_only`, or `insufficient`. Rank only at least three peers sharing the complete factor set, window, fiscal period, currency convention, and finite denominators.
- Treat classification as sector/theme context, not market size, capital flow, competitive position, or proof of a supply-chain bottleneck.
- Require a claim-ledger entry for every material conclusion. Unsupported or conflicted claims belong only in gaps or pending checks.
- Run `python3 {baseDir}/scripts/validate_research_packet.py <packet.json> --observed-calls <sidecar.json> [--web-sources <web-sidecar.json>]` before publishing a ranked or `complete_draft` packet.

## CAP Invocation

- Read `references/qveris-tool-map.md` before choosing CAPs. Resolve logical names through the live catalog and run `cap-detail` before uncertain, alternate-data, raw-filing, classification, estimates, or specialty routes.
- Use the adapter's `final_params`, adaptation audit, sanitized response, and observed calls. Do not copy requested parameters over an observed correction.
- Fetch and validate approved HTTPS full-content payloads before using them. Reject missing or failed full-content retrieval and strip the signed URL.
- Record `envelope_success` and `contract_clean` separately. A successful envelope may still be rejected; a dirty envelope is usable only under the shared data-first rule.
- Keep failed, rejected, unavailable, and not-called layers out of Evidence. Put them in `Data Quality And Missing Fields` and observed Trace where applicable.

## Workflow

1. Read `references/market-research-workflow.md`; lock the question, scope, markets, audience, cutoff, fiscal periods, deliverables, and budget.
2. Resolve an 8–15 name universe when coverage permits. Record inclusion, exclusion, cross-listing, fiscal year-end, currency, and accounting basis.
3. Define the evidence matrix before calls: market structure, value chain, positioning, operating metrics, valuation inputs, events, risks, and counterevidence.
4. Run identity first, then the minimum comparable structured layers. Spend remaining calls on optional classifications, estimates, events, filings, or alternate data.
5. Collect public-document evidence only through the audited Web lane. Search snippets and unopened URLs are discovery, not evidence.
6. Build source, claim, calculation, gap, comparison, QVeris Trace, and Web Trace ledgers from accepted evidence.
7. Set `workflow_stage=awaiting_comps_review` and stop at Gate 1 with `pending` unless a trusted checkpoint records `approved`, `changes_requested`, or `waived` for universe and comps. Gate 1 may show unranked priority criteria, but no candidate may contain `rank`, `score`, or `final_score`.
8. Run deterministic temporal, identity, fiscal, returns, and ranking guards before analysis. Render only accepted claims.
9. Assemble the Markdown note with `assets/research-note-template.md` and validate the packet.
10. Stop at Gate 2. `complete_draft` requires both gates approved or waived, every calculation passed, verified sidecars, and `distribution_status=not_authorized`.

## Honest Degradation

- Use `complete_draft` only when every requested core layer and both review gates pass. Otherwise use `partial`, `budget_limited`, or `blocked` and open Summary with the missing deliverables.
- If fewer than three peers are fully comparable, show an unranked coverage table and `ranking_unsupported`.
- If market-size, value-chain, or competitive-position evidence is qualitative or source-limited, state its source scope; do not turn it into an unsupported numeric market estimate.
- A failed CAP never authorizes a raw provider route, generic tool discovery, or Web replacement for quotes, bars, statements, ratios, rankings, or other structured finance facts.

## Output Contract

- Use level-2 headings: `## Summary`, `## Research Scope And Universe`, `## Industry And Value Chain`, `## Competitive Landscape`, `## Peer Comps`, `## Research Candidates`, `## Evidence And Calculations`, `## Data Quality And Missing Fields`, `## Review Gates`, and `## Trace Appendix`.
- Persist `workflow_stage`, the cutoff triplet, planned-universe/evidence/call records, and observed evidence separately. Planned calls never appear in Trace.
- Label candidates as research priorities, never recommendations. Include support, counterevidence, risks, missing proof, and next checks.
- Use the exact Trace header `| tool_name | params | status | execution_id | fallback_used | missing_fields |` with one row per observed attempt.
- For live/fresh/E2E output, save verified `observed_calls.v1` and, when Web is used, `web_sources.v1`. Without them, label Trace unverified and emit no Trace rows.
- Keep `distribution_status=not_authorized`. Never upload, email, publish, archive, or claim reviewer approval.
- End with the exact final non-empty line `Not investment advice.`

## Prohibited Capabilities

Do not use legacy `/search` plus `/tools/execute`, raw finance routes, provider SDKs, source-specific finance packages, browser automation, login state, cookies, external provider keys, invented data, automatic publication, ratings, target prices, upside/downside, buy/sell wording, portfolio sizing, rebalancing, execution plans, or return forecasts.

## References

- `references/cap-bundle-provenance.md`: standalone bundle version, atomic-copy rule, and pinned hashes.
- `references/qveris-tool-map.md`: workflow-to-CAP map and capability boundaries.
- `references/qveris-web-research-policy.md`: public-document, lead-discovery, news, and qualitative evidence rules.
- `references/market-research-workflow.md`: phased research and review-gate workflow.
- `references/research-packet-contract.md`: source, claim, calculation, comparison, Trace, and gate contract.
- `references/market-localization.md`: cross-market identity, period, currency, and listing rules.
- `references/upstream-provenance.md`: package and upstream attribution.
- `schemas/output.schema.json`: canonical packet shape; the Python validator adds cross-record checks.
