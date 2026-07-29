---
name: qveris-quant-factor-screen
description: Rank a stock universe with transparent QVeris factor evidence across valuation, quality, liquidity, momentum, and news risk. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# Quant factor screen

## Standalone Execution Contract

Treat this skill folder as self-contained. When the skill is installed or copied alone, run commands from this directory and use `scripts/run.mjs` for dry-run, fixture, and live execution.

Do not hand-write QVeris `curl` or ad hoc API calls for normal operation. Manual QVeris calls are allowed only for debugging provider behavior, must be labelled `manual_debug`, and must not be reported as a successful skill E2E run. The skill E2E path is successful only when `scripts/run.mjs` produces the Markdown report, structured JSON, and trace artifact.

`scripts/lib/qveris-runtime.mjs` is bundled runtime plumbing for this skill package. No repository-level shared directory is required when using the skill as an installed package.

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
node scripts/run.mjs --dry-run --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90
node scripts/run.mjs --live --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90 --max-paid-calls 25 --max-credits 520 --output artifacts/live-smoke.md --json-output artifacts/live-smoke.json --trace artifacts/live-smoke-trace.json
```

The runner performs QVeris Discover / Inspect preflight, enforces paid-call and credit budgets, writes a Markdown report, writes schema-valid business JSON, and writes a JSON trace.

## Workflow

1. Clarify ticker, market, time window, user objective, and maximum paid QVeris Call budget.
2. Use QVeris Discover (POST /search) to find the needed finance, market, filing, news, transcript, or social capabilities.
3. Use QVeris Inspect (POST /tools/by-ids) before paid execution. Show coverage, parameters, latency, success signal, and billing_rule when available.
4. Ask for explicit user approval before paid Call execution.
5. Use QVeris Call (POST /tools/execute) only for the bounded sources needed for the task.
6. Return the requested finance output with evidence strength, missing data, QVeris capabilities used, paid Call count, estimated credits, and a not-investment-advice disclaimer.

## Output Contract

Return these sections unless the user asks for a narrower format:

- Objective and scope
- Data sources discovered and inspected
- Evidence table with source type, recency, and confidence
- Analysis or ranking
- Risks, dissenting evidence, and missing proof
- QVeris calls used and estimated credits
- Not investment advice

The JSON artifact must include `ranking_table`, `factor_weights`, `tie_break_rules`, `coverage_level`, role-level `missing_data`, and explicit `missing_outputs`. The runner attempts a complete bounded universe factor panel; return `ranking_ready=false` only when budget limits or provider gaps leave one or more tickers with missing required factors.

## Cost Guardrails

- Discover and Inspect are treated as free preflight actions.
- Paid actions are QVeris Call executions.
- Provider fallback attempts are also paid actions and must remain inside `--max-paid-calls` and `--max-credits`; fallback attempts are recorded in the trace.
- Live execution requires at least one paid-call slot per ticker per required factor role. For the default five roles, a 50-stock screen requires at least 250 paid calls before the runner will start live execution.
- If estimated credits exceed the user's budget, reduce tickers, shorten windows, or ask for approval before continuing.

## Methodology Reference

Read `references/methodology.md` when the user asks where the workflow comes from or how to adapt it. Read `references/source-review.md` for GitHub research and `references/qveris-tool-map.md` before changing QVeris data routing.

## Source Inspiration

This skill is QVeris-native and does not copy source project text, prompts, code, or branding. It adapts public workflow patterns from permissively licensed finance AI projects:

- microsoft/qlib (MIT): Quant research pipeline, alpha seeking, factor modeling, backtesting, risk modeling, and portfolio optimization patterns.
- AI4Finance-Foundation/FinRL (MIT): Train-test-trade workflow, market environment, risk controls, and strategy evaluation patterns.
- cooragent/ClarityFinance (Apache-2.0): Claude-skill style financial workflow, planning-with-files, multi-market coverage, and screening/dashboard patterns.
