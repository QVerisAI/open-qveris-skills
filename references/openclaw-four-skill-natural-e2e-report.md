# OpenClaw Four-Skill Natural-Language E2E Report

Date: 2026-07-03

Branch: `codex/qveris-supply-chain-research`

Purpose: validate the four QVeris finance skills through the OpenClaw CLI natural-language agent path, with real QVeris live calls and saved artifacts.

## OpenClaw CLI Used

The `openclaw` on PATH is not the platform CLI. It is a wrapper for the OpenClaw game runtime:

- PATH wrapper: `/home/wjh/.local/bin/openclaw`
- Wrapper target: `/home/wjh/OpenClaw/Build_Release/openclaw`
- Not used for this validation.

The platform CLI used for this test was:

- `/home/wjh/matecode/QVerisAI-openclaw/node_modules/.bin/openclaw`
- Version: `OpenClaw 2026.5.28 (e932160)`

## Local OpenClaw Runtime Setup

The local OpenClaw checkout initially had missing workspace links for internal packages such as:

- `@openclaw/normalization-core`
- `@openclaw/model-catalog-core`
- `@openclaw/media-core`
- `@openclaw/acp-core`
- `@openclaw/net-policy`
- `@openclaw/llm-core`

To make the CLI runnable, the workspace was repaired locally:

- Ran `pnpm install --frozen-lockfile` in `/home/wjh/matecode/QVerisAI-openclaw`.
- Built the missing internal packages where needed.
- Linked all `packages/*` packages named `@openclaw/*` into `node_modules/@openclaw`.

This repair was for the OpenClaw checkout only; it did not modify the four QVeris skill source files.

## Profile And Model

OpenClaw profile:

- `qveris-skill-e2e-20260703`

Workspace:

- `/home/wjh/matecode/open-qveris-skills-qveris-research`

Agent:

- `main`

Model provider:

- `deepseek/deepseek-chat`

Auth:

- `DEEPSEEK_API_KEY` was present in WSL and stored into the isolated OpenClaw profile auth store.
- `QVERIS_API_KEY` was present in WSL and inherited by OpenClaw agent tool execution.

## Skill Install

Each skill was installed from the local repo with `openclaw skills install`:

```bash
cd /home/wjh/matecode/QVerisAI-openclaw

./node_modules/.bin/openclaw --profile qveris-skill-e2e-20260703 \
  skills install /home/wjh/matecode/open-qveris-skills-qveris-research/qveris-news-sentiment-radar \
  --as qveris-news-sentiment-radar --agent main --force

./node_modules/.bin/openclaw --profile qveris-skill-e2e-20260703 \
  skills install /home/wjh/matecode/open-qveris-skills-qveris-research/qveris-portfolio-risk-monitor \
  --as qveris-portfolio-risk-monitor --agent main --force

./node_modules/.bin/openclaw --profile qveris-skill-e2e-20260703 \
  skills install /home/wjh/matecode/open-qveris-skills-qveris-research/qveris-quant-factor-screen \
  --as qveris-quant-factor-screen --agent main --force

./node_modules/.bin/openclaw --profile qveris-skill-e2e-20260703 \
  skills install /home/wjh/matecode/open-qveris-skills-qveris-research/qveris-sector-rotation-map \
  --as qveris-sector-rotation-map --agent main --force
```

`openclaw skills list --agent main` showed all four as ready:

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

OpenClaw created workspace-installed copies under:

- `/home/wjh/matecode/open-qveris-skills-qveris-research/skills/`

Those files are local install artifacts, not source changes to the original four skill directories.

## Natural-Language Agent Runs

Each test used `openclaw agent --local` with a natural-language prompt naming the installed skill, requiring real QVeris live data, and asking the agent to save report, business JSON, trace JSON, and final validation summary.

Artifact prefix for each skill:

- `artifacts/openclaw-natural-e2e-20260703.*`

## Result Summary

| Skill | Scenario | Paid calls | Credits | Schema | Trace execution IDs | Main result |
| --- | --- | ---: | ---: | --- | --- | --- |
| `qveris-news-sentiment-radar` | NVDA US, 7-day news/sentiment/catalyst radar | 6 | 33.82 | pass | 6/6 present | `catalyst_status=needs_confirmation`; missing filing/issuer confirmation |
| `qveris-portfolio-risk-monitor` | AAPL/NVDA/MSFT/TSLA/CASH portfolio vs SPY, 30 days | 5 | 78.22 | pass | 5/5 present | volatility, drawdown, VaR, and benchmark correlation populated |
| `qveris-quant-factor-screen` | AAPL/MSFT, 90-day valuation/quality/liquidity/momentum/news-risk screen | 10 | 153.20 | pass | 10/10 present | `ranking_ready=true`, `coverage_level=complete` |
| `qveris-sector-rotation-map` | XLK/XLE vs SPY, 30-day sector rotation | 7 | 147.20 | pass | 7/7 present | `phase_labels_ready=true`, rotation quadrants and relative-strength scores populated |
| **Total** | Four OpenClaw natural-language live runs | **28** | **412.44** | all pass | all present | all four completed |

## Execution IDs

### qveris-news-sentiment-radar

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `market_news_sentiment` | yes | 2 | `2b6c4faf-77a5-4bdf-aa70-aeffe435e440` |
| `aggregate_sentiment` | yes | 2.81 | `f7bf2b69-7660-4c0d-8561-6c0700b87634` |
| `filings_check` | no | 1 | `f26dff0f-62d2-49e0-afcb-7d18ccf0b250` |
| `filings_check` fallback | no | 1 | `987eb30e-281f-4efc-a9c8-6d8aa3f01af0` |
| `price_reaction` | yes | 2.81 | `2147d444-3593-4932-bea4-2fafffe4d281` |
| `issuer_confirmation` | no | 24.2 | `ca140d40-6de4-4fa4-81a8-92ad9f029247` |

### qveris-portfolio-risk-monitor

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `quote_snapshot` | yes | 2.81 | `a53bee6d-08ec-405f-9e91-a2c17c5e263c` |
| `historical_prices` top holding | yes | 24.2 | `62a14c89-78f8-43d6-b140-f17ce08bc0eb` |
| `historical_prices` benchmark | yes | 24.2 | `5e095d59-55f1-48d7-b569-8a88fc75cd59` |
| `profile_sector` | yes | 24.2 | `1f28d12f-ba0b-4383-9240-71fe9308658c` |
| `news_catalyst` | yes | 2.81 | `a4f51144-eb12-4990-bf4a-b2d79dfea5f7` |

### qveris-quant-factor-screen

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `valuation_ratios` AAPL | yes | 24.2 | `9b00db7d-eab6-4faa-8177-12d552c4dc95` |
| `valuation_ratios` MSFT | yes | 24.2 | `2c872255-c011-4db9-9d14-1fa8adbf7204` |
| `quality_overview` AAPL | yes | 2 | `d083a4d2-b044-4598-97fd-63d54d221dbb` |
| `quality_overview` MSFT | yes | 2 | `72762cde-d52f-49d0-9ef0-118092e73a57` |
| `liquidity_float` AAPL | yes | 24.2 | `f6bd8573-5655-412c-b6cc-3ff48066dcb5` |
| `liquidity_float` MSFT | yes | 24.2 | `7fd25b1b-b488-49e7-a4ea-dc5c563ca9a1` |
| `price_momentum` AAPL | yes | 24.2 | `56c0168b-0648-40de-b9ae-896716f135c5` |
| `price_momentum` MSFT | yes | 24.2 | `3b9f0b3f-de6f-4417-a139-2cb2d1cf0c52` |
| `news_risk` AAPL | yes | 2 | `1292bf6c-5566-484a-bb24-ad8f80fed7f7` |
| `news_risk` MSFT | yes | 2 | `82c1a388-f9e5-4346-874e-6303c8f3d258` |

### qveris-sector-rotation-map

| Role | OK | Cost | execution_id |
| --- | --- | ---: | --- |
| `sector_performance_snapshot` | yes | 24.2 | `73cc4411-5bd9-44ee-b33e-3c2ca2c5ad5e` |
| `available_sectors` | yes | 24.2 | `72896600-8809-40df-926b-6e798f85b840` |
| `proxy_price_history` XLK | yes | 24.2 | `36c16653-0521-4997-a4cc-09ed4450e55a` |
| `proxy_price_history` XLE | yes | 24.2 | `190c5953-b058-48f8-bb06-89ab1de2e285` |
| `benchmark_price_history` SPY | yes | 24.2 | `14d80866-ea03-4572-bbd0-caf26a7152db` |
| `flow_or_revision_confirmation` | yes | 2 | `61c8695b-551f-4a12-8e2c-d9980e1f8423` |
| `etf_symbol_search` | yes | 24.2 | `433fc475-504c-4583-bb94-a05c75f74cce` |

## Schema Validation

Validation command:

```bash
cd /home/wjh/matecode/open-qveris-skills-qveris-research
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import { validateSchema } from './qveris-finance-common/schema-validator.mjs';

for (const skill of [
  'qveris-news-sentiment-radar',
  'qveris-portfolio-risk-monitor',
  'qveris-quant-factor-screen',
  'qveris-sector-rotation-map'
]) {
  const schema = JSON.parse(readFileSync(`${skill}/schemas/output.schema.json`, 'utf8'));
  const output = JSON.parse(readFileSync(`${skill}/artifacts/openclaw-natural-e2e-20260703-output.json`, 'utf8'));
  const errors = validateSchema(schema, output);
  console.log(`${skill}: ${errors.length ? errors.join('; ') : 'schema ok'}`);
  if (errors.length) process.exitCode = 1;
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

## Known Limits

- This validates the OpenClaw CLI local agent path, not a hosted Skill Hub UI or ClawHub publication path.
- The OpenClaw local checkout required workspace dependency repair before the agent could run.
- The default `openclaw` command on PATH is still the game runtime wrapper, so future runs should call `/home/wjh/matecode/QVerisAI-openclaw/node_modules/.bin/openclaw` explicitly or fix PATH ordering.
- `qveris-news-sentiment-radar` still correctly reports `needs_confirmation` when filing or issuer confirmation providers do not return usable confirmation data.
- OpenClaw install created local workspace skill copies under `/home/wjh/matecode/open-qveris-skills-qveris-research/skills/`; these are install artifacts and are currently untracked.

## Conclusion

OpenClaw CLI install-and-run validation is complete for all four skills. Each skill was visible as ready in OpenClaw, invoked through a natural-language OpenClaw agent prompt, executed real QVeris live calls, generated Markdown, business JSON, trace JSON, and final validation text, and passed its output schema validation.
