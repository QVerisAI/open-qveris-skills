# GitHub Source Review Call Report

Report date: 2026-07-02

Scope: source review for:

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

This report records GitHub metadata/search calls used for source review. It is not a QVeris Discover / Inspect / Call trace. No QVeris paid calls were executed in this step.

## Repository Metadata Calls

Endpoint pattern:

- `GET https://api.github.com/repos/{owner}/{repo}`
- `GET https://api.github.com/repos/{owner}/{repo}/contents?ref={default_branch}`

| Repository | Stars | License | Latest pushed | Root quality signals | Decision |
| --- | ---: | --- | --- | --- | --- |
| `AI4Finance-Foundation/FinGPT` | 20,766 | MIT | 2026-06-01 | `tests`, `setup.py`, `requirements.txt`, `README.md` | Primary reference for news sentiment / financial text workflow |
| `AI4Finance-Foundation/FinRobot` | 7,447 | Apache-2.0 | 2026-05-10 | `setup.py`, `requirements.txt`, `README.md` | Primary/secondary reference for financial report workflow |
| `cooragent/ClarityFinance` | 59 | Apache-2.0 | 2026-01-27 | `pyproject.toml`, `requirements.txt`, `README.md` | Secondary reference for skill-style planning and artifacts |
| `virattt/ai-hedge-fund` | 60,737 | MIT | 2026-06-30 | `tests`, `pyproject.toml`, `README.md` | Primary reference for portfolio/risk multi-lens workflow |
| `AI4Finance-Foundation/FinRL` | 15,576 | MIT | 2026-05-25 | `pyproject.toml`, `setup.py`, `requirements.txt`, `examples`, `README.md` | Secondary reference for risk/evaluation workflow |
| `microsoft/qlib` | 45,512 | MIT | 2026-04-22 | `tests`, `pyproject.toml`, `setup.py`, `examples`, `README.md` | Primary reference for quant pipeline and factor workflow |
| `AlainDaccache/Quantropy` | 182 | MIT | 2024-08-20 | `tests`, `pyproject.toml`, `setup.py`, `requirements.txt`, `README.md` | Secondary reference for factor/risk modules |
| `gyanesh-m/Sentiment-analysis-of-financial-news-data` | 133 | MIT | 2023-05-22 | `requirements.txt`, `README.md` | Low-priority reference for minimal sentiment fixture shape |
| `zubair-trabzada/ai-trading-claude` | 179 | MIT | 2026-04-07 | `requirements.txt`, `README.md`, `skills` | Secondary reference for finance agent UX/report structure |
| `garroshub/Quant_Sector_Rotation_Strategy` | 11 | MIT | 2026-07-01 | `requirements.txt`, `README.md`, `app.py` | Low-priority specialist reference for sector rotation signals |
| `brianbeals/sector-rotation-screener` | 0 | MIT | 2026-06-28 | `tests`, `pytest.ini`, `requirements.txt`, `README.md` | Low-priority reference for sector ETF tests/output shape |

## GitHub Search Calls

Endpoint pattern:

- `GET https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page={n}`

| Skill area | Query | Useful results | Excluded results |
| --- | --- | --- | --- |
| News sentiment | `financial news sentiment stock analysis language:Python stars:>50` | `gyanesh-m/Sentiment-analysis-of-financial-news-data` | `BangaloreSharks/SharkStock` and `rohanag/StockMarketSentimentAnalysis` because license is missing and projects are stale |
| Portfolio risk | `portfolio risk stock finance language:Python stars:>50` | `AlainDaccache/Quantropy` | `MBKraus/Python_Portfolio__VaR_Tool` because license is missing |
| Quant factor screen | `quant factor stock screening language:Python stars:>50` | `AlainDaccache/Quantropy` | No stronger specialist repo found than `qlib` / `FinRL` / `Quantropy` |
| Sector rotation | `sector rotation trading strategy language:Python` | `zubair-trabzada/ai-trading-claude`, `garroshub/Quant_Sector_Rotation_Strategy` | No-license or very low-signal repos excluded |
| Sector rotation | `sector rotation etf strategy language:Python` | `garroshub/Quant_Sector_Rotation_Strategy` | No-license classroom/demo repos excluded |
| Sector rotation | `sector momentum etf rotation language:Python` | `garroshub/Quant_Sector_Rotation_Strategy` | No-license low-signal repos excluded |
| Sector rotation | `relative strength sector rotation language:Python` | `brianbeals/sector-rotation-screener` | `AdroitAnandAI/RRG-Sector-Rotation-India` because license is missing |

## Reference Decisions By Skill

### qveris-news-sentiment-radar

Use as references:

- `FinGPT`: financial text and sentiment workflow taxonomy.
- `FinRobot`: evidence-backed analyst report structure.
- `ClarityFinance`: skill-style planning and artifact pattern.
- `Sentiment-analysis-of-financial-news-data`: low-priority fixture-shape reference.

Exclude:

- Old/no-license sentiment projects.

### qveris-portfolio-risk-monitor

Use as references:

- `ai-hedge-fund`: multi-lens risk workflow.
- `qlib`: quant pipeline and test discipline.
- `FinRL`: risk-control and evaluation framing.
- `Quantropy`: factor/risk module boundaries.

Exclude:

- No-license VaR GUI project.

### qveris-quant-factor-screen

Use as references:

- `qlib`: primary factor pipeline reference.
- `FinRL`: evaluation/risk caveat reference.
- `Quantropy`: stock screening and factor module reference.
- `ClarityFinance`: report/artifact organization reference.

### qveris-sector-rotation-map

Use as references:

- `qlib`: ranking and factor normalization discipline.
- `ai-hedge-fund`: multi-lens market synthesis.
- `ai-trading-claude`: agent-facing sector rotation UX.
- `Quant_Sector_Rotation_Strategy`: low-priority sector ETF momentum/volatility idea.
- `sector-rotation-screener`: low-priority test/output-shape idea.

Exclude:

- No-license RRG/relative-rotation repos except as public concept vocabulary.

## Important Boundary

These repositories are only used for product and methodology inspiration. The implementation should be clean-room and QVeris-native:

- no copied code
- no copied prompts or README text
- no imported model weights or datasets
- no vendor-specific direct integrations
- all live facts must come from QVeris calls or saved fixtures
