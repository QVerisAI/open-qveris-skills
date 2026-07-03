# Four Skill SOP Completion Report

Report date: 2026-07-02

Branch: `codex/qveris-supply-chain-research`

Skills:

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

## SOP Checklist

| SOP item | Status | Evidence |
| --- | --- | --- |
| Current-state audit | Done | `references/four-skill-current-state-audit.md` |
| GitHub source review | Done | `*/references/source-review.md`, `references/github-source-review-call-report.md` |
| QVeris tool map | Done | `*/references/qveris-tool-map.md` |
| Deterministic runner | Done | `qveris-finance-common/runner.mjs`, `*/scripts/run.mjs` |
| QVeris adapter | Done | `qveris-finance-common/runner.mjs` handles Discover, Inspect, Execute, retries, budgets, reports, traces |
| Transform / analysis / render | Done | Per-skill `analyze` functions in `*/scripts/run.mjs`, shared Markdown rendering in `qveris-finance-common/runner.mjs` |
| Trace output | Done | `*/artifacts/dry-run-trace.json`, `*/artifacts/live-smoke-trace.json` |
| Business output schema | Done | `*/schemas/output.schema.json`, `*/artifacts/fixture-output.json`, `--json-output` |
| Fixtures | Done | `*/fixtures/*.json` |
| Tests | Done | `*/tests/runner.fixture.test.mjs` |
| Examples | Done | `*/examples/README.md` |
| Live QVeris smoke test | Done | `*/artifacts/live-smoke.md`, `*/artifacts/live-smoke-trace.json` |
| Codex E2E | Done | `*/artifacts/codex-e2e.md` |
| qveris.skill.json update | Done | Status set to `preview`; validation pointers added; platforms narrowed to `cli` until additional platform validation |
| OpenClaw E2E | Pending | Local `openclaw` command is not the Skill Hub platform CLI; blocker recorded in `references/openclaw-skillhub-e2e-check.md` |

## Test Commands

```bash
node --check qveris-finance-common/runner.mjs
node --check qveris-news-sentiment-radar/scripts/run.mjs
node --check qveris-portfolio-risk-monitor/scripts/run.mjs
node --check qveris-quant-factor-screen/scripts/run.mjs
node --check qveris-sector-rotation-map/scripts/run.mjs

node --test \
  qveris-news-sentiment-radar/tests/runner.fixture.test.mjs \
  qveris-portfolio-risk-monitor/tests/runner.fixture.test.mjs \
  qveris-quant-factor-screen/tests/runner.fixture.test.mjs \
  qveris-sector-rotation-map/tests/runner.fixture.test.mjs
```

## Live Smoke Summary

| Skill | Paid calls | Credits | Execution IDs | Notes |
| --- | ---: | ---: | --- | --- |
| `qveris-news-sentiment-radar` | 4 | 6.81 | `70d0672a-6a6d-4862-b00f-315b1aa76fad`, `4d8f4af4-f70f-48f5-808e-662db1033dad`, `0d4cc78f-0a92-40d6-8c48-602579e36110`, `c08314af-3d5a-48b9-8712-56510c189fe5` | Filing check returned unsuccessful and is kept as missing-data evidence. |
| `qveris-portfolio-risk-monitor` | 3 | 51.21 | `b961be79-5b4b-424e-8ddb-3324eaa904c7`, `220c6ea3-ee30-4310-8b6f-aa7342e75fb7`, `d606dca9-b277-4502-a10b-741df3a5b6c8` | News catalyst call skipped because strict preferred tool was not returned by preflight. |
| `qveris-quant-factor-screen` | 4 | 51.4 | `987a0b10-8660-4f6c-b1a9-c0a2f57b350e`, `5eb8e072-57d1-4f0a-aebe-ff3ee647e9f7`, `9ec94a39-5f8a-4fe1-99e5-17e1107c32b4`, `39378274-360d-40d3-acba-c0586317fdaa` | First runner samples the first ticker for expensive factor inputs. |
| `qveris-sector-rotation-map` | 3 | 72.6 | `03bb593c-c359-46f8-b782-55a8f8b641f0`, `6368bb54-97e5-4879-989d-0e21f09882e4`, `f83f4b3b-e4e5-4355-aba2-5e9841a7b332` | ETF performance call skipped because strict preferred tool was not returned by preflight. |

## Known Limitations

- These four skills are `preview`, not `published`, until OpenClaw and any other advertised platform validation is completed.
- Runners intentionally skip strict preferred calls when Discover / Inspect does not return the validated tool, instead of falling back to incompatible tools.
- Quant factor and portfolio runners currently sample a bounded subset for expensive calls; broad universe expansion should be staged under explicit budget approval.
