---
name: qveris-macro-policy-monitor
description: Monitor observed macroeconomic conditions, policy rates, benchmark rates, curve proxies, FX, commodities, employment, real estate, and index context with standardized QVeris evidence. Use for macro dashboards, central-bank policy backdrops, growth/inflation/labor snapshots, rates-and-FX context, or evidence-backed macro change reviews that require strict dates, frequency alignment, honest degradation, auditable Trace, no forecasts, and no investment advice.
---

# QVeris Macro Policy Monitor

Build an evidence-first macro and rates monitor adapted from LLMQuant's macro dashboard and policy-preview taxonomy. Use only standardized `qveris_finance.*` CAPs; never call upstream APIs or raw provider routes.

## Execute In Five Gates

### 1. Fix Scope

Require an explicit geography. Select one workflow:

- `macro_policy`: broad macro, policy/rates, optional FX and index context.
- `growth_inflation`: macro indicators, employment, real estate, and commodities.
- `rates_fx`: policy, government/interbank rate proxies, FX, and index context.

Fix an `as_of` time and UTC observation window. Treat data dates as observation dates unless the payload explicitly identifies release or revision dates.

### 2. Plan And Enforce Budget

Run the bundled planner before transport:

```text
node qveris-macro-policy-monitor/scripts/macro_policy_workflow.mjs --workflow macro_policy --geography US --max-calls 9 --dry-run
```

`max_calls` counts observed `capabilities/query` attempts, including retries. Catalog/detail reads are control-plane operations. The first macro and rates anchors run before optional sublayers. If both anchors do not fit, make zero data calls and return `budget_limited`.

Never plan or call:

- `EVENT.CALENDAR.MACRO`: test payload omitted its required date.
- `MACRO.ACTUAL_VS_FORECAST`: test environment returned invalid capability/404.

### 3. Execute Through The Shared Adapter

Prefer the bundled runner:

```text
node qveris-macro-policy-monitor/scripts/macro_policy_workflow.mjs --workflow macro_policy --geography US --max-calls 9 --artifact macro.observed-calls.json --output macro.json
```

The runner reads the live capability catalog and detail, dynamically resolves CAP IDs, filters unsupported parameters, coerces supported types, retries one transient `fetch failed` within budget, recursively removes routing metadata, and records exact observed attempts. Use only `QVERIS_API_KEY`.

### 4. Validate Evidence And Claims

Read `references/qveris-macro-data-quality.md` before interpretation and `references/qveris-tool-map.md` before changing the plan.

- Transport success is not evidence until shape, date, numeric value, geography, and freshness checks pass.
- One accepted observation is a `snapshot`; it cannot support `changed`, `increased`, `decreased`, `improved`, or `deteriorated`.
- Compare only the same series, geography, frequency, unit, and measurement basis across two distinct dates.
- An aligned numeric comparison may support only `increased`, `decreased`, or `unchanged`. It never means `improved` or `deteriorated` by itself.
- A curve proxy requires at least two distinct tenors on the same date, country/currency, unit, and benchmark basis.
- `INDEX.LEVELS` must return an index asset when type metadata exists; reject equity/fund mismatches.
- Market co-movement does not prove policy transmission. Keep `policy_transmission.status=unsupported` unless an independent causal design exists outside this Skill.
- Never infer a policy decision, consensus, surprise, release calendar, market reaction, or forecast from missing evidence.

### 5. Degrade And Render

Apply these fallbacks:

- If `MACRO.INDICATORS` fails, use accepted employment, real-estate, and commodity sublayers; label `complete_with_macro_fallback` only when a rates layer also succeeds.
- If all rates layers fail, return `macro_only` and suppress policy-transmission conclusions.
- If all macro layers fail, return `rates_only` and suppress broad regime conclusions.
- If neither group succeeds, return `limited`; FX/index context alone is not a macro regime.
- Missing baseline/current alignment means `snapshot_only`, not a directional change.

Always include Summary, observed macro layers, observed rates/market context, Comparison Status, Policy-Transmission Limit, Data Quality, and the Trace Appendix. Live/fresh/E2E output requires an `observed_calls.v1` sidecar whose trace projection exactly equals the report table. Static fixtures and examples contain zero Trace rows.

End every user-facing report with the exact final non-empty line:

`Not investment advice.`

## Defaults

```json
{
  "dry_run": false,
  "max_calls": 9,
  "lookback_days": 730,
  "max_age": {
    "macro": "P400D",
    "rates": "P120D",
    "market": "P7D"
  }
}
```

The runner narrows high-volume layers inside that analysis window: policy and commodity queries use at most 120 days, government/interbank rate queries at most 30 days, and the broad macro call defaults to `indicator_name=CPI`. Override the indicator or commodity explicitly; do not remove filters merely to obtain more rows.

## Trace Contract

Use exactly:

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

- `tool_name` is the logical `qveris_finance.*` name.
- `params` contains only final normalized public parameters.
- `status` is `success`, `failed`, or semantic `rejected`.
- Preserve returned execution IDs or `null`; never invent one.
- `fallback_used=true` only for an observed retry/fallback attempt.
- Remove provider, route, routing, candidate, failover, credential, raw tool ID, and provider URL metadata recursively.

## Prohibited Output

- No `improved`, `deteriorated`, `accelerating`, `decelerating`, `tight`, `loose`, `risk-on`, or `risk-off` label without an explicit, evidence-compatible rule.
- No invented release date, revision, consensus, surprise, central-bank quote, meeting outcome, or market expectation.
- No causal policy-transmission statement from temporal alignment or co-movement.
- No policy, market, return, or price forecast; no buy/sell, rebalance, or hedge instruction.
- No raw provider fallback, guessed value, or reconstructed Trace.

## Package References

- `references/qveris-tool-map.md`: approved workflow-to-CAP map and disabled CAPs.
- `references/qveris-macro-data-quality.md`: semantic gates, comparison, curve, and fallback rules.
- `references/qveris-retry-policy.md`: retry and hard-budget behavior.
- `schemas/output.schema.json`: structured output contract.
- `THIRD_PARTY_NOTICES.md`: LLMQuant source attribution.
