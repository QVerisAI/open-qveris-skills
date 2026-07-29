# Finance Skill Scan - 2026-07-06

## Scope

Large-pass scan for GitHub repositories that can be used directly or adapted at low cost into QVeris/Open Skills for financial workflows.

Method followed the attached screening document:

- Prefer engineering signals over generic "finance AI" keywords.
- Check for `SKILL.md`, runner/scripts, structured output, tests/fixtures/examples, license, and security/config posture.
- Prefer skills whose data acquisition layer can be replaced by QVeris Discover / Inspect / Execute.
- Treat repository indexes separately from directly adoptable skill repositories.

Scanned 38 repositories with GitHub tree metadata and spot-checked representative `SKILL.md` files.

## P0 - Highest Value Candidates

| Repository | License | Why It Matters | Main Risk | QVeris Adaptation |
|---|---:|---|---|---|
| https://github.com/anthropics/financial-services | Apache-2.0 | Institutional financial-services skill suite: earnings reviewer, DCF, comps, market research, model update, Excel outputs. Strong schemas and workflow depth. | Heavy report/spreadsheet workflow; assumes institutional MCP/data sources. | Use as output and workflow template for `qveris-earnings-analysis`, `qveris-dcf-model`, `qveris-comps-analysis`. |
| https://github.com/ginlix-ai/LangAlpha | Apache-2.0 | Finance research platform with `dcf-model`, `earnings-analysis`, `earnings-preview`, `sector-overview`; many scripts/tests/schema signals. | Large application; derived from Anthropic financial-services, so avoid duplicating whole repo. | Borrow skill definitions and schemas; replace MCP/data layer with QVeris tools. |
| https://github.com/EodHistoricalData/eodhd-claude-skills | MIT | Best engineered third-party finance skill package seen so far: multiple `SKILL.md`, plugin manifest, API client, tests, examples. | Directly tied to EODHD subscription/API. | Replace EODHD calls with QVeris tool execution; preserve company brief, earnings, screen, portfolio risk workflows. |
| https://github.com/himself65/finance-skills | MIT | Clear agent-skill layout; useful skills for sentiment, valuation, earnings preview/recap, correlation, liquidity. | Uses yfinance, Adanos, Funda, runtime installs/API keys. | Good source for `qveris-financial-sentiment`, `qveris-earnings-recap`, `qveris-liquidity-risk`. |
| https://github.com/yennanliu/InvestSkill | MIT | Focused US stock analysis package: 10-K digest, DCF, catalyst calendar, competitor analysis, dividend analysis, earnings-call analysis. | Some skills are merged/deprecated; tests/fixtures weak. | Strong task taxonomy for QVeris stock research skills. |
| https://github.com/webleon/tech-earnings-deepdive-openclaw-skill | MIT | Deep tech earnings memo skill with explicit output directory/formats and institutional analysis modules. | More prompt/workflow heavy than runner heavy. | Adapt into `qveris-tech-earnings-deepdive` using QVeris for filings/news/estimates/prices. |
| https://github.com/Indomi/earnings-tracker | MIT | US/HK/CN earnings tracker with Node scripts, mock provider, FMP/Alpha/Yahoo/Polygon/Sina/WebSearch adapters. | API key config risks; no tests. | Convert adapters to QVeris data tools; keep market/sector/watchlist logic. |
| https://github.com/Niceck/hhxg-top-hhxg-python | MIT | Small A-share quantitative data skill: daily snapshot, A-share calendar, margin financing, real-time news; stdlib-only Python, JSON option. | No tests; third-party data source dependency. | Good candidate for `qveris-a-share-market-snapshot`. |

## P1 - Good Reference Or Candidate With Caveats

| Repository | License | Candidate Capability | Caveat |
|---|---:|---|---|
| https://github.com/tradermonty/claude-trading-skills | MIT | Large trading workflow toolkit with many tests; useful for portfolio risk, data-quality checks, macro regime, sector analysis. | Trading-process heavy; some FMP/Alpaca/FinViz dependencies. |
| https://github.com/Ruinius/financial-analyst-skills | MIT | PDF/earnings document to financial extraction, calculations, qualitative assessment, DCF, JSON viewer. | Heavy local PDF/model workflow; better as 10-K/financial extraction reference. |
| https://github.com/cloudzun/akshare-skill | Unknown | A-share fundamental analysis training repo with mock data, test cases, data-acquisition/valuation/macro design. | Course-style repo; missing license. |
| https://github.com/baixianger/snowball-cli | Unknown in GitHub metadata, README says MIT | Xueqiu CLI for A/HK/US data, financials, flows, KOL posts, JSON output. | Login/cookie risk; no tests. |
| https://github.com/CNife/xueqiu-skills | Apache-2.0 | Xueqiu timeline skill. | Narrow; likely auth/session sensitive. |
| https://github.com/LLMQuant/skills | MIT | Quant skill set: market intelligence, portfolio, macro, crypto, derivatives. | Risk/API signals; needs deeper licensing and runner review. |
| https://github.com/marian2js/trading-skills | MIT | Portfolio risk review, earnings trade prep, market regime, risk/reward sanity checks. | Prompt/workflow oriented; fewer runnable data tools. |
| https://github.com/Bigdata-com/skills-financial-research-analyst | NOASSERTION | Financial research analyst skill. | License unclear; needs manual legal review. |
| https://github.com/jmkim-ntels/finance-alerts-skill | Unknown | Korean exchange-rate/stock dashboard and alert scripts. | No tests/license unclear; market-specific. |
| https://github.com/Xiaoyuan-Liu/national-team-position | MIT | A-share "national team" ETF positioning estimator with AKShare script. | Narrow but interesting factor/catalyst skill. |

## P2 - Reference Only

| Repository | Reason |
|---|---|
| https://github.com/arbiger/valuation-calculator | Useful formulas, but small single-skill calculator with no tests. |
| https://github.com/noahnan-max/financial-red-flag-auditor-skill | Strong annual-report red-flag workflow idea, but mostly prompt/report workflow. |
| https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent | Broad market-intelligence persona; useful taxonomy, but output is less structured and license is unclear. |
| https://github.com/GMGNAI/gmgn-skills | Crypto/meme-token data skills; useful only if QVeris wants crypto/social token coverage. |
| https://github.com/moinsen-dev/stock-analysis | Similar to OpenClaw stock-analysis, but license unknown. |
| https://github.com/cjpatten/canadian-finance-planner-skill | Good personal-finance workflow and test personas, but outside market-data focus. |
| https://github.com/jitu2611/indian-stock-analyst | India stock workflow idea; license unknown and no runner/tests. |

## Indexes / Discovery Sources

| Repository | Use |
|---|---|
| https://github.com/LeoYeAI/openclaw-master-skills | Massive OpenClaw skill index. Do not adopt wholesale. Mine individual finance skills such as Eastmoney, Tushare, Yahoo Finance, TickDB, market-signal-fusion. |
| https://github.com/majiayu000/claude-skill-registry | Massive registry. Useful for discovery only; many duplicate/noisy entries. |
| https://github.com/VoltAgent/awesome-agent-skills | Discovery index only. |

## Best QVeris Skill Directions From This Scan

1. `qveris-earnings-analysis`
   - Sources: Anthropic financial-services, LangAlpha, EODHD, earnings-tracker, tech-earnings-deepdive.
   - Inputs: ticker, fiscal period/date, market, analysis depth.
   - Outputs: Markdown report, JSON metrics, evidence list, trace.

2. `qveris-a-share-market-snapshot`
   - Sources: hhxg-top-hhxg-python, akshare-skill, snowball-cli, Eastmoney/Tushare skills.
   - Inputs: date/window, market segment, optional ticker/theme.
   - Outputs: market breadth, capital flow, calendar events, hot themes/news.

3. `qveris-financial-sentiment`
   - Sources: himself65 finance-sentiment, snowball/xueqiu KOL skills, market-signal-fusion.
   - Inputs: ticker/query/window/source preferences.
   - Outputs: label, confidence, affected symbols, evidence, source breakdown.

4. `qveris-10k-red-flag-digest`
   - Sources: InvestSkill 10-K digest, financial-red-flag-auditor, financial-analyst-skills.
   - Inputs: ticker/filing URL/document.
   - Outputs: filing summary, red flags, financial quality score, citations.

5. `qveris-factor-screen`
   - Sources: EODHD screener, InvestSkill, tradermonty, akshare.
   - Inputs: universe, factor weights, constraints.
   - Outputs: ranked candidates, missing factors, data provenance, trace.

## Immediate Next Candidates To Scaffold

1. `anthropics/financial-services` - earnings and DCF workflow templates.
2. `EodHistoricalData/eodhd-claude-skills` - best engineered direct third-party reference.
3. `Indomi/earnings-tracker` - narrow, easily QVeris-ified multi-market earnings tracker.
4. `Niceck/hhxg-top-hhxg-python` - practical A-share snapshot skill.
5. `yennanliu/InvestSkill` - broad US-stock skill taxonomy.

## Notes

- Several high-scoring repositories are indexes rather than deployable skills. Treat them as discovery sources only.
- Repositories with unknown or unclear license should not enter `third_party/finance/` as code candidates until manually reviewed.
- Any skill using cookie/login/browser automation should be rewritten around QVeris data tools rather than adopted directly.
- For every promoted candidate, add `candidate.json`, fixture data, output schema, a dry-run path, and QVeris trace fields before calling it Featured.
