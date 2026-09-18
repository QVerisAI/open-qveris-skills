# CAP-aligned market-research workflow

Use this workflow for sector primers, value-chain maps, competitive-landscape reviews, peer comps, and research-candidate prioritization. The durable review stages from the source package remain, but all structured finance evidence now enters through standardized `qveris_finance.*` capabilities.

## 1. Lock the brief

Record one answerable research question plus:

- sector or theme, angle, audience, markets, exchanges, and explicit exclusions;
- immutable workflow-start `T0` (capture it when absent), input `as_of`, `CUT_OFF`, `effective_cutoff=min(T0,CUT_OFF)`, research window, and time zone. If `CUT_OFF` is absent and the user supplied `as_of`, bind input `as_of` to `CUT_OFF`; only if both are absent default `CUT_OFF=T0`. Persisted report `as_of` equals `effective_cutoff`, not `T0`;
- fiscal periods, actual/estimate policy, accounting basis, currency convention, and price date;
- desired depth and deliverables;
- `dry_run`, `max_calls`, `max_web_operations`, `max_age`, `budget_note`, and `source_mode`.

For `dry_run=true`, use `workflow_stage=planned`. Catalog/detail inspection and local guards are allowed; finance queries, Web operations, full-content downloads, accepted evidence, Trace rows, and non-empty `web_sources.v1` sidecars are not. Record unverified leads in `planned_universe`, fields in `evidence_matrix`, and worst-case CAP attempt reserves in `planned_calls` with explicit batch assumptions. Each `call_estimate` includes the initial attempt and all retries or documented corrections allowed by the retry policy.

Do not silently widen the brief or move its cutoff. Ask only when a missing choice changes identity, comparison basis, cost, or the requested deliverable.

## 2. Freeze and resolve the universe

Start from a user list, approved checkpoint, supported classification result, or audited Web leads. For each entity, resolve legal issuer, security, ticker, exchange, asset type, listing class, currency, fiscal year-end, cross-listing relationship, inclusion reason, and exclusion status.

Use `ref_symbology`, `ref_security_master`, or `ref_company_profile` for identity. A Web lead remains `discovered_lead` until this check succeeds. Never use top movers as the universe, and do not assume a classification response is complete coverage.

An 8–15 name universe is a research target, not a call-budget promise. If the live CAP contract lacks batching, reduce the validated comparison set or return `budget_limited`; do not exceed `max_calls`.

## 3. Plan evidence before calls

Define fields and their required status before acquisition:

| Workstream | Structured CAP lane | Audited public-document lane |
|---|---|---|
| Identity and classification | reference and classification CAPs | lead discovery only |
| Business and financial profile | company profile, segment, statements, ratios | opened issuer documents for qualitative details |
| Price and valuation inputs | quote, bars, share structure, FX | never substitute Web values |
| Estimates and events | consensus and event-calendar CAPs | issuer context and public documents |
| Supply-chain or operating signals | supported alternate-data CAPs | standards, tenders, approvals, technical documents |
| Market structure and value chain | no invented structured proxy | primary sources and audited qualitative research |

Each planned field ends as `observed`, `calculated`, `estimated`, `not_applicable`, or `missing`. Separate required calls from optional calls and reserve capacity for identity. Treat every `planned_calls.call_estimate` as the worst-case number of attempts under the recorded batch assumption, including every retry or documented correction the retry policy permits. Count only saved observed `/capabilities/query` attempts; retries count. Catalog/detail reads do not count, full-content hydration remains part of the originating attempt, and Web search/open operations consume the separate Web budget. Use `budget_limited` either when the required worst-case plan exceeds `max_calls`, or when observed attempts equal `max_calls` while at least one required evidence row remains `status=missing`.

## 4. Acquire and validate evidence

Run in this order:

1. identity and listing resolution;
2. minimum financial and comparison fields;
3. classifications, estimates, events, filings, or alternate data only if needed;
4. audited Web documents for qualitative evidence and candidate leads.

Resolve logical CAP names from the live catalog and run `cap-detail` for uncertain or specialty routes. Use the skill-owned adapter. Save `observed_calls.v1`; derive the six-field QVeris Trace from it. Web collection belongs in a separate `web_sources.v1` and `web_trace`.

Reject evidence that violates the cutoff, entity, market, period, currency, unit, document, or retrieval contract. A successful transport envelope is not sufficient. Failed or rejected observations belong in data quality, not in the source or claim ledger.

## 5. Normalize comparisons

Align every displayed comparison on:

- security and issuer identity;
- fiscal period, period end, and annual/single-quarter/cumulative/TTM basis;
- actual, consensus, guidance, adjusted, or restated status;
- accounting basis and material adjustments;
- currency, unit, conversion direction and date;
- price date and enterprise-value bridge;
- metric definition and denominator validity.

Preserve raw and normalized values. Derived fields require readable formulas, input source IDs, period, currency, unit, rounding, and a deterministic check state. Negative EBITDA makes EV/EBITDA not meaningful; loss-making P/E is not a finite comparable.

Assign `complete_comparable`, `partial_not_ranked`, `proxy_only`, or `insufficient`. Ranking requires at least three peers with the same complete factor set, window, period, measurement basis, and currency convention.

## 6. Build analytical ledgers

Construct the source, claim, calculation, comparison, candidate, gap, and artifact ledgers defined in `research-packet-contract.md`.

- Every material conclusion references accepted sources or checked calculations.
- A judgment includes its support and material counterevidence.
- Unsupported and conflicted claims stay out of the executive conclusion.
- Each research candidate has at least two supporting claim IDs, counterevidence, main risk, missing proof, and next check.
- A rank means research priority and evidence coverage, never expected return.

## 7. Enforce two review gates

Gate 1 covers frozen universe and comps: identities, exclusions, periods, currencies, units, definitions, missing fields, outliers, calls used, and remaining budget.

Gate 2 covers the draft and audit: conclusions, claim coverage, calculations, counterevidence, gaps, changes since Gate 1, artifacts, and `distribution_status=not_authorized`.

While `workflow_stage=awaiting_comps_review`, Gate 1 may show unranked priority criteria only. No research-candidate record may contain `rank`, `score`, or `final_score`.

Gate state may change only through a trusted checkpoint action. Preserve `approved`, `changes_requested`, and `waived` exactly, with reviewer, timestamp, and notes. Silence and free-form text are never approval.

## 8. Validate and render

Before ranking or returning `complete_draft`:

1. run the shared temporal, identity, fiscal, return-count, and ranking guards;
2. save the packet and the exact `observed_calls.v1` sidecar;
3. run `python3 scripts/validate_research_packet.py packet.json --observed-calls observed-calls.json --web-sources web-sources.json` when Web evidence is present;
4. render the note with `assets/research-note-template.md`;
5. hash each emitted artifact and record its SHA-256.

`complete_draft` requires both gates approved or waived, non-empty accepted sources and claims, all calculations passed, verified sidecars, and distribution still unauthorized. Use `partial`, `budget_limited`, or `blocked` otherwise.

The terminal line is always `Not investment advice.`
