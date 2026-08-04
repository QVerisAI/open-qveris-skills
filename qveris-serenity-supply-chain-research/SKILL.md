---
name: qveris-serenity-supply-chain-research
description: Map technology and industrial value chains, identify evidence-backed scarce layers, challenge single-company bottleneck theses, compare candidate pools, and run research-partner conversations using standardized qveris_finance.* CAP evidence plus audited public-document research. Use for A-share, Hong Kong, US, and cross-market theme scans that require deterministic scoring validity, explicit uncertainty, traceability, and no investment advice.
---

# QVeris Serenity Supply-Chain Research

Preserve Serenity Skill's system-change → value-chain → scarce-layer research method while replacing generic market-data and browser assumptions with standardized QVeris finance CAPs, a narrow audited public-document lane, and deterministic gates. Imitate the method, never a person or persona.

Source record:

| Field | Value |
|---|---|
| Original repository | `muxuuu/serenity-skill` |
| GitHub URL | https://github.com/muxuuu/serenity-skill |
| Reviewed commit | `c2fe93deedfd0d1bd9fe7ef0601ea1b9c20ea24a` |
| Commit date | 2026-05-05 |
| License | MIT |

## Runtime Contract

- Use the Skill-owned `scripts/qveris_finance_adapter.mjs` for every structured finance call. A native `qveris_finance.*` tool is allowed only when it returns the same `qveris.finance-parameter-adaptation.v1` audit.
- Never call `/capabilities/query` directly from the workflow. Otherwise run `node {baseDir}/scripts/qveris_finance_tool.mjs cap-query qveris_finance.<name> --param key=value --safe-json`.
- Use only `QVERIS_API_KEY`; recursively remove provider, route, candidate, failover, credential, signed-URL, and raw-tool metadata.
- Accept and echo `workflow`, `dry_run`, `max_calls`, `max_web_operations`, `max_age`, `budget_note`, `source_mode`, `T0`, and `CUT_OFF`. Capture immutable `T0` at workflow start when absent. If the user supplies only `as_of`, bind it to `CUT_OFF`; default `CUT_OFF=T0` only when neither `CUT_OFF` nor `as_of` is supplied. Default `workflow=theme_scan`, `dry_run=false`, `max_calls=24`, `max_web_operations=20`, `max_age=P1D`, a conservative budget note, and `source_mode=hybrid_cap_audited_web`.
- Supported workflows are `theme_scan`, `company_challenge`, `candidate_compare`, `research_dialogue`, and `scorecard_review`.
- Read the shared data-quality, retry, semantic-guard, and Web policies before evidence collection. Keep CAP `qveris_trace` separate from `web_trace`.
- With `dry_run=true`, catalog and `cap-detail` inspection plus local planning/validation are allowed, but `/capabilities/query`, Web search/open, full-content retrieval, accepted evidence, and Trace rows are forbidden. Emit `workflow_stage=planned`, `planned_universe`, `evidence_matrix`, and `planned_calls`.
- Count real finance attempts, including retries, only from `observed_calls`; catalog/detail reads do not count and full-content hydration belongs to its originating attempt. Count Web search/open attempts separately against `max_web_operations`. Each `planned_calls.call_estimate` is the worst-case attempt reserve under its stated batch assumption, including the initial attempt and every retry or documented correction allowed by the retry policy. If required calls cannot fit, make zero optional calls and return `budget_limited`. Also return `budget_limited` when observed attempts exhaust `max_calls` while a required `evidence_matrix` row remains `status=missing`.

## Evidence Gate

- Freeze and persist `cutoff={T0,CUT_OFF,effective_cutoff}` with `effective_cutoff=min(T0,CUT_OFF)` before collection; `as_of` must equal it.
- Build a candidate pool from an explicit user universe, an approved frozen universe, validated classification results, or audited Web leads. A Web lead cannot enter scoring until `ref_symbology`, `ref_security_master`, or `ref_company_profile` proves its identity and market.
- Require matching entity proof on every entity-scoped CAP row. Reject mixed issuers, wrong listings, funds/indexes substituted for equities, and ambiguous numeric tickers.
- Treat `alt_supply_chain` as observed relationship context only. Require relationship direction, counterparty, date, and source; co-mentions do not prove a supplier/customer relationship.
- Treat jobs, patents, contracts, filings, price, and classification as observations. They do not prove capacity, revenue, margin, delivery, market share, scarcity, or likely price direction without independent aligned evidence.
- A scarce-layer claim requires evidence for the constrained function plus at least one scarcity mechanism such as supplier concentration, qualification time, capacity, material purity, specialized equipment, lead time, or regulatory barrier. Score every accepted layer on the exact evidence-bound criteria in `references/scorecard-rubric.md`; publish the deterministic layer ranking only with at least two accepted layers.
- Emit `changed`, `expanded`, `improved`, `weakened`, or `contracted` only from a comparison record with both dates, both values, and a common basis.
- Validate FY/FQ/TTM basis, units, currencies, and periods before using fundamentals or valuation context across companies.
- Assign `complete_comparable`, `partial_not_ranked`, `proxy_only`, or `insufficient` before displaying scores. Do not convert a missing factor to zero or renormalize different factor sets.
- Every candidate needs accepted `ref_symbology`, `ref_security_master`, or `ref_company_profile` evidence IDs. Every accepted evidence item records its original public `evidence_owner`; execution IDs and QVeris routing are never treated as independent owners.
- Every scored candidate supplies the same positive, finite `denominator_checks` metric set with accepted evidence IDs. Factor and denominator evidence must itself carry the candidate's window, fiscal period, measurement basis, and currency convention. Zero, negative, missing, non-finite, or merely label-matched denominators prevent scoring.
- Publish a company ranking only when at least three candidates share the same validated factor set, window, period basis, currency convention, and finite denominators.
- Read `references/scorecard-rubric.md`, then run `node {baseDir}/scripts/serenity_validity.mjs --input-json '<contract-json>'` before any scarce-layer or company ranking. Run `scripts/serenity_scorecard.py` only for candidates the validator permits.
- Before returning a file-backed report, run `node {baseDir}/scripts/validate_research_artifact.mjs <output.json> [--observed-calls <sidecar.json>] [--web-sources <web-sidecar.json>]`; it recomputes validity and verifies evidence against both sidecars.

## CAP Invocation

- Read `references/qveris-tool-map.md`. Resolve every logical name from the live catalog; run `cap-detail` before classification, filings, estimates, alternate data, ownership, or research routes.
- Use the adapter's final params, adaptation audit, sanitized response, and observed attempts. Do not reconstruct Trace.
- Fetch and validate approved full-content objects before analysis. Strip signed URLs and reject failed retrieval.
- Keep transport status separate from semantic acceptance. Failed, rejected, or unavailable layers belong in Data Quality, not Evidence.
- Never use `qveris_finance.index_constituents` as the theme universe or `mkt_top_movers` as proof of a bottleneck, popularity, capital flow, or market-wide theme strength.

## Audited Web Lane

- Read `references/qveris-web-research-policy.md` before value-chain discovery, candidate leads, public filings, technical standards, project approvals, tenders, issuer news, or qualitative context.
- Open every accepted page, verify issuer/topic and window, record publisher owner, timestamps, final URL, body SHA-256, supported claim IDs, and independence result. Snippets are never evidence.
- Use Web for qualitative/public-document evidence only. Never replace CAP quotes, bars, statements, ratios, ownership, structured events, or rankings with Web values.
- Treat social/KOL/forum material only as rejected or unverified leads; it cannot support a top candidate.

## Workflow

1. Read `references/deep-research-workflow.md`; lock market, theme, question, cutoff, window, candidate target, and budget.
2. Translate the narrative into demand change → system pressure → required technical change → potentially constrained layer.
3. Map value-chain layers before companies. Keep economically different chips, equipment, materials, packaging, testing, interconnect, power, and cooling categories separate.
4. Form a broad lead pool when evidence allows, then spend CAP calls first on identity and only on the shortlist needed for the requested comparison.
5. Collect structured company evidence through CAPs and public-document evidence through the audited Web lane.
6. Build accepted evidence IDs, layer claims, counterevidence, factor records, coverage tiers, and next checks.
7. Run semantic guards and `serenity_validity.mjs`. Use its recomputed `priority_score` and `layer_ranking` for scarce layers; rank companies only when `candidate_ranking_allowed=true`.
8. Explain the strongest proof, the missing proof, at least one obvious layer that ranked lower, and what would falsify each priority.
9. For dialogue or learning mode, read `references/serenity-dialogue-protocol.md`, state the current evidence status, and ask one focused question per turn.

## Honest Degradation

- If the candidate pool or source count is smaller than requested, label the result `initial_pass` and list the exact next checks; do not fabricate 20 candidates or 25 sources.
- If fewer than three candidates are fully comparable, provide per-company evidence notes and `ranking_unsupported` without a numeric rank.
- If a factor lacks accepted evidence, mark it missing. Never score missing evidence as zero.
- A CAP failure never authorizes legacy routes, provider SDKs, generic tool discovery, or Web substitution for structured finance facts.
- Map top-level status deterministically: `accepted` means requested core layers and validators passed; `degraded` means useful accepted evidence with disclosed gaps; `rejected` means a semantic hard failure; `initial_pass` means discovery/coverage is incomplete and unranked; `budget_limited` means the minimum call plan does not fit; `blocked` means identity, access, or authorization prevents defensible progress.

## Output Contract

- Use level-2 headings: `## Summary`, `## System Change`, `## Scarce-Layer Map`, `## Candidate Coverage`, `## Evidence`, `## Counterevidence And Risks`, `## Next Checks`, `## Data Quality And Missing Fields`, and `## Trace Appendix`.
- Start theme scans with layers, then companies. Use direct language, but distinguish fact, calculation, lead, and judgment.
- Persist `workflow_stage`, the cutoff triplet, planned-universe/evidence/call records, and observed evidence separately. Planned calls never appear in Trace.
- Show security, layer, constrained function, coverage tier, accepted evidence IDs, missing proof, main risk, and next check. Include rank/score only when validators permit it.
- Use the exact Trace header `| tool_name | params | status | execution_id | fallback_used | missing_fields |` with one row per observed attempt.
- For live/fresh/E2E output, save verified `observed_calls.v1` and `web_sources.v1` when applicable. Accepted CAP/Web evidence and non-empty Trace require matching sidecars; otherwise omit the evidence/Trace and label the layer unverified.
- End with the exact final non-empty line `Not investment advice.`

## Prohibited Capabilities

Do not use legacy raw finance routes, provider SDKs, source-specific finance packages, browser automation, cookies/login state, external provider keys, personality cosplay, social-media hype, rumor as proof, investment ratings, target prices, upside/downside, buy/sell instructions, position sizing, rebalancing, execution plans, or return forecasts.

## References

- `references/cap-bundle-provenance.md`: standalone bundle version, atomic-copy rule, and pinned hashes.
- `references/qveris-tool-map.md`: method-to-CAP mapping and semantic limits.
- `references/qveris-web-research-policy.md`: public-document and candidate-lead audit contract.
- `references/deep-research-workflow.md`: value-chain and scarce-layer method.
- `references/evidence-ladder.md`: evidence strength and independence rules.
- `references/scorecard-rubric.md`: fixed weights, 0–5 anchors, penalties, bands, and minimum pool rule.
- `references/market-source-playbook.md`: market-specific public-document paths.
- `references/output-style-and-language.md`: direct-language report contract.
- `references/risk-and-compliance.md`: high-risk research boundaries.
- `references/upstream-provenance.md`: source attribution and adaptation record.
- `schemas/output.schema.json` and `schemas/scorecard-input.schema.json`: static artifact contracts; runtime validators add semantic checks.
- `scripts/validate_research_artifact.mjs`: packet, validity, CAP sidecar, Web sidecar, and leakage validator.
