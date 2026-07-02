# GitHub Source Review

Review date: 2026-07-02

Purpose: evaluate public GitHub projects that can inform the product shape, data needs, and test fixtures for `qveris-news-sentiment-radar`. This review is for methodology and architecture only. Do not copy repository prose, prompts, code, images, model weights, or branding into this skill.

## Search Strategy

- Queries used: `financial news sentiment stock analysis language:Python stars:>50`, plus existing finance-agent references already listed in `methodology.md`.
- Selection filters: permissive license, recent activity, clear relevance to financial news or market-event analysis, reusable evaluation patterns, and data access that can be replaced by QVeris Discover / Inspect / Call.

## Candidate Review

| Repository | Stars | License | Recent activity | Quality signals | Useful patterns | QVeris adaptation | Decision |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| [AI4Finance-Foundation/FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) | 20,766 | MIT | Pushed 2026-06-01 | Has tests, setup.py, requirements.txt | Financial news sentiment, retrieval-augmented financial text workflows, market-event text classification | Replace model/data dependencies with QVeris news, filings, social, and price-reaction tools; use only task taxonomy and evidence workflow ideas | Primary reference |
| [AI4Finance-Foundation/FinRobot](https://github.com/AI4Finance-Foundation/FinRobot) | 7,447 | Apache-2.0 | Pushed 2026-05-10 | setup.py, requirements.txt | Multi-agent financial report workflow, analyst-style evidence gathering, risk and catalyst synthesis | Use as inspiration for section structure and evidence ranking; QVeris supplies all data and trace | Primary reference |
| [cooragent/ClarityFinance](https://github.com/cooragent/ClarityFinance) | 59 | Apache-2.0 | Pushed 2026-01-27 | pyproject.toml, requirements.txt | Claude-skill style planning, persistent research artifacts, multi-market financial analysis | Adapt the planning-with-files pattern into fixtures, trace JSON, and report artifacts | Secondary reference |
| [gyanesh-m/Sentiment-analysis-of-financial-news-data](https://github.com/gyanesh-m/Sentiment-analysis-of-financial-news-data) | 133 | MIT | Pushed 2023-05-22 | requirements.txt | Simple financial-news sentiment example and expected input/output shape | May inform a minimal fixture for headline-level sentiment, but not a production data path | Low-priority reference |
| [BangaloreSharks/SharkStock](https://github.com/BangaloreSharks/SharkStock) | 70 | No license found | Pushed 2017-04-27 | Old project | News sentiment plus trading-action framing | Not usable because license is unclear and project is stale | Exclude |
| [rohanag/StockMarketSentimentAnalysis](https://github.com/rohanag/StockMarketSentimentAnalysis) | 64 | No license found | Pushed 2013-07-17 | Old project | Twitter/news sentiment concept | Not usable because license is unclear and project is stale | Exclude |

## Implementation Implications

- The first deterministic runner should accept ticker, market, time window, source mix, max paid calls, max credits, output path, and trace path.
- QVeris tool map should prioritize news search, filings/events, social sentiment, market quote/history, and optional transcript/newswire tools.
- Core deterministic outputs should include source recency, source type, sentiment polarity, event category, confidence, price-reaction evidence, dissenting evidence, and missing-data flags.
- Fixtures should cover normal catalyst detection, noisy attention with weak price reaction, and missing or budget-limited data.

## License And Use Boundaries

- MIT and Apache-2.0 repositories are acceptable as inspiration, but this skill should remain a clean-room QVeris-native implementation.
- Do not import FinGPT models, FinRobot prompts, ClarityFinance skill text, or notebook code.
- All live facts must come from QVeris calls or explicitly saved fixtures; no model-memory market facts.
