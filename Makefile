COMPOSE := docker compose -f dev-infra/stock-copilot-pro/docker-compose.yml
PYTHON ?= python3
NODE ?= node

.PHONY: up down check smoke shell rebuild logs up-full openclaw-logs test-unit test-e2e test-openclaw run-finance-live-e2e validate-qveris-sanitizer validate-finance-business-adapters validate-finance-contract-self-tests validate-finance-shared-contract validate-finance-reports validate-finance-fixtures

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

validate-finance-reports: validate-finance-fixtures validate-finance-contract-self-tests validate-qveris-sanitizer validate-finance-business-adapters
	$(PYTHON) scripts/validate_qveris_finance_report.py \
		qveris-anthropic-financial-services/examples/default-markdown-report.md \
		qveris-anthropic-financial-services/examples/natural-language-test-output-2026-07-07.md \
		qveris-finance-skills/examples/default-markdown-report.md \
		qveris-finance-skills/examples/natural-language-test-output-2026-07-07.md \
		qveris-tradermonty-trading-skills/examples/default-markdown-report.md \
		qveris-tradermonty-trading-skills/examples/natural-language-test-output-2026-07-07.md \
		qveris-a-stock-data-layer/examples/default-markdown-report.md \
		qveris-a-stock-data-layer/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-stock-data-layer/examples/historical/2026-07-08-natural-language.md \
		qveris-a-stock-data-layer/examples/historical/2026-07-08-codex-clean.md \
		qveris-a-stock-data-layer/examples/historical/2026-07-08-codex-fresh.md \
		qveris-a-share-factor-screen/examples/default-markdown-report.md \
		qveris-a-share-factor-screen/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-share-factor-screen/examples/historical/2026-07-08-natural-language.md \
		qveris-a-share-factor-screen/examples/historical/2026-07-08-codex-clean.md \
		qveris-a-share-factor-screen/examples/historical/2026-07-08-codex-fresh.md \
		qveris-a-share-data/examples/default-markdown-report.md \
		qveris-a-share-data/examples/natural-language-test-output-2026-07-08.md \
		qveris-a-share-data/examples/historical/2026-07-08-natural-language.md \
		qveris-a-share-data/examples/historical/2026-07-08-codex-clean.md \
		qveris-a-share-data/examples/historical/2026-07-08-codex-fresh.md \
		qveris-alphaear-market-intelligence/examples/default-markdown-report.md \
		qveris-alphaear-market-intelligence/examples/natural-language-test-output-2026-07-09.md \
		qveris-alphaear-market-intelligence/examples/historical/2026-07-09-codex-fresh.md \
		qveris-daymade-financial-data-suite/examples/default-markdown-report.md \
		qveris-daymade-financial-data-suite/examples/natural-language-test-output-2026-07-09.md \
		qveris-daymade-financial-data-suite/examples/historical/2026-07-09-codex-fresh.md \
		qveris-uzi-equity-research/examples/default-markdown-report.md \
		qveris-uzi-equity-research/examples/natural-language-test-output-2026-07-09.md \
		qveris-uzi-equity-research/examples/historical/2026-07-09-codex-fresh.md \
		qveris-a-share-factor-screen/examples/live-e2e-output-2026-07-13.md \
		qveris-a-stock-data-layer/examples/live-e2e-output-2026-07-13.md \
		qveris-a-share-data/examples/live-e2e-output-2026-07-13.md \
		qveris-alphaear-market-intelligence/examples/live-e2e-output-2026-07-13.md \
		qveris-daymade-financial-data-suite/examples/live-e2e-output-2026-07-13.md \
		qveris-uzi-equity-research/examples/live-e2e-output-2026-07-13.md

run-finance-live-e2e:
	$(NODE) scripts/run_qveris_finance_live_e2e.mjs

validate-qveris-sanitizer:
	$(NODE) --test qveris-official/tests/*.test.mjs

validate-finance-business-adapters:
	$(NODE) --test \
		qveris-a-stock-data-layer/tests/qveris_finance_adapter.test.mjs \
		qveris-a-stock-data-layer/tests/business_adapter_copies.test.mjs \
		qveris-a-share-factor-screen/tests/factor_screen_validity.test.mjs \
		qveris-a-share-data/tests/web_news_fallback_contract.test.mjs \
		qveris-a-share-data/tests/web_news_policy_copies.test.mjs \
		qveris-a-share-data/tests/workflow_semantic_guards.test.mjs

validate-finance-contract-self-tests:
	$(PYTHON) scripts/validate_qveris_finance_fixtures.py --self-test
	$(PYTHON) scripts/validate_qveris_finance_report.py --self-test

validate-finance-shared-contract:
	$(PYTHON) scripts/validate_qveris_shared_contract.py

validate-finance-fixtures: validate-finance-shared-contract
	$(PYTHON) scripts/validate_qveris_finance_fixtures.py \
		qveris-anthropic-financial-services \
		qveris-finance-skills \
		qveris-tradermonty-trading-skills \
		qveris-a-stock-data-layer \
		qveris-a-share-factor-screen \
		qveris-a-share-data \
		qveris-alphaear-market-intelligence \
		qveris-daymade-financial-data-suite \
		qveris-uzi-equity-research
