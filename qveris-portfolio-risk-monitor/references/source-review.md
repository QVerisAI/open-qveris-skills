# GitHub Source Review

Review date: 2026-07-02

Purpose: evaluate public GitHub projects that can inform the product shape, risk measures, data needs, and tests for `qveris-portfolio-risk-monitor`. This review is for methodology and architecture only. Do not copy repository prose, prompts, code, images, or branding into this skill.

## Search Strategy

- Queries used: `portfolio risk stock finance language:Python stars:>50`, plus existing quant/finance-agent references already listed in `methodology.md`.
- Selection filters: permissive license, recent activity, portfolio/risk relevance, testability, and a feasible path to replace direct data providers with QVeris tools.

## Candidate Review

| Repository | Stars | License | Recent activity | Quality signals | Useful patterns | QVeris adaptation | Decision |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | 60,737 | MIT | Pushed 2026-06-30 | Has tests, pyproject.toml | Multi-lens investment agents, risk manager, portfolio manager, sentiment/fundamental/technical lenses | Use as inspiration for separating risk lenses and final risk synthesis; QVeris supplies all data and trace | Primary reference |
| [microsoft/qlib](https://github.com/microsoft/qlib) | 45,512 | MIT | Pushed 2026-04-22 | Has tests, pyproject.toml, setup.py, examples | Quant pipeline, risk modeling, data normalization, experiment/evaluation structure | Adapt pipeline discipline and fixture strategy; do not import qlib data stack | Primary reference |
| [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL) | 15,576 | MIT | Pushed 2026-05-25 | pyproject.toml, setup.py, examples | Train-test-trade workflow, market environment, risk controls, drawdown and portfolio evaluation patterns | Use for risk-control vocabulary and scenario tests; replace market environment with QVeris snapshots | Secondary reference |
| [AlainDaccache/Quantropy](https://github.com/AlainDaccache/Quantropy) | 182 | MIT | Pushed 2024-08-20 | Has tests, pyproject.toml, setup.py | Risk factor modeling, stock screening, portfolio optimization, data pipeline shape | Useful for deterministic module boundaries and portfolio metrics fixtures | Secondary reference |
| [MBKraus/Python_Portfolio__VaR_Tool](https://github.com/MBKraus/Python_Portfolio__VaR_Tool) | 124 | No license found | Pushed 2021-02-17 | GUI-oriented VaR tool | VaR concept only | Not usable because license is unclear; can mention VaR concept without borrowing implementation | Exclude |

## Implementation Implications

- The first deterministic runner should accept holdings with weights or quantities, market, benchmark, lookback window, max paid calls, max credits, output path, and trace path.
- QVeris tool map should prioritize quotes/history, fundamentals, sector/industry classification, news/catalysts, liquidity/volume, and benchmark data.
- Core deterministic outputs should include concentration, sector exposure, drawdown, volatility, beta/proxy beta, liquidity warning, news/catalyst risk, and missing-data flags.
- Fixtures should cover diversified portfolio, concentrated portfolio, and budget-limited or incomplete-data portfolio.

## License And Use Boundaries

- MIT repositories are acceptable as inspiration, but this skill should remain a clean-room QVeris-native implementation.
- Do not import trading-agent prompts, portfolio code, backtest engines, or third-party data integrations.
- Outputs must avoid investment advice and must distinguish observed facts from risk interpretation.
