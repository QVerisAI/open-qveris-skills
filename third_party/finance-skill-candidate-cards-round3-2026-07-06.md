# 金融 Skill 候选逐项评估卡片（Round 3 追加扫描）

日期：2026-07-06
用途：继续扩大 GitHub 金融 skill 候选池，补充 A 股数据、量化/回测、券商/交易工具、三表建模、个人金融和投资研究类仓库。
扫描说明：本轮以浅克隆为主，重点核验 `SKILL.md`、脚本入口、测试、License 和金融业务风险。交易执行/券商接入类候选只建议抽取研究、数据、风控和报告能力，不建议直接引入下单能力。

## Round 3 总结

本轮新增 20 张候选卡片。更值得金融同学优先看的新增项：

| 优先级 | 新增候选 | 金融价值 |
|---|---|---|
| P1 | Vibe-Trading | 79 个金融 skill、Alpha Zoo、回测、因子、期权、多市场数据，能力强但交易风险高 |
| P1 | Schwagent | factor research、financial statement、fundamentals、portfolio、options 等 skill 完整，测试较多 |
| P1 | A-Share Skill | A 股实时、历史、事件、技术、行业/概念、A+H、市场快讯，适合抽取数据层 |
| P1 | A-Stock Data | A 股全栈数据工具包，覆盖研报、公告、资金、龙虎榜、解禁、ETF 期权、互动易 |
| P1 | Stock Analytics Skill | A/H/美股、ETF、基金、债券、comps、credit、macro 等投资分析 skill 集合 |
| P1 | 3-Statement Ultra | 机构级三表模型，公式联动、QC、季度/半年度建模约束清楚 |
| P1/P2 | Trading Skills / Personal Finance / Trading Copilot | 组合、基本面、期权、券商接入有参考价值，但执行和合规风险高 |

## 53. Vibe-Trading

| 字段 | 内容 |
|---|---|
| 仓库 | Vibe-Trading |
| GitHub URL | https://github.com/HKUDS/Vibe-Trading |
| License | MIT |
| 最近活跃 | 2026-07-05 |
| 候选能力 | 可沉淀为 `qveris-factor-research`、`qveris-backtest-diagnose`、`qveris-alpha-zoo`、`qveris-options-pricing`、`qveris-trade-journal-analyzer`。金融价值在 79 个金融 skill、452 个预置 alpha、多市场回测、因子分析、期权定价和交易日志复盘。 |
| 直接可用性 | 需强改造。能力很强，但交易/回测/策略执行边界复杂。 |
| 核心代码 | `agent/SKILL.md`；`agent/src/skills/factor-analysis/SKILL.md`；`agent/src/skills/backtest-diagnose/SKILL.md`；`agent/src/skills/akshare/SKILL.md`；`agent/src/skills/alpha-zoo/SKILL.md`；`agent/backtest/*`；`agent/mcp_server.py`。 |
| 外部依赖 | `vibe-trading-ai`、Tushare、yfinance、AkShare、Baostock、Tencent、Mootdx、CCXT、Futu、FMP/AlphaVantage/Tiingo/Finnhub optional keys、LLM key、IBKR local session。 |
| 安全风险 | 回测结果、Alpha Zoo、shadow account 和 IBKR tools 容易被误用为实盘交易；必须隔离下单能力。 |
| 测试情况 | 测试信号较强：`agent/tests/*` 覆盖 agent loop、akshare loader、alpha compare、backtest 等。 |
| QVeris 改造方式 | 只抽取因子研究、回测诊断、数据适配和报告 schema；QVeris 负责数据 lineage、禁止自动交易、补 evidence 和 replay trace。 |
| 优先级 | P1 |

## 54. Schwagent

| 字段 | 内容 |
|---|---|
| 仓库 | Schwagent |
| GitHub URL | https://github.com/sbauwow/schwagent |
| License | MIT |
| 最近活跃 | 2026-06-19 |
| 候选能力 | 可沉淀为 `qveris-factor-research`、`qveris-fundamental-filter`、`qveris-financial-statement-review`、`qveris-portfolio-risk`、`qveris-options-risk`。金融价值在 factor research、financial statement、fundamental filter、portfolio optimizer、options 和 risk modules。 |
| 直接可用性 | 需强改造。研究能力可参考，Schwab/交易相关能力不直接引入。 |
| 核心代码 | `src/schwabagent/intelligence/skills_lib/factor-research/SKILL.md`；`financial-statement/SKILL.md`；`fundamental-filter/SKILL.md`；`multi-factor/SKILL.md`；`src/schwabagent/*.py`。 |
| 外部依赖 | Schwab/broker account、market data、fundamentals、options data、backtest modules。 |
| 安全风险 | 券商接入、options、portfolio optimizer、订单/执行相关功能风险高。 |
| 测试情况 | 测试信号强：`tests/test_factor*`、`test_fundamentals.py`、`test_options.py`、`test_portfolio_optimizer.py`、`test_risk.py` 等。 |
| QVeris 改造方式 | 抽取 factor/fundamental/financial-statement/risk 的 skill taxonomy 和测试思路，移除 broker execution，数据改由 QVeris 提供。 |
| 优先级 | P1 |

## 55. Trading Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Trading Skills |
| GitHub URL | https://github.com/staskh/trading_skills |
| License | MIT |
| 最近活跃 | 2026-06-24 |
| 候选能力 | 可沉淀为 `qveris-earnings-calendar`、`qveris-fundamentals`、`qveris-piotroski-score`、`qveris-greeks`、`qveris-ib-portfolio-risk`。金融价值在基本面、Piotroski F-score、earnings、期权 Greeks、IBKR portfolio/report。 |
| 直接可用性 | 需强改造。只取只读研究/风控能力，不引入 IBKR 下单/止损/roll advisor。 |
| 核心代码 | `.claude/skills/fundamentals/SKILL.md`；`.claude/skills/earnings-calendar/SKILL.md`；`.claude/skills/greeks/SKILL.md`；`.claude/skills/ib-portfolio/SKILL.md`；对应 `scripts/*.py`。 |
| 外部依赖 | Yahoo Finance、IBKR/TWS、options data、portfolio/trades history。 |
| 安全风险 | IBKR 账户、订单、trailing stop、PMCC advisor、roll advisor 等执行风险高。 |
| 测试情况 | 测试信号强：`tests/test_fundamentals.py`、`test_greeks.py`、`test_earnings_calendar.py`、`test_broker_*`。 |
| QVeris 改造方式 | 抽取 fundamentals、Piotroski、earnings、Greeks 和 portfolio exposure 报告；去除账户交易权限。 |
| 优先级 | P1/P2 |

## 56. Personal Finance Skill

| 字段 | 内容 |
|---|---|
| 仓库 | Personal Finance Skill |
| GitHub URL | https://github.com/6missedcalls/personal-finance-skill |
| License | MIT |
| 最近活跃 | 2026-02-27 |
| 候选能力 | 可沉淀为 `qveris-market-intel`、`qveris-social-sentiment`、`qveris-portfolio-monitor`、`qveris-tax-loss-harvest-check`。金融价值在 75 tools、Plaid、Alpaca、IBKR、tax engine、SEC/FRED/BLS/AlphaVantage、StockTwits/X/Quiver。 |
| 直接可用性 | 需强改造/仅部分参考。个人账户、交易和税务边界过宽。 |
| 核心代码 | `SKILL.md`；`extensions/finance-core/*`；`extensions/market-intel/*`；`extensions/social-sentiment/*`；`extensions/alpaca-trading/*`；`extensions/ibkr-portfolio/*`。 |
| 外部依赖 | Plaid、Alpaca、IBKR、Finnhub、SEC EDGAR、FRED、BLS、Alpha Vantage、StockTwits、X/Twitter、Quiver。 |
| 安全风险 | 银行账户、券商账户、交易下单、税务建议、社交数据和隐私风险很高。 |
| 测试情况 | 测试信号强：`extensions/*/tests/*` 覆盖 finance-core、Alpaca、IBKR、market-intel 等。 |
| QVeris 改造方式 | 只抽取 market intelligence、SEC/econ data、social sentiment、portfolio monitoring 的只读结构；不引入银行、下单和税务执行。 |
| 优先级 | P1/P2 |

## 57. A-Share Skill

| 字段 | 内容 |
|---|---|
| 仓库 | A-Share Skill |
| GitHub URL | https://github.com/shouldnotappearcalm/a-share-skill |
| License | MIT |
| 最近活跃 | 2026-06-24 |
| 候选能力 | 可沉淀为 `qveris-a-share-data`、`qveris-a-share-events`、`qveris-sector-heatmap`、`qveris-ah-ipo-timeline`。金融价值在 A 股实时/历史、技术指标、个股事件、热门行业/概念、板块热力图、7×24 快讯、A+H 和赴港上市时间线。 |
| 直接可用性 | 需改造。`a-share-data` 值得参考，paper trading/短线策略 skill 不建议引入。 |
| 核心代码 | `a-share-data/SKILL.md`；`a-share-data/scripts/fetch_realtime.py`；`fetch_history.py`；`fetch_technical.py`；`fetch_stock_events.py`；`fetch_danginvest.py`；`fetch_ah_stocks.py`；`fetch_ah_ipo_timeline.py`。 |
| 外部依赖 | AkShare、MyTT、pandas、numpy、requests、东方财富/腾讯/雪球等上游。 |
| 安全风险 | 短线交易和 paper trading 模块需剥离；上游数据授权和稳定性需确认。 |
| 测试情况 | 有 `a-share-data/scripts/test_fetch_realtime_intraday.py`，paper trading 模块也有若干验证脚本。 |
| QVeris 改造方式 | 将 A 股数据脚本拆成只读 QVeris tools，输出 JSON、来源、延迟、缺失字段和重试/降级 trace。 |
| 优先级 | P1 |

## 58. A-Stock Data

| 字段 | 内容 |
|---|---|
| 仓库 | A-Stock Data |
| GitHub URL | https://github.com/simonlin1212/a-stock-data |
| License | Apache-2.0 |
| 最近活跃 | 2026-06-28 |
| 候选能力 | 可沉淀为 `qveris-a-stock-data-layer`、`qveris-a-share-research-reports`、`qveris-lhb-monitor`、`qveris-unlock-alert`、`qveris-etf-options-data`。金融价值在 A 股十层数据：行情、研报、信号、资金、新闻、财报、公告、打板、ETF 期权、互动易/热榜。 |
| 直接可用性 | 需改造。数据覆盖很强，但数据源和防封策略不能直接作为正式产品依赖。 |
| 核心代码 | `SKILL.md`，其内嵌多类 HTTP API 调用和数据源说明。 |
| 外部依赖 | Mootdx、腾讯财经、百度股市通、东方财富、同花顺、iwencai、巨潮、互动易、东财/新浪等。 |
| 安全风险 | 网页端点、限流、防封、数据授权；打板/ETF 期权/舆情容易被误读为交易建议。 |
| 测试情况 | 未发现独立 tests；文档包含 smoke-test 式实测说明。 |
| QVeris 改造方式 | 作为 A 股数据覆盖需求清单；QVeris 自建合规数据源和 schema，只复用字段设计和数据层分类。 |
| 优先级 | P1 |

## 59. Stock Analytics Skill

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analytics Skill |
| GitHub URL | https://github.com/belos-street/stock-analytics-skill |
| License | Unknown |
| 最近活跃 | 2026-07-04 |
| 候选能力 | 可沉淀为 `qveris-investment-memo`、`qveris-comps-analysis`、`qveris-credit-analysis`、`qveris-fund-screening`、`qveris-macro-sector-transmission`、`qveris-market-valuation`。金融价值在 24+ 投资分析 skill，覆盖股票、ETF、基金、债券、comps、信用、宏观传导和投资 memo。 |
| 直接可用性 | 仅可参考/需改造。目录很有价值，但 license 未核验。 |
| 核心代码 | `.agents/skills/comparable-company-analysis/SKILL.md`；`credit-analysis/SKILL.md`；`investment-memo/SKILL.md`；`market-valuation/SKILL.md`；`fund-screening/SKILL.md`；`hk-stock-analysis/SKILL.md`。 |
| 外部依赖 | stock-sdk、市场数据、基金/债券/ETF 数据、财务和估值数据。 |
| 安全风险 | 部分 skill 写有“投资建议输出”，需改成研究辅助；license unknown。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 抽取 skill taxonomy 和报告模板，逐项重写为 QVeris schema + evidence-first 输出。 |
| 优先级 | P1/P2 |

## 60. MAIA Skill

| 字段 | 内容 |
|---|---|
| 仓库 | MAIA Skill |
| GitHub URL | https://github.com/Hainrixz/maia-skill |
| License | Unknown |
| 最近活跃 | 2026-06-18 |
| 候选能力 | 可沉淀为 `qveris-market-research-report`、`qveris-multi-asset-opportunity-radar`。金融价值在多 agent 投资研究，覆盖 crypto、stocks、forex、commodities，并跟踪历史准确性。 |
| 直接可用性 | 仅可参考/需改造。更像多 agent 市场报告系统，不是单一金融 skill。 |
| 核心代码 | `SKILL.md`；`.claude/skills/investment-analysis/SKILL.md`；`references/agent-prompts.md`；dashboard/report 相关文件。 |
| 外部依赖 | WebSearch/WebFetch、Yahoo/CoinGecko/Frankfurter、FINNHUB/POLYGON optional keys、本地 dashboard。 |
| 安全风险 | “investment opportunities / portfolio recommendations” 场景敏感；虽然有教育性声明，仍需去建议化。 |
| 测试情况 | 有 CI 线索，但本轮未确认专项 tests。 |
| QVeris 改造方式 | 只参考多资产报告结构和历史准确性 tracking；QVeris 输出应为市场观察和证据，不给配置建议。 |
| 优先级 | P2/P1 |

## 61. 3-Statement Ultra

| 字段 | 内容 |
|---|---|
| 仓库 | 3-Statement Ultra for Finance |
| GitHub URL | https://github.com/willpowerju-lgtm/3-statement-ultra-for-finance |
| License | Unknown |
| 最近活跃 | 2026-05-15 |
| 候选能力 | 可沉淀为 `qveris-3-statement-model`。金融价值在从零构建机构级三表模型，支持 US/A 股季度、港股半年度、IFRS/US GAAP/中国准则、公式联动和 QC gate。 |
| 直接可用性 | 需改造。建模流程强，但 license unknown，且会消耗较多上下文/文件操作。 |
| 核心代码 | `3-statements-ultra/SKILL.md`；`hooks/three_stmt_*_guard.py`；`references/format-spec.md`；`references/gate-spec.md`；`demo_from_repo.py`。 |
| 外部依赖 | openpyxl、yfinance、pandas、可选 NotebookLM、Excel 文件、财报/招股书。 |
| 安全风险 | 模型假设和历史数据抽取错误会传导到估值；需强制公式审计和来源注释。 |
| 测试情况 | 有 demo/E2E 脚本和 guard hooks；本轮未确认完整 tests。 |
| QVeris 改造方式 | 保留三表建模质量门禁、状态恢复、公式不硬编码原则；由 QVeris 提供财报数据和来源追溯。 |
| 优先级 | P1 |

## 62. Stock News Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Stock News Skills |
| GitHub URL | https://github.com/zcr20090430/stock-news-skills |
| License | Unknown |
| 最近活跃 | 2026-03-24 |
| 候选能力 | 可沉淀为 `qveris-stock-news-impact`、`qveris-fundamental-technical-brief`。金融价值在多源资讯、金十、雪球、东方财富、新浪、财联社、公告、技术分析和基本面分析。 |
| 直接可用性 | 仅可参考。走势预测和技术信号表达较强。 |
| 核心代码 | `SKILL.md`；`scripts/stock_data.py`；`technical_analysis.py`；`fundamental_analysis.py`；`multi_source_search.py`；`jin10_scraper.py`；`xueqiu_scraper.py`。 |
| 外部依赖 | 本地 prosearch proxy、金十、雪球、东方财富、新浪、财联社、公告和行情数据。 |
| 安全风险 | 明确写有“走势预测”；雪球/抓取/代理风险；license unknown。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 抽取新闻/公告/基本面聚合框架，去掉走势预测和买卖点，改成事件影响和风险标签。 |
| 优先级 | P2/P1 |

## 63. Gauss314 Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Gauss314 Skills |
| GitHub URL | https://github.com/gauss314/skills |
| License | Unknown |
| 最近活跃 | 2026-06-14 |
| 候选能力 | 可沉淀为 `qveris-alpaca-market-data`、`qveris-options-data`、`qveris-historical-bars`。金融价值在 Alpaca 股票/crypto/options 数据下载和 trading skill 结构。 |
| 直接可用性 | 仅可参考。Alpaca 数据 skill 可参考，trading skill 不引入。 |
| 核心代码 | `skills/alpaca-data/SKILL.md`；`skills/alpaca-data/scripts/download_stock_bars.py`；`download_options.py`；`download_crypto_bars.py`；`skills/alpaca-trading/SKILL.md`。 |
| 外部依赖 | Alpaca API key/secret、alpaca-py、股票/crypto/options data。 |
| 安全风险 | API key、broker/trading 功能、options 数据许可。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 借鉴 market data 下载和 rate-limit/cache 说明；QVeris 自行实现数据访问。 |
| 优先级 | P2 |

## 64. Evo Nexus Financial Statements

| 字段 | 内容 |
|---|---|
| 仓库 | Evo Nexus |
| GitHub URL | https://github.com/evolution-foundation/evo-nexus |
| License | Apache-2.0 |
| 最近活跃 | 2026-05-12 |
| 候选能力 | 可沉淀为 `qveris-financial-statements-variance`。金融价值在月度/季度/年度 P&L、BS、CF、budget variance 和 period-over-period comparison。 |
| 直接可用性 | 仅可参考。偏企业财务/关账，不是市场投研主线。 |
| 核心代码 | `.claude/skills/fin-financial-statements/SKILL.md`；`.claude/commands/flux-finance.md`。 |
| 外部依赖 | ERP、data warehouse、trial balance、budget/forecast、GAAP presentation requirements。 |
| 安全风险 | 公司内部财务数据隐私；财报/报表需专业复核。 |
| 测试情况 | 大仓库有 backend tests，但本轮未确认 finance skill 专项 tests。 |
| QVeris 改造方式 | 仅参考财务报表和 variance analysis 输出格式；若进入企业财务场景需另立权限和审计边界。 |
| 优先级 | P2 |

## 65. A-Share Short Decision

| 字段 | 内容 |
|---|---|
| 仓库 | A-Share Short-Term Decision |
| GitHub URL | https://github.com/kenera/a-share-short-decision |
| License | Unknown |
| 最近活跃 | 2026-02-14 |
| 候选能力 | 可沉淀为 `qveris-a-share-signal-log`、`qveris-short-term-signal-evaluation`，但不建议直接做短线推荐。 |
| 直接可用性 | 仅可参考/暂不投入。核心定位是 1-5 日短线交易决策。 |
| 核心代码 | `SKILL.md`；`main.py`；`prompts/analysis_prompt.txt`；`subskills/config-optimization/SKILL.md`。 |
| 外部依赖 | A 股行情、市场情绪、板块轮动、强势股扫描、资金流。 |
| 安全风险 | 短线买入标的、预测日志、次日对比，合规风险高。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只保留“信号评估与预测事后检验”的方法，不输出短线买入建议。 |
| 优先级 | P2/暂不投入 |

## 66. Stock Analysis Skill by liusai0820

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analysis Skill |
| GitHub URL | https://github.com/liusai0820/stock-analysis-skill |
| License | Unknown |
| 最近活跃 | 2026-03-04 |
| 候选能力 | 可沉淀为 `qveris-stock-analysis-template`、`qveris-data-source-degradation`。金融价值在 A/H/US 股票数据降级、技术指标、新闻和报告看板。 |
| 直接可用性 | 仅可参考。输出含操作建议、目标价、止损价。 |
| 核心代码 | `SKILL.md`；`references/stock_data_fetcher.py`；`references/analysis-prompt-template.md`；`references/output-format-template.md`。 |
| 外部依赖 | Tushare、efinance、AkShare、yfinance、Tavily、SerpAPI、WebSearch。 |
| 安全风险 | 买卖信号、目标价、止损价；license unknown。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 可参考数据源降级链和输出模板，去掉操作建议，改成 evidence-backed research brief。 |
| 优先级 | P2 |

## 67. Stock Analysis 3D

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analysis 3D |
| GitHub URL | https://github.com/Geralt-L/Stock-Analysis-3D |
| License | MIT |
| 最近活跃 | 2026-05-22 |
| 候选能力 | 可沉淀为 `qveris-stock-scorecard`。金融价值在技术面/基本面/消息面三维评分拆解。 |
| 直接可用性 | 仅可参考。评分直接映射强买/买入/卖出，不适合直接引入。 |
| 核心代码 | `SKILL.md`；`references/stock_data_fetcher.py`。 |
| 外部依赖 | WebSearch、行情/财务数据源、Python 数据脚本。 |
| 安全风险 | 强烈买入/卖出、价格目标、消息面 Claude 打分，合规风险高。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只保留 scorecard 的维度拆解，改成风险/质量/动量标签，不输出买卖档位。 |
| 优先级 | P2 |

## 68. Stock Analysis Skill by tigersking520

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analysis Skill |
| GitHub URL | https://github.com/tigersking520/stock-analysis-skill |
| License | MIT |
| 最近活跃 | 2026-05-14 |
| 候选能力 | 可参考个股分析报告、财务排雷、市值倒推、关键因子和反证清单。 |
| 直接可用性 | 仅可参考。投研框架比工程实现更有价值。 |
| 核心代码 | `SKILL.md`；`references/data-sources.md`；`references/financial-red-flags.md`；`references/reverse-valuation.md`；`templates/analysis-template.md`。 |
| 外部依赖 | 公司公告、年报、季报、交易所文件、AkShare、东方财富、新浪财经。 |
| 安全风险 | 包含“好买卖”、建仓/卖出策略，需要去交易化。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 吸收财务排雷、市值倒推和反证清单框架，作为 `qveris-stock-research-brief` 的 rubric。 |
| 优先级 | P2/P1 |

## 69. Stock Analyzer Skill by AltenLi

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analyzer Skill |
| GitHub URL | https://github.com/AltenLi/stock-analyzer-skill |
| License | GPL |
| 最近活跃 | 2026-03-30 |
| 候选能力 | 可参考东方财富覆盖市场的基本面、新闻面、资金面三维分析和 HTML 报告生成。 |
| 直接可用性 | 不建议引入。GPL、登录态和买卖价位风险都较高。 |
| 核心代码 | `skill/SKILL.md`；`.codebuddy/skills/stock-analyzer/SKILL.md`；`skill/scripts/fetch_stock.py`。 |
| 外部依赖 | 东方财富网页、登录态、Python、可能浏览器/网页访问。 |
| 安全风险 | 要求用户登录东方财富；输出投资建议、买入价位、卖出价位；GPL。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 不引入代码；仅参考 HTML 报告形态和三维分类。 |
| 优先级 | 暂不投入 |

## 70. Trading Copilot

| 字段 | 内容 |
|---|---|
| 仓库 | Trading Copilot |
| GitHub URL | https://github.com/ShousenZHANG/trading-copilot |
| License | MIT |
| 最近活跃 | 2026-06-10 |
| 候选能力 | 可沉淀为 `qveris-catalyst-calendar`、`qveris-bull-bear-debate`、`qveris-portfolio-review`。金融价值在多 agent 分析、催化剂日历、bull/bear debate、risk debate 和组合复盘。 |
| 直接可用性 | 仅可参考/需强改造。原定位是 buy/sell/watchlist/portfolio decision。 |
| 核心代码 | `.claude/skills/trading-copilot/SKILL.md`；`.claude/skills/catalyst-calendar/SKILL.md`；`scripts/assemble_report.py`；`scripts/portfolio_check.py`；`evals/*`。 |
| 外部依赖 | Finnhub MCP、market/social/news/fundamentals agents、memory、Monte Carlo、Polymarket odds。 |
| 安全风险 | 明确输出 recommendation、entry/stop/sizing、price target，合规风险高。 |
| 测试情况 | 有 `scripts/_test_memory.py` 和 `_test_validation.py`，但不是完整业务 tests。 |
| QVeris 改造方式 | 只保留 bull/bear/risk debate 和 catalyst calendar，输出为证据对照，不给交易方案。 |
| 优先级 | P2 |

## 71. Manus Equity Research

| 字段 | 内容 |
|---|---|
| 仓库 | Manus Equity Research |
| GitHub URL | https://github.com/Ashish-Soni08/manus-equity-research |
| License | Unknown |
| 最近活跃 | 2026-04-05 |
| 候选能力 | 可沉淀为 `qveris-equity-research-deliverables`。金融价值在从 ticker 到投资 memo、Excel financial model、PDF/deck 交付物的端到端示例。 |
| 直接可用性 | 仅可参考。不是标准 skill 仓库，没有 `SKILL.md`。 |
| 核心代码 | `README.md`；`demo/PLTR_Financial_Model.xlsx`；`demo/PLTR_Investment_Memo.md`；`demo/PLTR_Investment_Memo.pdf`；`demo/charts/*`。 |
| 外部依赖 | Manus 平台、SEC filings、Yahoo Finance、图表和 Excel/PDF 生成链路。 |
| 安全风险 | 示例直接给 HOLD、fair value、insider selling 解读；license unknown。 |
| 测试情况 | 无 tests。 |
| QVeris 改造方式 | 只参考交付物结构和图表清单；QVeris 自建数据、估值和证据 trace。 |
| 优先级 | P2 |

## 72. Sparse / Deferred Candidates

| 字段 | 内容 |
|---|---|
| 仓库 | 低信息量或待复核候选汇总 |
| GitHub URL | https://github.com/wudengyao/stock-analysis-team；https://github.com/openclaw/skills；以及本轮搜索中未能稳定 clone/核验的同名 stock-analysis 仓库 |
| License | Unknown / 待复核 |
| 最近活跃 | 2026-07 附近，视具体仓库而定 |
| 候选能力 | 本轮发现部分仓库名或 README 与金融相关，但 clone 超时、结构过大、缺少明确 `SKILL.md`，或内容更像 demo/marketing。 |
| 直接可用性 | 仅可参考 |
| 核心代码 | 待复核 |
| 外部依赖 | 待复核 |
| 安全风险 | 主要风险是信息不足和重复候选。 |
| 测试情况 | 待复核 |
| QVeris 改造方式 | 暂不进入金融专家评审，除非后续能确认明确 `SKILL.md`、脚本和输出结构。 |
| 优先级 | 暂不投入 |

## 建议合并到主评审清单的新增 P1

建议把以下新增项合并到主评审材料，但不要放进第一批 P0 开发：

1. `HKUDS/Vibe-Trading` → 因子研究、回测诊断、Alpha Zoo，可作为量化研究参考。
2. `sbauwow/schwagent` → factor/fundamental/financial statement/risk skill，去 broker execution。
3. `shouldnotappearcalm/a-share-skill` → A 股数据、事件、行业概念、A+H 和快讯。
4. `simonlin1212/a-stock-data` → A 股全栈数据覆盖清单，适合补 QVeris 中国市场 data map。
5. `belos-street/stock-analytics-skill` → 投资分析 skill taxonomy，适合金融专家看主题覆盖。
6. `willpowerju-lgtm/3-statement-ultra-for-finance` → 三表模型质量门禁和公式审计。

不建议进入近期开发的新增项：

- 直接输出买卖点、目标价、止损价、短线决策的 stock-analysis 类仓库。
- 需要东方财富/券商/IBKR/Alpaca 登录态或下单权限的能力。
- license unknown 且没有 tests/schema/runner 的单文件 skill。
