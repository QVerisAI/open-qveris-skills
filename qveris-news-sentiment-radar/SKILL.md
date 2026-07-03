---
name: qveris-news-sentiment-radar
description: Monitor market-moving news, social sentiment, filings, and price reaction with QVeris so agents can separate confirmed catalysts from noisy attention. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# News sentiment radar

## Deterministic Runner

Prefer the local runner before composing a free-form answer:

```bash
node qveris-news-sentiment-radar/scripts/run.mjs --dry-run --ticker NVDA --window-days 7
node qveris-news-sentiment-radar/scripts/run.mjs --live --ticker NVDA --window-days 7 --max-paid-calls 5 --max-credits 35 --output qveris-news-sentiment-radar/artifacts/live-smoke.md --trace qveris-news-sentiment-radar/artifacts/live-smoke-trace.json
```

The runner performs QVeris Discover / Inspect preflight, enforces paid-call and credit budgets, writes a Markdown report, and writes a JSON trace with tool IDs, execution IDs, costs, skipped calls, and missing-data notes.

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

The JSON artifact must include `catalyst_confidence_score`, `corroborating_roles`, role-level `missing_data`, evidence roles, paid-call usage, and traceable execution IDs. A catalyst can be labelled `confirmed_evidence_set` only when news, aggregate sentiment, filings, and price reaction all return usable evidence.

## Cost Guardrails

- Discover and Inspect are treated as free preflight actions.
- Paid actions are QVeris Call executions.
- Provider fallback attempts are also paid actions and must remain inside `--max-paid-calls` and `--max-credits`; fallback attempts are recorded in the trace.
- If estimated credits exceed the user's budget, reduce tickers, shorten windows, or ask for approval before continuing.

## Methodology Reference

Read `references/methodology.md` when the user asks where the workflow comes from or how to adapt it. Read `references/source-review.md` for GitHub research and `references/qveris-tool-map.md` before changing QVeris data routing.

## Source Inspiration

This skill is QVeris-native and does not copy source project text, prompts, code, or branding. It adapts public workflow patterns from permissively licensed finance AI projects:

- AI4Finance-Foundation/FinGPT (MIT): Financial news, social sentiment, retrieval-augmented financial text analysis, and forecasting input patterns.
- AI4Finance-Foundation/FinRobot (Apache-2.0): Equity research automation, report generation, multi-agent financial analysis, and risk assessment patterns.
- cooragent/ClarityFinance (Apache-2.0): Claude-skill style financial workflow, planning-with-files, multi-market coverage, and screening/dashboard patterns.
