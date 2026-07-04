---
name: qveris-sector-rotation-map
description: Map sector performance, benchmark-relative momentum, ETF proxy history, and news/catalyst context to explain market rotation. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# Sector rotation map

## Standalone Execution Contract

Treat this skill folder as self-contained. When the skill is installed or copied alone, run commands from this directory and use `scripts/run.mjs` for dry-run, fixture, and live execution.

Do not hand-write QVeris `curl` or ad hoc API calls for normal operation. Manual QVeris calls are allowed only for debugging provider behavior, must be labelled `manual_debug`, and must not be reported as a successful skill E2E run. The skill E2E path is successful only when `scripts/run.mjs` produces the Markdown report, structured JSON, and trace artifact.

`scripts/lib/qveris-runtime.mjs` is bundled runtime plumbing for this skill package. No repository-level shared directory is required when using the skill as an installed package.
Use QVeris for current facts. Do not rely on model memory for prices, filings, macro data, company events, market reaction, or news.

## Natural-Language Invocation Contract

When this skill is triggered by a user request, treat the skill as responsible for the final artifacts. The user should not need to know or request a command. Produce these canonical outputs whenever the user asks for analysis, a report, or a reusable result:

- Markdown report
- Schema-valid business JSON
- QVeris trace JSON with tool IDs, providers, parameters, execution IDs, costs, skipped calls, and missing-data notes

Use `scripts/run.mjs` internally to produce the canonical outputs. Always pass a business JSON output path when producing artifacts. In the final response, link the report, business JSON, and trace, and summarize paid calls, credits, execution status, and missing-data limits.

Do not create alternate runners, alternate schemas, or one-off JSON shapes for normal use. If the canonical runner lacks a metric, state the gap in `missing_data` and improve this skill later; do not silently replace the skill with ad hoc code. Manual QVeris calls, web search, or provider-specific debugging may supplement the analysis only when labelled `manual_debug`; they cannot replace the canonical runner output or be reported as successful skill E2E.

If the user has not authorized paid QVeris calls, stop after dry-run/preflight or ask for approval. If the user authorizes QVeris spend, run live and stay within the stated budget.

## Internal Deterministic Runner

Use the local runner internally before composing a free-form answer:

```bash
node scripts/run.mjs --dry-run --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30
node scripts/run.mjs --live --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30 --max-paid-calls 15 --max-credits 360 --output artifacts/live-smoke.md --json-output artifacts/live-smoke.json --trace artifacts/live-smoke-trace.json
```

The runner performs QVeris Discover / Inspect preflight, enforces paid-call and credit budgets, writes a Markdown report, writes schema-valid business JSON, and writes a JSON trace.

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

The JSON artifact must include `rotation_quadrants`, `momentum_scores`, `relative_strength_scores`, `benchmark_relative_history`, role-level `missing_data`, and explicit `missing_outputs`. Snapshot-derived quadrants are allowed when sector snapshot data is present. News/catalyst context is not the same as ETF fund-flow or earnings-revision confirmation; if direct flow or revision routes are unavailable, label those routes as missing instead of implying confirmation.

## Cost Guardrails

- Discover and Inspect are treated as free preflight actions.
- Paid actions are QVeris Call executions.
- Provider fallback attempts are also paid actions and must remain inside `--max-paid-calls` and `--max-credits`; fallback attempts are recorded in the trace.
- If estimated credits exceed the user's budget, reduce sector proxies, shorten windows, or ask for approval before continuing.

## Methodology Reference

Read `references/methodology.md` when adapting this workflow or explaining source inspiration. Read `references/source-review.md` for GitHub research and `references/qveris-tool-map.md` before changing QVeris data routing.
