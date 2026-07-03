---
name: qveris-sector-rotation-map
description: Map sector performance, flows, earnings revisions, valuation, and catalysts to explain market rotation. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# Sector rotation map

Use QVeris for current facts. Do not rely on model memory for prices, filings, macro data, company events, market reaction, or news.

## Deterministic Runner

Prefer the local runner before composing a free-form answer:

```bash
node qveris-sector-rotation-map/scripts/run.mjs --dry-run --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30
node qveris-sector-rotation-map/scripts/run.mjs --live --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30 --max-paid-calls 5 --max-credits 85 --output qveris-sector-rotation-map/artifacts/live-smoke.md --trace qveris-sector-rotation-map/artifacts/live-smoke-trace.json
```

The runner performs QVeris Discover / Inspect preflight, enforces paid-call and credit budgets, writes a Markdown report, and writes a JSON trace with tool IDs, execution IDs, costs, skipped calls, and missing-data notes.

## Workflow

1. Clarify the market, tickers, time window, objective, output format, and maximum paid QVeris Call budget.
2. Use QVeris Discover (POST /search) to find the needed finance, macro, market, filing, news, or social capabilities.
3. Use QVeris Inspect (POST /tools/by-ids) before paid execution. Check parameters, coverage, freshness, success signals, and billing_rule.
4. Ask for explicit user approval before paid Call execution.
5. Use QVeris Call (POST /tools/execute) only for bounded sources needed by the task.
6. Return the result with evidence strength, missing data, QVeris capabilities used, paid Call count, estimated credits, and a not-investment-advice disclaimer.

## Output Contract

- Objective and scope
- QVeris sources discovered and inspected
- Evidence table with source type, recency, and confidence
- Analysis, ranking, dashboard, or brief requested by the user
- Risks, dissenting evidence, and missing proof
- QVeris calls used and estimated credits
- Not investment advice

The JSON artifact must include `rotation_quadrants`, `momentum_scores`, `relative_strength_scores`, role-level `missing_data`, and explicit `missing_outputs`. Snapshot-derived quadrants are allowed when sector snapshot data is present, but benchmark-relative history and flow/revision confirmation must remain marked missing until those routes return usable evidence.

## Cost Guardrails

- Discover and Inspect are treated as free preflight actions.
- Paid actions are QVeris Call executions.
- Provider fallback attempts are also paid actions and must remain inside `--max-paid-calls` and `--max-credits`; fallback attempts are recorded in the trace.
- If estimated credits exceed the user's budget, reduce sector proxies, shorten windows, or ask for approval before continuing.

## Methodology Reference

Read `references/methodology.md` when adapting this workflow or explaining source inspiration. Read `references/source-review.md` for GitHub research and `references/qveris-tool-map.md` before changing QVeris data routing.
