---
name: qveris-energy-inventory-impact
description: Explain oil and gas inventory releases, price reaction, energy equities, refiners, and macro readthroughs. Use when an agent needs QVeris-powered finance research, live market data, filings/news evidence, cost-aware tool calls, or source-backed investment analysis for this workflow.
---

# Energy inventory impact

Use QVeris for current facts. Do not rely on model memory for prices, filings, macro data, company events, market reaction, or news.

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

## Methodology Reference

Read `references/methodology.md` when adapting this workflow or explaining source inspiration.
