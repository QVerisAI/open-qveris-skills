# Four Skill Current State Audit

Audit date: 2026-07-02

Scope:

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

This audit covers the SOP step: read `SKILL.md`, `qveris.skill.json`, existing references, and agent files, then record what is missing before development.

## Summary

All four skills are present on branch `codex/qveris-supply-chain-research`, but they are still instruction-first skill drafts. They have product metadata and agent-facing prompts, but they do not yet have deterministic scripts, QVeris tool maps, fixtures, tests, examples, artifacts, or smoke-test traces.

The most important status issue: all four `qveris.skill.json` files currently say `"status": "published"`. Under the SOP, they should not be treated as published until scripts, tests, QVeris traces, Codex validation, and OpenClaw validation exist.

## Common File Inventory

| Path | Current state | Gap |
| --- | --- | --- |
| `SKILL.md` | Present for all four skills. Contains trigger description, generic QVeris Discover / Inspect / Call workflow, output contract, cost guardrails, and methodology/source inspiration. | Too generic for productized execution. It does not point to a runner, fixed input schema, deterministic output contract, trace schema, fixture cases, or concrete QVeris tool map. |
| `qveris.skill.json` | Present and JSON-parseable for all four skills. Includes metadata, prompts, cases, `qveris_api`, `usage_estimate`, and execution flow. | `status` is `published` before SOP evidence exists. `github_url` points to `main` while these skills are currently only on this branch. Usage estimates and platform list are not backed by smoke tests. `qveris_api` describes generic Discover / Inspect / Call only, not verified tool IDs or parameter templates. |
| `agent.md` | Present for all four skills. Gives install command and a cost reminder. | No deterministic CLI/script invocation. No failure-handling instructions. No validated OpenClaw run evidence. |
| `agents/openai.yaml` | Present for all four skills with display name, short description, and default prompt. | No verified platform compatibility evidence. No machine-readable input/output schema. |
| `references/methodology.md` | Present for all four skills. Lists inspiration sources and clean-room adaptation principles. | Not enough for SOP data adaptation: no QVeris provider/tool mapping, parameter templates, return fields, costs, or fallback strategy. |
| `references/source-review.md` | Present for all four skills after this pass. Records GitHub source review and implementation implications. | Needs to be followed by implementation route and QVeris tool map. |
| `references/qveris-tool-map.md` | Missing for all four skills. | Required before productized development. |
| `scripts/` | Missing for all four skills. | Required: runner, QVeris adapter, transforms, analysis, renderer, trace output. |
| `tests/` | Missing for all four skills. | Required: static/schema checks, mock unit tests, fixture regression, smoke-test docs. |
| `fixtures/` | Missing for all four skills. | Required: normal, missing-data, and budget-limited cases. |
| `examples/` | Missing for all four skills. | Required: 2-3 copyable commands/prompts with budget and output path. |
| `artifacts/` or `docs/examples/` | Missing for all four skills. | Required before publish: sample report and QVeris call trace. |

## Per-Skill Findings

### qveris-news-sentiment-radar

Current capability:

- Describes a QVeris-backed workflow for ticker/watchlist news, filings, social sentiment, and price reaction.
- Metadata has 3 prompts and 3 generic QVeris API stages.
- Source review identifies FinGPT, FinRobot, ClarityFinance, and one small sentiment project as inspiration.

Missing:

- Event taxonomy and deterministic catalyst categories.
- Sentiment scoring / confidence scoring rules.
- Source recency, duplicate-event clustering, and evidence-strength rules.
- Tool map for news, filings, social, quote/history, and optional transcript/newswire providers.
- Fixtures for confirmed catalyst, noisy attention, and missing/budget-limited data.

### qveris-portfolio-risk-monitor

Current capability:

- Describes a QVeris-backed workflow for concentration, drawdown, volatility, liquidity, catalyst, and news risk.
- Metadata has 3 prompts and 3 generic QVeris API stages.
- Source review identifies ai-hedge-fund, qlib, FinRL, and Quantropy as inspiration.

Missing:

- Holdings input schema: weights vs quantities, cash handling, benchmark, and currency assumptions.
- Deterministic formulas for concentration, drawdown, volatility, liquidity, beta/proxy beta, and sector exposure.
- Tool map for quotes/history, sector classification, fundamentals, news/catalysts, volume/liquidity, and benchmark data.
- Fixtures for diversified portfolio, concentrated portfolio, and incomplete-data/budget-limited portfolio.

### qveris-quant-factor-screen

Current capability:

- Describes a QVeris-backed workflow for ranking a stock universe by quality, momentum, valuation, liquidity, volatility, and news risk.
- Metadata has 3 prompts and 3 generic QVeris API stages.
- Source review identifies qlib, FinRL, Quantropy, and ClarityFinance as inspiration.

Missing:

- Universe input schema and maximum ticker-count policy.
- Factor definitions, normalization rules, weighting, missing-field policy, and tie-break rules.
- Tool map for quote/history, fundamentals, valuation ratios, financial statements, liquidity, sector classification, earnings revisions, and news-risk tools.
- Fixtures for normal five-ticker universe, missing fundamentals, and budget-limited factor coverage.

### qveris-sector-rotation-map

Current capability:

- Describes a QVeris-backed workflow for sector performance, ETF/sector proxies, macro/news context, and sector ranking.
- Metadata has 2 prompts and 3 generic QVeris API stages.
- Source review identifies qlib, ai-hedge-fund, ai-trading-claude, and sector-rotation specialist repos as inspiration.

Missing:

- Market/sector proxy mapping, for example US sector ETFs vs local-market sector indices.
- Deterministic signals: momentum, relative strength vs benchmark, volatility, drawdown, liquidity, and phase/quadrant labels.
- Tool map for sector/ETF price history, benchmark history, volume/liquidity, macro/catalyst news, earnings revisions, valuation, and fund-flow proxies where available.
- Fixtures for US sector ETF set, missing sector coverage, and budget-limited data collection.

## Immediate SOP Actions

1. Change all four `qveris.skill.json` statuses from `published` to `preview` or `draft` until scripts, tests, and traces exist.
2. Add `references/qveris-tool-map.md` for each skill.
3. Run QVeris Discover / Inspect preflight for each skill's tool map before any paid Call.
4. Decide the deterministic runner contracts for all four skills.
5. Only after tool-map validation, build scripts, fixtures, tests, examples, and artifacts.

## User Decisions Needed

- Confirm whether status should be `draft` or `preview` during productization.
- Confirm QVeris API key availability for Discover / Inspect.
- Confirm initial smoke-test budget and sample inputs for each skill.
