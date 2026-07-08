COMPOSE := docker compose -f dev-infra/stock-copilot-pro/docker-compose.yml
PYTHON ?= python3

.PHONY: up down check smoke shell rebuild logs up-full openclaw-logs test-unit test-e2e test-openclaw validate-finance-reports validate-finance-fixtures

up:
	$(COMPOSE) up -d skill-dev

down:
	$(COMPOSE) down

check:
	$(COMPOSE) exec skill-dev bash /workspace/dev-infra/base/check-runtime.sh

smoke:
	$(COMPOSE) exec skill-dev bash /workspace/dev-infra/stock-copilot-pro/smoke-test.sh

shell:
	$(COMPOSE) exec skill-dev bash

rebuild:
	$(COMPOSE) build --no-cache skill-dev

logs:
	$(COMPOSE) logs -f skill-dev

up-full:
	$(COMPOSE) --profile openclaw up -d skill-dev openclaw

openclaw-logs:
	$(COMPOSE) --profile openclaw logs -f openclaw

test-unit:
	$(COMPOSE) exec -w /workspace/stock-copilot-pro skill-dev \
		node --test tests/architecture-modules.test.mjs

test-e2e:
	$(COMPOSE) exec -w /workspace/stock-copilot-pro skill-dev \
		node --test \
		tests/watch.e2e.test.mjs \
		tests/analyze.e2e.test.mjs \
		tests/compare.e2e.test.mjs \
		tests/brief.e2e.test.mjs \
		tests/radar.e2e.test.mjs

test-openclaw:  ## OpenClaw 端到端测试（8 个 case，需要 openclaw 容器运行）
	$(COMPOSE) --profile openclaw exec openclaw \
		node /workspace/dev-infra/stock-copilot-pro/openclaw-e2e.mjs

validate-finance-reports: validate-finance-fixtures
	$(PYTHON) scripts/validate_qveris_finance_report.py \
		qveris-anthropic-financial-services/examples/default-markdown-report.md \
		qveris-anthropic-financial-services/examples/natural-language-test-output-2026-07-07.md \
		qveris-finance-skills/examples/default-markdown-report.md \
		qveris-finance-skills/examples/natural-language-test-output-2026-07-07.md \
		qveris-tradermonty-trading-skills/examples/default-markdown-report.md \
		qveris-tradermonty-trading-skills/examples/natural-language-test-output-2026-07-07.md \
		qveris-a-stock-data-layer/examples/default-markdown-report.md \
		qveris-a-stock-data-layer/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-stock-data-layer/examples/natural-language-live-output-2026-07-08.md \
		qveris-a-stock-data-layer/examples/codex-clean-e2e-output-2026-07-08.md \
		qveris-a-stock-data-layer/examples/codex-fresh-e2e-output-2026-07-08.md \
		qveris-a-share-factor-screen/examples/default-markdown-report.md \
		qveris-a-share-factor-screen/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-share-factor-screen/examples/natural-language-live-output-2026-07-08.md \
		qveris-a-share-factor-screen/examples/codex-clean-e2e-output-2026-07-08.md \
		qveris-a-share-factor-screen/examples/codex-fresh-e2e-output-2026-07-08.md \
		qveris-a-share-data/examples/default-markdown-report.md \
		qveris-a-share-data/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-share-data/examples/natural-language-live-output-2026-07-08.md \
		qveris-a-share-data/examples/codex-clean-e2e-output-2026-07-08.md \
		qveris-a-share-data/examples/codex-fresh-e2e-output-2026-07-08.md

validate-finance-fixtures:
	$(PYTHON) scripts/validate_qveris_finance_fixtures.py \
		qveris-anthropic-financial-services \
		qveris-finance-skills \
		qveris-tradermonty-trading-skills \
		qveris-a-stock-data-layer \
		qveris-a-share-factor-screen \
		qveris-a-share-data
