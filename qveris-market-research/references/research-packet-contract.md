# Research packet contract

The canonical packet version is `qveris.market-research-packet.v1`. `schemas/output.schema.json` defines its static shape; `scripts/validate_research_packet.py` adds cross-record, sidecar, ranking, cutoff, and review-gate checks.

## Required top-level fields

```json
{
  "schema_version": "qveris.market-research-packet.v1",
  "status": "partial",
  "workflow_stage": "awaiting_comps_review",
  "distribution_status": "not_authorized",
  "controls": {
    "dry_run": false,
    "max_calls": 24,
    "max_web_operations": 20,
    "max_age": "P1D",
    "budget_note": "identity and core peer evidence first",
    "source_mode": "hybrid_cap_audited_web"
  },
  "research_question": "Which parts of the selected value chain are changing structurally?",
  "as_of": "2026-08-03T10:00:00+08:00",
  "cutoff": {
    "T0": "2026-08-03T10:00:00+08:00",
    "CUT_OFF": "2026-08-03T10:00:00+08:00",
    "effective_cutoff": "2026-08-03T10:00:00+08:00"
  },
  "scope": {},
  "planned_universe": [],
  "evidence_matrix": [],
  "planned_calls": [],
  "universe": [],
  "sources": [],
  "claims": [],
  "calculations": [],
  "peer_comps": [],
  "research_candidates": [],
  "gaps": [],
  "review_gates": {
    "comps_review": {"status": "pending", "reviewer": "", "reviewed_at": "", "notes": ""},
    "draft_review": {"status": "pending", "reviewer": "", "reviewed_at": "", "notes": ""}
  },
  "workflow_guard_status": "not_run",
  "observed_call_count": 0,
  "qveris_trace": [],
  "web_trace": [],
  "artifacts": [],
  "disclaimer": "Not investment advice."
}
```

Allowed packet states are `complete_draft`, `partial`, `budget_limited`, and `blocked`; workflow stages are `planned`, `awaiting_comps_review`, `awaiting_draft_review`, and `complete`. Distribution is always `not_authorized`.

Input binding is deterministic: capture immutable `T0` at workflow start; use an explicit `CUT_OFF` when supplied; otherwise bind a user-supplied input `as_of` to `CUT_OFF`; only when neither is supplied set `CUT_OFF=T0`. Persisted packet `as_of` always equals `effective_cutoff=min(T0,CUT_OFF)`.

`dry_run=true` requires `workflow_stage=planned`, zero observed calls, no CAP/Web evidence, no Trace rows, and no non-empty `web_sources.v1` sidecar. Put unverified leads, field requirements, and estimated calls in the three `planned_*` arrays. Each planned call records a logical `qveris_finance.*` name, purpose, required flag, non-negative call estimate, and explicit batch assumption. `call_estimate` is the worst-case `/capabilities/query` attempt reserve for that row under the stated batch assumption, including the initial attempt and every retry or documented correction permitted by the retry policy.

Use `budget_limited` when required worst-case planned attempts exceed `controls.max_calls`. A live packet may also use it after `observed_call_count` reaches `controls.max_calls` if at least one `evidence_matrix` row has `required=true` and `status=missing`. The validator rejects `budget_limited` when neither condition is present.

## Universe records

Every row requires a unique `symbol`, `issuer`, `market`, `exchange`, `asset_type`, `currency`, `inclusion_reason`, and `identity_status=accepted`. Add listing class, stable identifiers, cross-listing links, fiscal year-end, accounting basis, and exclusion notes when known.

Issuer and security are distinct. Do not count A/H shares, ADRs, or dual-class securities as separate operating companies in revenue or market-share aggregation.

## Source records

QVeris source:

```json
{
  "source_id": "src-cap-001",
  "source_type": "qveris_finance",
  "tool_name": "qveris_finance.fundamentals_is",
  "execution_id": "execution-from-observed-call",
  "as_of": "2026-08-03T09:00:00+08:00"
}
```

The execution ID must exist in the QVeris Trace. Web source:

```json
{
  "source_id": "src-web-001",
  "source_type": "web",
  "final_url": "https://issuer.example/document",
  "publisher": "Issuer legal name",
  "publisher_owner": "Issuer legal name",
  "published_at": "2026-07-30T00:00:00+08:00",
  "accessed_at": "2026-08-03T09:10:00+08:00",
  "body_sha256": "64-lowercase-hex-characters",
  "issuer_or_topic_match": true,
  "window_match": true,
  "independence_result": "issuer_primary",
  "supported_claim_ids": ["clm-001"]
}
```

An unopened URL or search snippet is not a source. Web evidence never replaces structured finance facts.

## Claim and calculation records

Claim types are `fact`, `calculation`, `assumption`, and `judgment`; statuses are `supported`, `partially_supported`, `unsupported`, and `conflicted`.

Facts and judgments reference known source IDs. Calculated claims reference known calculation IDs. Unsupported or conflicted claims may appear only in gaps or pending checks.

A calculation requires a unique ID, readable formula, non-empty inputs with source IDs, result value, currency, unit, period end, rounding rule, and `check_status` of `passed`, `failed`, or `pending`. `complete_draft` permits only `passed` calculations.

## Comparisons and candidates

Each peer belongs to the frozen universe and declares one coverage tier. A `complete_comparable` peer also records:

- `factor_set`;
- `window_start` and `window_end`;
- `fiscal_period`;
- `measurement_basis`;
- `currency_convention`.

A ranked candidate must be `complete_comparable`, cite at least two supported claim IDs, and include counterevidence, main risk, and next check. Any ranking requires `workflow_guard_status=accepted` and at least three fully comparable peers.

At `workflow_stage=awaiting_comps_review`, candidates may express unranked priority criteria but may not contain `rank`, `score`, or `final_score`.

## Review gates

Gate status is one of `pending`, `approved`, `changes_requested`, or `waived`. An approved or waived gate records a non-empty reviewer and reviewed timestamp. `complete_draft` requires both gates approved or waived. Absence of a response remains `pending`.

## QVeris Trace and sidecar

Every QVeris row contains exactly:

```json
{
  "tool_name": "qveris_finance.ref_security_master",
  "params": {"symbol": "EXAMPLE"},
  "status": "success",
  "execution_id": "exec-001",
  "fallback_used": false,
  "missing_fields": []
}
```

Allowed status values are `success`, `failed`, and `rejected`. Parameters must be sanitized and may not contain provider, route, candidate, failover, credential, API-key, raw-tool-ID, or similar routing metadata.

For live or E2E output, `qveris_trace` must match the saved `observed_calls.v1` sidecar row for row, and `observed_call_count` must equal its length. Accepted Web sources must match a saved `web_sources.v1` sidecar. The validator scans both sidecars for credential and routing metadata. Web operations are represented only in `web_trace` and `web_sources.v1`.

## Artifacts and publication boundary

Every artifact record includes a path and 64-character SHA-256. Persistence must be idempotent by hash and incapable of entering a finance Call path. This skill cannot upload, email, publish, archive, or authorize distribution.

The report and packet end with the research-only boundary `Not investment advice.`
