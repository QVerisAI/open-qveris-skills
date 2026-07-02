# GitHub Source Review

Review date: 2026-07-02

Purpose: evaluate public GitHub projects that can inform sector-rotation signals, report shape, data needs, and tests for `qveris-sector-rotation-map`. This review is for methodology and architecture only. Do not copy repository prose, prompts, code, images, or branding into this skill.

## Search Strategy

- Queries used: `sector rotation trading strategy language:Python`, `sector rotation etf strategy language:Python`, `sector momentum etf rotation language:Python`, `relative strength sector rotation language:Python`, and existing finance-agent references already listed in `methodology.md`.
- Selection filters: permissive license, recent activity, sector/ETF rotation relevance, reproducible structure, and a feasible path to replace direct market-data providers with QVeris tools.

## Candidate Review

| Repository | Stars | License | Recent activity | Quality signals | Useful patterns | QVeris adaptation | Decision |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| [microsoft/qlib](https://github.com/microsoft/qlib) | 45,512 | MIT | Pushed 2026-04-22 | Has tests, pyproject.toml, setup.py, examples | Quant pipeline, factor modeling, backtest discipline, ranking/evaluation structure | Use pipeline discipline and factor normalization concepts; QVeris supplies sector/ETF data | Primary reference |
| [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | 60,737 | MIT | Pushed 2026-06-30 | Has tests, pyproject.toml | Multi-lens market analysis, technical/fundamental/sentiment/risk synthesis | Use as inspiration for combining rotation evidence into a narrative risk-aware view | Primary reference |
| [zubair-trabzada/ai-trading-claude](https://github.com/zubair-trabzada/ai-trading-claude) | 179 | MIT | Pushed 2026-04-07 | requirements.txt, skills directory | Claude Code finance research engine with sector rotation and portfolio-analysis workflows | Useful for agent-facing UX and report organization; do not copy skills text | Secondary reference |
| [garroshub/Quant_Sector_Rotation_Strategy](https://github.com/garroshub/Quant_Sector_Rotation_Strategy) | 11 | MIT | Pushed 2026-07-01 | requirements.txt, app.py | ETF sector rotation using momentum and volatility signals | Useful as a low-priority specialist reference for simple sector ETF signal composition | Secondary reference |
| [brianbeals/sector-rotation-screener](https://github.com/brianbeals/sector-rotation-screener) | 0 | MIT | Pushed 2026-06-28 | Has tests, pytest.ini, requirements.txt | 11-sector ETF screener, seasonality/economic-cycle fit, relative strength, backtest framing | Useful for test and output-shape ideas despite low adoption | Low-priority reference |
| [AdroitAnandAI/RRG-Sector-Rotation-India](https://github.com/AdroitAnandAI/RRG-Sector-Rotation-India) | 19 | No license found | Pushed 2026-03-15 | Relative rotation graph concept | RS-Ratio and RS-Momentum concept for Indian sectors | Not usable because license is unclear; can use public RRG-style vocabulary only if independently implemented | Exclude |

## Implementation Implications

- The first deterministic runner should accept market, sector ETF or sector proxy list, benchmark, lookback windows, max paid calls, max credits, output path, and trace path.
- QVeris tool map should prioritize ETF/sector price history, benchmark history, volume/liquidity, sector fundamentals or earnings revisions if available, macro/catalyst news, and fund-flow proxies where available.
- Initial deterministic signals should be momentum, relative strength vs benchmark, volatility, drawdown, liquidity, valuation/revision/catalyst notes when data exists, and missing-data flags.
- Outputs should include a sector ranking table, rotation quadrant or phase labels, evidence strength, dissenting signals, and trace summary.
- Fixtures should cover normal US sector ETF set, missing sector/fundamental coverage, and budget-limited data collection.

## License And Use Boundaries

- MIT repositories are acceptable as inspiration, but this skill should remain a clean-room QVeris-native implementation.
- Do not import sector strategy code, UI assets, prompts, or vendor-specific integrations.
- Rotation labels are research signals, not trading instructions or investment advice.
