# GitHub Source Review

Review date: 2026-07-02

Purpose: evaluate public GitHub projects that can inform factor definitions, ranking logic, data needs, and tests for `qveris-quant-factor-screen`. This review is for methodology and architecture only. Do not copy repository prose, prompts, code, images, or branding into this skill.

## Search Strategy

- Queries used: `quant factor stock screening language:Python stars:>50`, plus existing quant-research references already listed in `methodology.md`.
- Selection filters: permissive license, recent activity, explicit factor or screening workflow, reproducible tests/examples, and a feasible path to replace direct data providers with QVeris tools.

## Candidate Review

| Repository | Stars | License | Recent activity | Quality signals | Useful patterns | QVeris adaptation | Decision |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| [microsoft/qlib](https://github.com/microsoft/qlib) | 45,512 | MIT | Pushed 2026-04-22 | Has tests, pyproject.toml, setup.py, examples | Quant research pipeline, alpha seeking, factor modeling, experiment tracking, backtest discipline | Use factor pipeline and evaluation structure as inspiration; QVeris provides data snapshots and evidence | Primary reference |
| [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL) | 15,576 | MIT | Pushed 2026-05-25 | pyproject.toml, setup.py, examples | Train-test-trade workflow, market environment, risk controls, evaluation patterns | Use for scenario structure and risk-aware screening caveats; avoid RL implementation | Secondary reference |
| [AlainDaccache/Quantropy](https://github.com/AlainDaccache/Quantropy) | 182 | MIT | Pushed 2024-08-20 | Has tests, pyproject.toml, setup.py | Stock screening, risk factor modeling, portfolio optimization, pipeline boundaries | Useful for deterministic factor modules and fixture construction | Secondary reference |
| [cooragent/ClarityFinance](https://github.com/cooragent/ClarityFinance) | 59 | Apache-2.0 | Pushed 2026-01-27 | pyproject.toml, requirements.txt | Skill-style planning, multi-market screening/dashboard patterns | Useful for agent-facing contract and report artifact organization | Secondary reference |

## Implementation Implications

- The first deterministic runner should accept universe, market, factor set, lookback window, weighting scheme, max paid calls, max credits, output path, and trace path.
- QVeris tool map should prioritize quote/history, fundamentals, valuation ratios, liquidity/volume, sector classification, earnings revisions where available, and news-risk tools.
- Initial deterministic factors should be conservative and explainable: momentum, volatility, liquidity, valuation, quality, and news-risk penalties.
- Ranking should expose raw values, normalized scores, missing fields, factor weights, and tie-break rules.
- Fixtures should cover a normal five-ticker universe, missing fundamental data, and budget-limited factor coverage.

## License And Use Boundaries

- MIT and Apache-2.0 repositories are acceptable as inspiration, but this skill should remain a clean-room QVeris-native implementation.
- Do not import qlib datasets, FinRL environments, Quantropy code, ClarityFinance prompts, or vendor integrations.
- The screen is a research aid, not a buy/sell recommendation.
