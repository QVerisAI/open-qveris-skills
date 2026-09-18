# QVeris Finance Workflow Semantic Guards

Use these guards after CAP/Web evidence collection and before any comparison, ranking, sentiment summary, or final prose. They control claims, not transport retries.

## Decision Context

Create one immutable context for the report:

- `expected_symbol`, `expected_name`, `expected_market`
- `T0`, `CUT_OFF`; set `effective_cutoff=min(T0,CUT_OFF)`
- requested exchange calendar and completed-session window
- requested `fiscal_year`, `fiscal_period`, and `statement_basis`
- required output layers and factor definitions

Never replace a supplied runtime binding with the current time, the latest returned timestamp, or a later close. For benchmark/replay, use the frozen bindings exactly.

## Mandatory Gate Order

1. **Identity**: require every entity-scoped evidence row to prove the requested symbol or issuer and market. Missing proof is `semantic_entity_missing`; mixed/wrong rows are rejected together, not averaged away.
2. **Time**: validate publication, quote, event, report, period-end, and as-of timestamps against `effective_cutoff`. An intraday quote requires an intraday timestamp. Only an explicitly requested future-event horizon may exceed the cutoff.
3. **Fiscal period**: require explicit FY/FQ and basis proof. `YYYY-12-31` may prove the matching A-share annual year; a quarter end cannot. Missing single-quarter/cumulative basis prevents a complete FQ comparison.
4. **Observations and formulas**: derive adjacent returns from sorted validated prices. `N` price observations produce exactly `N-1` returns. Record formula inputs and the resulting observation/return counts.
5. **Comparable ranking**: rank only a fixed, disclosed universe whose rows share the same window and every required factor. A required denominator must be finite and non-zero. If any row lacks a common factor or denominator, output an unranked coverage table and `ranking_unsupported`.
6. **News and sentiment**: use only opened, body-hashed, issuer-matched, in-window sources. Count syndicated copies under one publisher owner once. Fewer than two independent sources means `insufficient`; two or more sources support only a statement about the qualifying source sample, never overall market sentiment.
7. **Claim ledger**: before prose, map every material claim to accepted evidence IDs, entity, period/window, calculation record, and guard result. Unsupported claims go only to `Data Quality And Missing Fields`.

## Deterministic Helper

Use `scripts/qveris_workflow_guards.mjs` for derived or multi-layer workflows. It returns `qveris.finance-workflow-guards.v1` decisions and does not count as an external/QVeris call.

```bash
node {baseDir}/scripts/qveris_workflow_guards.mjs temporal --input-json '{"t0":"2026-07-28T14:11:00+08:00","cut_off":"2026-07-28T23:59:59+08:00","timestamps":[{"field":"quote_time","value":"2026-07-28T14:10:00+08:00"}],"require_intraday_timestamp":true}'

node {baseDir}/scripts/qveris_workflow_guards.mjs fiscal --input-json '{"fiscal_year":2025,"fiscal_period":"FY","statement_basis":"annual","records":[{"period_end":"2025-12-31","statement_basis":"annual"}]}'

node {baseDir}/scripts/qveris_workflow_guards.mjs returns --input-json '{"prices":[100,101,102]}'

node {baseDir}/scripts/qveris_workflow_guards.mjs ranking --input-json '{"required_factors":["momentum",{"name":"roe","denominator_required":true}],"rows":[]}'
```

Available commands: `cutoff`, `temporal`, `identity`, `fiscal`, `returns`, `ranking`, and `sentiment`.

If the helper cannot run, apply the same rules manually and record `workflow_guard_unavailable`. Do not treat helper absence as permission to calculate, rank, or make a stronger claim.

## Honest Degradation

- A rejected layer does not invalidate unrelated accepted evidence.
- Missing or provider-failed evidence earns a narrower report when disclosed honestly.
- Do not hard-fail ordinary missing data merely because it is missing.
- Do hard-reject future evidence, wrong/missing entity proof, wrong market, wrong period/basis, fabricated conditional capability, and investment instructions.
- `full_note` requires every requested core layer. Otherwise use the Skill's limited/coverage mode and open Summary with the missing deliverables.
