---
name: qveris-portfolio-risk-monitor
description: Monitor a portfolio for concentration, drawdown, volatility, catalyst, news, and liquidity risks with auditable QVeris calls. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# Portfolio risk monitor

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

## Cost Guardrails

- Discover and Inspect are treated as free preflight actions.
- Paid actions are QVeris Call executions.
- If estimated credits exceed the user's budget, reduce tickers, shorten windows, or ask for approval before continuing.

## Methodology Reference

Read `references/methodology.md` when the user asks where the workflow comes from or how to adapt it.

## Source Inspiration

This skill is QVeris-native and does not copy source project text, prompts, code, or branding. It adapts public workflow patterns from permissively licensed finance AI projects:

- virattt/ai-hedge-fund (MIT): Multi-lens investment agents, valuation, sentiment, fundamentals, technicals, risk manager, and portfolio manager patterns.
- AI4Finance-Foundation/FinRL (MIT): Train-test-trade workflow, market environment, risk controls, and strategy evaluation patterns.
- microsoft/qlib (MIT): Quant research pipeline, alpha seeking, factor modeling, backtesting, risk modeling, and portfolio optimization patterns.
