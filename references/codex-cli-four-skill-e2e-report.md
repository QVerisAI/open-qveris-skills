# WSL Codex CLI Four-Skill E2E Report

Date: 2026-07-03

Branch: `codex/qveris-supply-chain-research`

Purpose: validate the four QVeris finance skills through WSL `codex exec` as the caller, with one isolated Codex home per skill. This test intentionally does not use Skill Hub. Each Codex home installed only one target skill under `CODEX_HOME/skills`.

## Setup

Codex CLI:

- Binary: `/home/wjh/.local/opt/node-v24.15.0-linux-x64/bin/codex`
- Version: `codex-cli 0.130.0`
- Model used: `gpt-5.5`
- Workdir: `/home/wjh/matecode/open-qveris-skills-qveris-research`
- QVeris mode: live, not dry-run and not fixture

Isolated Codex homes:

- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-news-sentiment-radar`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-portfolio-risk-monitor`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-quant-factor-screen`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-sector-rotation-map`

Each home copied existing Codex auth and installed exactly one skill directory.

## Results

| Skill | Status | Paid calls | Credits | Generated files |
| --- | --- | ---: | ---: | --- |
| `qveris-news-sentiment-radar` | Passed with missing data notes | 4 | 6.81 | `artifacts/codex-cli-live.md`, `artifacts/codex-cli-live-output.json`, `artifacts/codex-cli-live-trace.json` |
| `qveris-portfolio-risk-monitor` | Passed with missing data notes | 3 | 49.4 | `artifacts/codex-cli-live.md`, `artifacts/codex-cli-live-output.json`, `artifacts/codex-cli-live-trace.json` |
| `qveris-quant-factor-screen` | Passed with preview-output limitations | 4 | 51.4 | `artifacts/codex-cli-live.md`, `artifacts/codex-cli-live-output.json`, `artifacts/codex-cli-live-trace.json` |
| `qveris-sector-rotation-map` | Passed with preview-output limitations | 3 | 72.6 | `artifacts/codex-cli-live.md`, `artifacts/codex-cli-live-output.json`, `artifacts/codex-cli-live-trace.json` |

All four `codex-cli-live-output.json` files validate against their skill-specific `schemas/output.schema.json`.

## Execution IDs

### qveris-news-sentiment-radar

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `market_news_sentiment` | yes | 2 | `fe656bd3-5e73-42d0-922a-9d0498e7dd1c` |
| `aggregate_sentiment` | yes | 2.81 | `f4321b89-8b22-42d0-b4f9-ea36db694f80` |
| `filings_check` | no | 1 | `5ff86d84-869a-45d2-afd7-8548331126f2` |
| `price_reaction` | no | 1 | `13cc8685-c772-4eb8-9405-7862a5b72576` |

Missing data:

- `filings_check`: no returned records or provider returned unsuccessful status.
- `price_reaction`: no returned records or provider returned unsuccessful status.

### qveris-portfolio-risk-monitor

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `quote_snapshot` | no | 1 | `47d85aeb-230f-4618-82a4-c7efbaf54fd0` |
| `historical_prices` | yes | 24.2 | `3ce118f8-cd6d-48f2-b0d6-5c16d9290023` |
| `profile_sector` | yes | 24.2 | `7771d7a5-3a9c-4804-a887-d15fa91242d4` |

Missing data:

- `quote_snapshot`: provider returned unsuccessful status.
- `news_catalyst`: skipped because no inspected tool candidate was available.

### qveris-quant-factor-screen

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `valuation_ratios` | yes | 24.2 | `f97575ad-d0c8-4127-9c78-6d344ba82dc5` |
| `liquidity_float` | yes | 24.2 | `1e23402a-8938-4cc0-86c6-87086729e9e1` |
| `quote_snapshot` | no | 1 | `86895d55-09f9-4ff5-9029-968c83ce2ed6` |
| `momentum_or_volatility` | yes | 2 | `c23225cc-a30a-40dd-be19-75c22f7d386c` |

Missing data and preview limitations:

- `quote_snapshot`: provider returned unsuccessful status.
- Output marks `ranking_ready: false`.
- Missing outputs: normalized scores, ranking table, factor weights, tie-break rules.
- Current runner validates the pipeline on the first ticker in the universe rather than fetching a full five-ticker factor panel.

### qveris-sector-rotation-map

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `sector_performance_snapshot` | yes | 24.2 | `5701f6fb-8279-4bc8-a1e6-75b8a04104a8` |
| `available_sectors` | yes | 24.2 | `c7ac9d90-288c-4829-9753-0a949e9add7f` |
| `etf_symbol_search` | yes | 24.2 | `cb738819-7bd7-4a03-96af-1b7df814de66` |

Missing data and preview limitations:

- `etf_performance`: skipped because no inspected tool candidate was available.
- Missing outputs: relative strength scores, momentum scores, rotation quadrants.

## Validation Commands

Schema validation command:

```bash
cd /home/wjh/matecode/open-qveris-skills-qveris-research
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import { validateSchema } from './qveris-finance-common/schema-validator.mjs';
for (const skill of ['qveris-news-sentiment-radar','qveris-portfolio-risk-monitor','qveris-quant-factor-screen','qveris-sector-rotation-map']) {
  const schema = JSON.parse(readFileSync(`${skill}/schemas/output.schema.json`, 'utf8'));
  const output = JSON.parse(readFileSync(`${skill}/artifacts/codex-cli-live-output.json`, 'utf8'));
  const errors = validateSchema(schema, output);
  if (errors.length) throw new Error(`${skill}: ${errors.join('; ')}`);
  console.log(`${skill}: schema ok`);
}
NODE
```

Result:

```text
qveris-news-sentiment-radar: schema ok
qveris-portfolio-risk-monitor: schema ok
qveris-quant-factor-screen: schema ok
qveris-sector-rotation-map: schema ok
```

## Conclusion

The WSL Codex CLI E2E pass is complete for all four skills. These validations prove that Codex can load each installed skill in isolation, follow the skill workflow, execute live QVeris calls, and produce Markdown, business JSON, and trace artifacts.

The skills should still remain `preview` because the live runs surfaced provider coverage gaps and because the deeper product outputs for quant ranking, sector rotation quadrants, and portfolio risk metrics remain incomplete.
