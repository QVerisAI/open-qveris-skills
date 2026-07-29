# 金融 Skill 候选逐项评估卡片

日期：2026-07-06
用途：供金融同学逐项判断每个 GitHub 候选 skill/仓库在金融业务上是否有价值，是否值得引入或改造成 QVeris/Open Skills。
说明：本文件一节就是一张评估卡片。金融同学主要看“候选能力”“直接可用性”“安全风险”“QVeris 改造方式”“优先级”，不需要评审代码实现细节。

## QVeris 数据底座改造记录（前 11 个）

编号 1-11 已先按 `qveris_finance` CAP 工具能力清单改成 QVeris-native 数据底座口径，不再沿用原仓库的 EODHD、Yahoo、FMP、Alpha Vantage、Polygon、AkShare、Snowball、Sina、SEC scraping、Longbridge、FinViz、Alpaca 等外部数据源。下面 1-11 张卡中的“外部依赖”和“QVeris 改造方式”已按此口径重写，金融同学可直接评估业务价值，工程同学可据此拆 scaffold。

改造说明见：

- [qveris-data-substrate-first-11-2026-07-06.md](./qveris-data-substrate-first-11-2026-07-06.md)

统一原则：

- 标的解析走 `qveris_finance.ref_symbology`、`qveris_finance.ref_security_master`、`qveris_finance.ref_company_profile`。
- 行情、财报、预期、披露、新闻、电话会、研报、资金流、所有权、指数、宏观、技术指标等数据统一走 `qveris_finance.*`。
- 输出必须包含 `qveris_trace`，记录 `tool_name`、`capability_id`、`as_of`、`retrieved_at`、`fallback_used`、`missing_fields`。
- 不引入登录态、cookie、第三方 API key、买卖建议、目标价承诺或自动交易能力。

前 11 个建议先合并落成 4 个 QVeris-native scaffold：

| 优先 scaffold | 来源候选 | 金融用途 | 第一版边界 |
|---|---|---|---|
| `qveris-earnings-analysis` | 1、2、3、5、6、8 | 财报日历、业绩 beat/miss、电话会摘要、价格反应、风险提示 | 只做研究摘要和证据表，不输出买卖动作 |
| `qveris-comps-dcf-analysis` | 1、2、5、11 | 同行可比、DCF 假设、敏感性、估值输入审计 | 输出估值区间和假设，不承诺目标价 |
| `qveris-a-share-market-snapshot` | 9 | A 股盘面快照、题材、融资融券、资金流、快讯 | 快讯标注确认状态，不放大未核实消息 |
| `qveris-portfolio-risk-regime` | 3、4、10 | 组合风险、市场状态、行业轮动、数据质量检查 | 只做风险解释和监控，不给调仓指令 |

## 金融评审结论记录（2026-07-06）

金融同学已对部分候选给出初步业务价值结论：

| 评审结论 | 编号 | 仓库 | GitHub URL | 后续动作 |
|---|---:|---|---|---|
| 可以引入 | 15 | LLMQuant Skills | https://github.com/LLMQuant/skills | 进入引入候选；优先拆 `market-intelligence`、`macro-monitor`、`equities-research`、`credit-monitor`，options/derivatives 需单独合规审查 |
| 可以引入 | 17 | Bigdata Financial Research Analyst | https://github.com/Bigdata-com/skills-financial-research-analyst | 进入引入候选；先做 license/法务复核，再拆 `financial-research-analyst`、DCF、comps、earnings quality、reverse DCF |
| 可以引入 | 22 | Money Atlas | https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent | 进入引入候选；先做 license/法务复核，只抽取 macro/portfolio/risk/sentiment agent 分工和报告结构 |
| 试点 | 18 | Finance Alerts Skill | https://github.com/jmkim-ntels/finance-alerts-skill | 小范围验证 market alerts / KR market alerts，先确认市场覆盖和 license |
| 试点 | 19 | National Team Position | https://github.com/Xiaoyuan-Liu/national-team-position | 小范围验证 A 股国家队/中央汇金 ETF 持仓趋势因子 |
| 试点 | 20 | Valuation Calculator | https://github.com/arbiger/valuation-calculator | 小范围验证估值公式和命令面，代码引入前需 license 复核 |
| 试点 | 21 | Financial Red Flag Auditor | https://github.com/noahnan-max/financial-red-flag-auditor-skill | 小范围验证年报/10-K 红旗指标，优先并入 `qveris-10k-red-flag-digest` |
| 试点 | 23 | GMGN Skills | https://github.com/GMGNAI/gmgn-skills | 仅在确认 crypto/token coverage 后试点，只保留只读 market/token/portfolio 分析 |
| 试点 | 24 | Stock Analysis | https://github.com/moinsen-dev/stock-analysis | 小范围验证 stock analysis / hot scanner / rumor scanner 边界，需重建数据源和证据标注 |

备注：金融评审结论代表业务价值判断，不等同于工程可直接引入。`NOASSERTION`、`Unknown`、已归档仓库、涉及 crypto/wallet/rumor/trading signal 的候选，仍需工程、法务、合规二次确认。

## 1. Anthropic Financial Services

| 字段 | 内容 |
|---|---|
| 仓库 | Anthropic Financial Services |
| GitHub URL | https://github.com/anthropics/financial-services |
| License | Apache-2.0 |
| 最近活跃 | 2026-06-26 |
| 候选能力 | 可沉淀为 `qveris-earnings-analysis`、`qveris-comps-analysis`、`qveris-dcf-analysis`、`qveris-market-research`。金融价值在于机构级财报解读、可比公司分析、估值模型和研究报告结构。 |
| 直接可用性 | 需改造。分析流程和报告结构很有价值，但数据源、MCP 环境和执行链路不能直接搬。 |
| 核心代码 | `plugins/agent-plugins/earnings-reviewer/skills/earnings-analysis/SKILL.md`；`plugins/agent-plugins/market-researcher/skills/comps-analysis/SKILL.md`；相关 valuation/model update skill。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；原机构级金融数据/MCP 假设只作为能力映射参考，不直连。 |
| QVeris 数据底座 | 标的解析：`ref_symbology`、`ref_security_master`、`ref_company_profile`；财报/估值：`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`fundamentals_derived_ratios`、`fundamentals_segment`；盈利/预期：`earnings_actual_surprise`、`estimates_consensus`；文本/事件：`transcripts_earnings_call`、`news_fin_tagged`、`news_dedup_cluster`、`event_calendar_corp`；市场/宏观：`mkt_l1_rt`、`rates_govt_benchmark`、`fx_spot`；研究/持仓：`research_analyst_reports`、`ownership_institutional`。 |
| 安全风险 | 数据源和 MCP 权限需重审；报告可能接近投资建议，必须加入 evidence gating 和“不构成投资建议”边界。 |
| 测试情况 | 未在本轮完整核验 tests/fixtures；应在引入前检查每个 skill 的样例、schema 和测试。 |
| QVeris 改造方式 | 拆为 earnings、comps、DCF、market research 四条 workflow；所有数值结论必须来自 `qveris_finance.*`，输出保留报告结构、Excel/JSON 字段和逐结论 `qveris_trace`。 |
| 优先级 | P0 |

## 2. LangAlpha

| 字段 | 内容 |
|---|---|
| 仓库 | LangAlpha |
| GitHub URL | https://github.com/ginlix-ai/LangAlpha |
| License | Apache-2.0 |
| 最近活跃 | 2026-07-06 |
| 候选能力 | 可沉淀为 `qveris-dcf-analysis`、`qveris-earnings-analysis`、`qveris-earnings-preview`、`qveris-sector-overview`。金融价值在于 DCF 假设、敏感性分析、财报 post-mortem 和行业概览。 |
| 直接可用性 | 需改造。适合参考 skill 定义和 schema，但不建议直接依赖其平台化实现。 |
| 核心代码 | `skills/dcf-model/SKILL.md`；`skills/earnings-analysis/SKILL.md`；`skills/earnings-preview/SKILL.md`；`skills/sector-overview/SKILL.md`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；原 fundamentals/market/macro MCP 只作为字段需求参考。 |
| QVeris 数据底座 | DCF：`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`fundamentals_derived_ratios`、`estimates_consensus`、`rates_govt_benchmark`、`mkt_l1_rt`；财报：`event_calendar_earnings`、`earnings_actual_surprise`、`transcripts_earnings_call`、`news_fin_realtime`；行业：`ref_classification_industry`、`index_constituents`、`index_levels`、`flow_sector_capital`、`mkt_breadth_internals`。 |
| 安全风险 | 部分 skill 可能派生自 Anthropic financial-services，需要去重和许可确认；估值结论需避免变成目标价承诺。 |
| 测试情况 | 未在本轮完整核验 tests/fixtures；引入前应检查 schema、fixtures 和运行样例。 |
| QVeris 改造方式 | 保留 DCF/earnings/sector schema，重写数据 adapter 为 QVeris CAP 调用；DCF 必须输出假设、敏感性、缺失数据和 `qveris_trace`，不输出目标价承诺。 |
| 优先级 | P0 |

## 3. EODHD Claude Skills

| 字段 | 内容 |
|---|---|
| 仓库 | EODHD Claude Skills |
| GitHub URL | https://github.com/EodHistoricalData/eodhd-claude-skills |
| License | MIT |
| 最近活跃 | 2026-07-01 |
| 候选能力 | 可沉淀为 `qveris-stock-screener`、`qveris-portfolio-risk-monitor`、`qveris-company-brief`、`qveris-earnings-monitor`、`qveris-macro-dashboard`。金融价值在于覆盖公司画像、筛选、组合风险和宏观仪表盘。 |
| 直接可用性 | 需改造。工作流和输出结构可参考，数据访问层需替换。 |
| 核心代码 | `skills/stock-screener/SKILL.md`；`skills/portfolio-risk/SKILL.md`；`skills/company-brief/SKILL.md`；`skills/earnings-monitor/SKILL.md`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 EODHD API/subscription、供应商 endpoint 和第三方 key。 |
| QVeris 数据底座 | Company brief：`ref_company_profile`、`mkt_l1_rt`、`fundamentals_derived_ratios`、`news_fin_tagged`；earnings monitor：`event_calendar_earnings`、`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call`；screener：`ref_security_master`、`fundamentals_derived_ratios`、`mkt_bars_adjusted`、`analytics_tech_indicators`、`sentiment_text_signals`；portfolio risk：`mkt_bars_adjusted`、`risk_beta_vol`、`index_levels`；macro/options：`macro_indicators`、`macro_actual_vs_forecast`、`rates_policy`、`fx_spot`、`opt_chain`、`opt_greeks_iv`。 |
| 安全风险 | API key 管理、调用成本、数据许可和供应商绑定风险。 |
| 测试情况 | 未在本轮完整核验 tests/fixtures；需检查是否有样例输出和工具 mock。 |
| QVeris 改造方式 | 不再保留 EODHD endpoint 映射层，直接把 company brief、screener、portfolio risk、earnings monitor、macro dashboard 的数据调用改为 `qveris_finance.*`；保留指标体系并补 schema、budget、`dry_run` 和 `qveris_trace`。 |
| 优先级 | P0 |

## 4. Finance Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Finance Skills |
| GitHub URL | https://github.com/himself65/finance-skills |
| License | MIT |
| 最近活跃 | 2026-06-14 |
| 候选能力 | 可沉淀为 `qveris-financial-sentiment`、`qveris-company-valuation`、`qveris-earnings-recap`、`qveris-stock-liquidity`、`qveris-correlation-analysis`。金融价值在于把情绪、估值、流动性、相关性和财报回顾拆成标准因子。 |
| 直接可用性 | 需改造。任务定义有价值，外部数据源和依赖安装方式需重整。 |
| 核心代码 | `plugins/data-providers/skills/finance-sentiment/SKILL.md`；`plugins/market-analysis/skills/company-valuation/SKILL.md`；相关 earnings、correlation、liquidity skill。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 yfinance、Adanos/Funda、动态安装数据包和第三方 API key。 |
| QVeris 数据底座 | 情绪：`news_fin_tagged`、`news_dedup_cluster`、`sentiment_text_signals`；估值：`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`fundamentals_derived_ratios`、`mkt_l1_rt`、`estimates_consensus`；财报：`event_calendar_earnings`、`earnings_actual_surprise`、`transcripts_earnings_call`；相关性/流动性：`mkt_bars_adjusted`、`risk_beta_vol`、`mkt_breadth_internals`。 |
| 安全风险 | API key、供应商可用性、情绪因子误解释为收益预测。 |
| 测试情况 | 未在本轮完整核验 tests/fixtures；引入前需补 mock data 和指标断言。 |
| QVeris 改造方式 | 将 sentiment、valuation、earnings、liquidity、correlation 改成标准因子输出；每个因子必须带来源、置信度、缺失字段、风险提示和 `qveris_trace`。 |
| 优先级 | P0 |

## 5. InvestSkill

| 字段 | 内容 |
|---|---|
| 仓库 | InvestSkill |
| GitHub URL | https://github.com/yennanliu/InvestSkill |
| License | MIT |
| 最近活跃 | 2026-07-05 |
| 候选能力 | 可沉淀为 `qveris-10k-digest`、`qveris-bear-case`、`qveris-catalyst-calendar`、`qveris-competitor-analysis`、`qveris-dcf-valuation`、`qveris-earnings-call-analysis`。金融价值在于 US stock research taxonomy 很完整。 |
| 直接可用性 | 需改造。skill 目录和场景很有价值，但部分 skill 标注合并/弃用，需清理。 |
| 核心代码 | `plugins/us-stock-analysis/skills/10k-digest/SKILL.md`；`plugins/us-stock-analysis/skills/dcf-valuation/SKILL.md`；相关 catalyst、competitor、earnings call skill。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 SEC 网页抓取、外部电话会文本源和第三方估值数据源。 |
| QVeris 数据底座 | 10-K/披露：`filings_regulatory_metadata`、`filings_regulatory_raw`、`filings_structured_xbrl`；红旗/熊案：`fundamentals_derived_ratios`、`news_fin_tagged`、`ownership_insider_trades`；催化剂：`event_calendar_corp`、`event_calendar_earnings`、`event_calendar_ipo`、`news_fin_realtime`；竞品/估值/电话会：`ref_classification_industry`、`ref_classification_theme`、`research_analyst_reports`、`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`estimates_consensus`、`rates_govt_benchmark`、`transcripts_earnings_call`。 |
| 安全风险 | DCF/目标价表达需收敛；必须强制引用 filing 原文和数据来源。 |
| 测试情况 | 本轮观察到测试和 fixtures 偏弱；引入前需补 fixture、schema 和 gold output。 |
| QVeris 改造方式 | 保留 US stock research taxonomy，重写为 QVeris filing/news/market workflows；所有 filing 摘要和红旗判断必须逐条证据化，输出 evidence-first 结构。 |
| 优先级 | P0 |

## 6. Tech Earnings Deepdive

| 字段 | 内容 |
|---|---|
| 仓库 | Tech Earnings Deepdive |
| GitHub URL | https://github.com/webleon/tech-earnings-deepdive-openclaw-skill |
| License | MIT |
| 最近活跃 | 2026-03-24 |
| 候选能力 | 可沉淀为 `qveris-tech-earnings-deepdive`。金融价值在于科技股财报深度 memo、多视角分析、估值、管理层、竞争格局和风险拆解。 |
| 直接可用性 | 需改造。适合借鉴报告框架，不适合照搬主观判断语气。 |
| 核心代码 | `tech-earnings-deepdive/SKILL.md`；相关上游参考 `https://github.com/star23/Day1Global-Skills`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；原财报、电话会、新闻、估值和竞争数据源全部切到 QVeris。 |
| QVeris 数据底座 | 财报深挖：`earnings_actual_surprise`、`fundamentals_segment`、`estimates_consensus`、`transcripts_earnings_call`、`news_fin_tagged`；竞争/护城河：`ref_classification_theme`、`research_analyst_reports`、`alt_patents`、`alt_job_postings`、`alt_supply_chain`；估值/反应：`mkt_l1_rt`、`mkt_bars_intraday`、`mkt_after_hours`、`fundamentals_derived_ratios`。 |
| 安全风险 | 容易过度接近投资建议；必须改成证据、情景和不确定性分析，不输出买卖指令。 |
| 测试情况 | 未发现完整 tests/fixtures；引入前需补标准样例。 |
| QVeris 改造方式 | 改成 evidence-first tech earnings report；字段包括 thesis、evidence、contrary evidence、风险、缺失数据和下一步验证，禁止输出 position decision。 |
| 优先级 | P0/P1 |

## 7. Day1Global Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Day1Global Skills |
| GitHub URL | https://github.com/star23/Day1Global-Skills |
| License | MIT |
| 最近活跃 | 2026-04-15 |
| 候选能力 | 作为 Tech Earnings Deepdive 的上游/相关参考，可沉淀科技股 earnings、投资 memo、全球市场研究模板。 |
| 直接可用性 | 仅可参考。更适合作为上游来源和模板对照，不建议整体引入。 |
| 核心代码 | 需针对具体 skill 子目录复核；本轮主要作为上游来源保留链接。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；不搬上游代码，只吸收报告模板和问题清单。 |
| QVeris 数据底座 | 全球/科技投资 memo：`ref_security_master`、`ref_company_profile`、`mkt_l1_rt`、`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`estimates_consensus`、`news_fin_tagged`、`research_analyst_reports`；行业/地区背景：`ref_classification_industry`、`index_metadata`、`index_levels`、`macro_indicators`、`fx_spot`。 |
| 安全风险 | 同类 earnings deep dive 风险：主观判断、投资建议边界、引用不足。 |
| 测试情况 | 未在本轮完整核验。 |
| QVeris 改造方式 | 只抽取报告结构和评审问题，按 QVeris 重新定义数据输入、证据引用、缺失字段和合规边界；不引入原执行链路。 |
| 优先级 | P1 |

## 8. Earnings Tracker

| 字段 | 内容 |
|---|---|
| 仓库 | Earnings Tracker |
| GitHub URL | https://github.com/Indomi/earnings-tracker |
| License | MIT |
| 最近活跃 | 2026-03-18 |
| 候选能力 | 可沉淀为 `qveris-earnings-tracker`、`qveris-earnings-calendar`、`qveris-earnings-recap`。金融价值在于 US/HK/CN 财报日历、watchlist、行业筛选和财报摘要。 |
| 直接可用性 | 需改造。窄场景清晰，适合试点，但数据 adapter 和配置方式需替换。 |
| 核心代码 | `SKILL.md`；`scripts/core.js`；`scripts/core-v2.js`；`scripts/data-source-factory.js`；`scripts/data-sources/fmp.js`；`scripts/data-sources/yahoo.js`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 FMP、Alpha Vantage、Yahoo、Polygon、Sina、WebSearch adapters。Feishu 等推送只作为外层通知能力，不进入金融数据底座。 |
| QVeris 数据底座 | 财报日历：`event_calendar_earnings`；财报回顾：`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call`、`news_fin_realtime`；watchlist/行业过滤：`ref_security_master`、`ref_classification_industry`、`ref_classification_theme`；价格反应：`mkt_l1_rt`、`mkt_bars_intraday`、`mkt_after_hours`。 |
| 安全风险 | API key/config 风险；推送渠道可能涉及敏感 watchlist。 |
| 测试情况 | 未发现明确 tests；有 mock data source，但需补正式 fixtures。 |
| QVeris 改造方式 | 把 data-source-factory 重写成 QVeris adapter；保留 US/HK/CN watchlist、行业过滤、calendar 和 recap 输出，所有推送内容必须附 `as_of` 与 `qveris_trace`。 |
| 优先级 | P0 |

## 9. HHXG Market

| 字段 | 内容 |
|---|---|
| 仓库 | HHXG Market |
| GitHub URL | https://github.com/Niceck/hhxg-top-hhxg-python |
| License | MIT |
| 最近活跃 | 2026-06-20 |
| 候选能力 | 可沉淀为 `qveris-a-share-market-snapshot`、`qveris-a-share-calendar`、`qveris-margin-financing-watch`、`qveris-a-share-news-flash`。金融价值在于 A 股盘后快照、交易日历、融资融券和实时快讯。 |
| 直接可用性 | 需改造。输出形态简洁，适合作为 A 股 skill skeleton。 |
| 核心代码 | `SKILL.md`；`scripts/fetch_snapshot.py`；`scripts/calendar.py`；`scripts/margin.py`；`scripts/news.py`；`scripts/_common.py`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 A 股第三方行情、快讯和融资融券接口。 |
| QVeris 数据底座 | A 股快照：`mkt_l1_rt`、`mkt_breadth_internals`、`mkt_top_movers`、`index_levels`；交易日历：`ref_exchange_calendar`；融资融券：`mkt_margin`；快讯/新闻：`news_fin_realtime`、`news_fin_tagged`；题材/概念：`mkt_cn_concept`、`ref_classification_theme`；资金/龙虎榜：`flow_dragon_tiger`、`flow_northbound`、`flow_sector_capital`、`flow_large_order`。 |
| 安全风险 | 数据源授权、稳定性、口径一致性；快讯可能包含未经确认信息。 |
| 测试情况 | 未发现明确 tests；有脚本入口和 JSON 输出线索。 |
| QVeris 改造方式 | 做成 `qveris-a-share-market-snapshot` scaffold；保留 JSON + markdown 输出，所有 A 股口径来自 QVeris A 股专项能力，快讯必须标注确认状态和来源时间。 |
| 优先级 | P0 |

## 10. Tradermonty Trading Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Tradermonty Trading Skills |
| GitHub URL | https://github.com/tradermonty/claude-trading-skills |
| License | MIT |
| 最近活跃 | 2026-07-06 |
| 候选能力 | 可沉淀为 `qveris-portfolio-risk-review`、`qveris-market-regime-analysis`、`qveris-sector-rotation-map`、`qveris-data-quality-checker`、`qveris-earnings-calendar`。金融价值在风险复盘、市场环境、行业轮动和数据质量检查。 |
| 直接可用性 | 需改造。偏 trading 的部分不能直接引入，研究/风控框架可复用。 |
| 核心代码 | `examples/weekly-trade-strategy/skills/*/SKILL.md`；`examples/daily-market-dashboard/agent/*`；`scripts/run_all_tests.sh`。 |
| 外部依赖 | 改造后仅保留 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；废弃 FMP、Alpaca、FinViz 和任何交易执行/账户权限。 |
| QVeris 数据底座 | 组合风险：用户持仓 + `mkt_bars_adjusted`、`risk_beta_vol`、`index_levels`、`ownership_institutional`、`news_fin_tagged`；市场状态：`index_levels`、`index_vix`、`mkt_breadth_internals`、`macro_actual_vs_forecast`、`rates_govt_benchmark`；行业轮动：`ref_classification_industry`、`flow_sector_capital`、`mkt_top_movers`、`index_constituents`；财报日历：`event_calendar_earnings`。 |
| 安全风险 | 交易流程和 trade prep 表达需弱化；避免输出买卖点或调仓指令。 |
| 测试情况 | 有 `examples/daily-market-dashboard/tests/*` 和 `scripts/run_all_tests.sh`，测试信号较好。 |
| QVeris 改造方式 | 抽取 risk/regime/sector/data-quality 工作流，改成研究和风控辅助输出；删除 trade prep/action 语义，数据质量检查统一校验 QVeris payload 的 `as_of`、`missing_fields`、`fallback_used` 和 staleness。 |
| 优先级 | P1 |

## 11. Financial Analyst Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Financial Analyst Skills |
| GitHub URL | https://github.com/Ruinius/financial-analyst-skills |
| License | MIT |
| 最近活跃 | 2026-06-08 |
| 候选能力 | 可沉淀为 `qveris-financial-document-extraction`、`qveris-financial-calculations`、`qveris-financial-modeling`、`qveris-model-json-generator`。金融价值在财务文档抽取、指标计算、DCF 和结构化 JSON。 |
| 直接可用性 | 需改造。文档处理链条有价值，但本地模型/PDF pipeline 较重。 |
| 核心代码 | `skills/financial_data_extraction/SKILL.md`；`skills/financial_calculations/SKILL.md`；`skills/financial_modeling/SKILL.md`；`skills/model_json_generator/SKILL.md`；各 skill 下 `scripts/*.py`。 |
| 外部依赖 | 改造后优先仅依赖 `QVERIS_API_KEY` 与 `qveris_finance.*` CAP 工具；本地 PDF/document parsing 降级为用户文件 fallback，不作为默认数据底座。 |
| QVeris 数据底座 | 文档/披露：`filings_regulatory_metadata`、`filings_regulatory_raw`、`filings_structured_xbrl`；财务抽取：`fundamentals_is`、`fundamentals_bs`、`fundamentals_cf`、`fundamentals_segment`；指标计算：`fundamentals_derived_ratios`、`mkt_l1_rt`、`mkt_bars_adjusted`；建模：`estimates_consensus`、`rates_govt_benchmark`、`fx_spot`；输出：trace-backed JSON。 |
| 安全风险 | 上传财报/内部文档可能涉及隐私；模型抽取结果需要证据定位和校验。 |
| 测试情况 | 未发现明确 tests；有 scripts，但需补 fixtures 和抽取准确性测试。 |
| QVeris 改造方式 | 优先使用 QVeris filings + structured fundamentals 代替本地抽取链路；保留 JSON viewer、财务计算和建模输出结构，但每个字段必须有来源、期间、缺失说明和 `qveris_trace`。 |
| 优先级 | P1 |

## 12. AkShare Skill

| 字段 | 内容 |
|---|---|
| 仓库 | AkShare Skill |
| GitHub URL | https://github.com/cloudzun/akshare-skill |
| License | Unknown |
| 最近活跃 | 2026-03-27 |
| 候选能力 | 可沉淀为 `qveris-a-share-financial-analysis`、`qveris-a-share-data-acquisition`、`qveris-a-share-valuation`、`qveris-china-macro-data`。金融价值在 A 股指标体系、多源数据获取和基础面分析。 |
| 直接可用性 | 仅可参考，法律确认前不引入代码。 |
| 核心代码 | `phase-*/complete*/financial-analysis-skill/SKILL.md`；`phase-6/complete-code/financial-analysis-plugin/skills/data-acquisition/SKILL.md`；`scripts/fetch_stock.py`；`scripts/fetch_financial.py`；`scripts/data_validator.py`。 |
| 外部依赖 | AkShare、A 股行情/财务/宏观数据、Python 依赖。 |
| 安全风险 | License unknown；数据源授权和稳定性需确认。 |
| 测试情况 | 未发现标准 tests；课程式目录可能有 mock/example，但需复核。 |
| QVeris 改造方式 | 只参考 A 股指标和数据覆盖，用 QVeris 中国市场数据替换 AkShare 调用。 |
| 优先级 | P1 |

## 13. Snowball CLI

| 字段 | 内容 |
|---|---|
| 仓库 | Snowball CLI |
| GitHub URL | https://github.com/baixianger/snowball-cli |
| License | Unknown；README 声称 MIT，需法律复核 |
| 最近活跃 | 2026-04-03 |
| 候选能力 | 可沉淀为 `qveris-cn-market-social-sentiment`、`qveris-snowball-style-market-feed`、`qveris-cn-stock-profile`。金融价值在雪球行情、财报、资金流、KOL、热帖、基金等中文市场数据覆盖。 |
| 直接可用性 | 仅可参考。数据覆盖值得看，抓取和登录方式不建议引入。 |
| 核心代码 | `SKILL.md`；`cli.ts`；`cli.js`；`index.ts`；`lib/api.ts`；`lib/auth.ts`；`lib/qr-terminal.ts`。 |
| 外部依赖 | 雪球站点/API、登录态、QR/auth、Node/TypeScript。 |
| 安全风险 | 登录、cookie、个人账号、token、平台条款和隐私风险较高。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只保留数据需求和 JSON 命令面，用 QVeris 合规数据源替换雪球抓取。 |
| 优先级 | P1 |

## 14. Xueqiu Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Xueqiu Skills |
| GitHub URL | https://github.com/CNife/xueqiu-skills |
| License | Apache-2.0 |
| 最近活跃 | 2026-03-06；仓库已 archived |
| 候选能力 | 可沉淀为 `qveris-cn-social-timeline-sentiment`。金融价值在雪球 timeline、KOL/社媒情绪和中文市场关注度信号。 |
| 直接可用性 | 仅可参考。仓库已归档，且 auth/session 风险明显。 |
| 核心代码 | `skills/crawl-xueqiu-my-timeline/SKILL.md`；`scripts/crawl_xueqiu_home_timeline_api.py`；`scripts/check-agent-browser.sh`；`scripts/check-cdp.sh`。 |
| 外部依赖 | 雪球、浏览器/CDP、登录态/session。 |
| 安全风险 | auth/session、cookie、浏览器自动化和平台条款风险高。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 不引入抓取实现，只把“社媒时间线情绪/关注度”作为 QVeris 合规数据产品需求。 |
| 优先级 | P1/仅参考 |

## 15. LLMQuant Skills

| 字段 | 内容 |
|---|---|
| 仓库 | LLMQuant Skills |
| GitHub URL | https://github.com/LLMQuant/skills |
| License | MIT |
| 最近活跃 | 2026-05-30 |
| 候选能力 | 可沉淀为 `qveris-market-intelligence`、`qveris-macro-monitor`、`qveris-equities-research`、`qveris-options-analysis`、`qveris-credit-monitor`。金融价值在宏观、股票、ETF、信用、衍生品、事件和投资者视角 taxonomy。 |
| 直接可用性 | 需改造/二次评估。taxonomy 有价值，但需要逐项审查安全和执行链路。 |
| 核心代码 | `skills/llmquant-market-intelligence/SKILL.md`；`skills/llmquant-macro/SKILL.md`；`skills/llmquant-equities/SKILL.md`；`skills/llmquant-options/SKILL.md`；`skills/llmquant-credit/SKILL.md`。 |
| 外部依赖 | 多类金融数据 API、市场数据、宏观/信用/衍生品数据。 |
| 安全风险 | 覆盖面广，容易引入过宽权限和未定义数据源；options/derivatives 需合规边界。 |
| 测试情况 | 未发现明确 tests；scripts 目录多为空占位。 |
| QVeris 改造方式 | 先选择 1-2 个子方向试点，例如 macro 或 market intelligence，再统一 QVeris 数据源、schema 和 trace。 |
| 优先级 | P1 |

## 16. Marian Trading Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Marian Trading Skills |
| GitHub URL | https://github.com/marian2js/trading-skills |
| License | MIT |
| 最近活跃 | 2026-03-16 |
| 候选能力 | 可沉淀为 `qveris-market-regime-analysis`、`qveris-earnings-preview`、`qveris-thesis-validation`、`qveris-post-trade-review`。金融价值在风险复盘、市场状态、催化剂地图和 thesis validation。 |
| 直接可用性 | 仅可参考/需改造。偏交易 workflow，不适合直接引入交易表达。 |
| 核心代码 | `skills/market-context/market-regime-analysis/SKILL.md`；`skills/market-context/earnings-preview/SKILL.md`；`skills/thesis-validation/*/SKILL.md`；`scripts/build_catalog.py`；`scripts/validate_repo.py`。 |
| 外部依赖 | 市场数据、财报日历、宏观事件、交易日志或组合信息。 |
| 安全风险 | live-trade、execution-plan 等模块合规风险高；需去掉交易指令。 |
| 测试情况 | 未发现明确 tests；有 validate 脚本。 |
| QVeris 改造方式 | 提取 thesis validation、evidence gap 和 market regime，改成研究辅助和风险复盘输出。 |
| 优先级 | P1 |

## 17. Bigdata Financial Research Analyst

| 字段 | 内容 |
|---|---|
| 仓库 | Bigdata Financial Research Analyst |
| GitHub URL | https://github.com/Bigdata-com/skills-financial-research-analyst |
| License | NOASSERTION |
| 最近活跃 | 2026-05-08 |
| 候选能力 | 可沉淀为 `qveris-financial-research-analyst`、`qveris-dcf-model`、`qveris-peer-comparables`、`qveris-earnings-quality`、`qveris-reverse-dcf`。金融价值在研究分析、DCF、同行比较和 earnings quality。 |
| 直接可用性 | 仅可参考，license 未明确前不引入代码。 |
| 核心代码 | `bigdata-financial-research-analyst/SKILL.md`；`scripts/dcf_model.py`；`scripts/peer_comparables.py`；`scripts/earnings_quality.py`；`scripts/reverse_dcf.py`；`scripts/scenario_probability.py`。 |
| 外部依赖 | 公司财务、估值、同行、盈利质量和情景概率数据。 |
| 安全风险 | License unclear；研究结论和估值输出需合规边界。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只参考模型模块名称和输出结构；代码引入需先走法律确认。 |
| 优先级 | P1 |

## 18. Finance Alerts Skill

| 字段 | 内容 |
|---|---|
| 仓库 | Finance Alerts Skill |
| GitHub URL | https://github.com/jmkim-ntels/finance-alerts-skill |
| License | Unknown |
| 最近活跃 | 2026-03-28 |
| 候选能力 | 可沉淀为 `qveris-market-alerts`、`qveris-kr-market-alerts`。金融价值在韩国汇率/股价 dashboard 和 alert scripts。 |
| 直接可用性 | 仅可参考。场景窄，且 license 不明。 |
| 核心代码 | `SKILL.md`；`scripts/check_alerts.py`；`scripts/dashboard.py`；`scripts/get_exchange_rate.py`；`scripts/get_stock_price.py`；`scripts/setup_alerts.py`。 |
| 外部依赖 | 汇率 API、股票价格 API、dashboard/alert 运行环境。 |
| 安全风险 | License unknown；告警阈值可能被误用为交易信号。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 若 QVeris 覆盖 KR market，可用 QVeris price/fx data 替换脚本数据源，输出改为监控和解释，不给交易建议。 |
| 优先级 | P1/P2 |

## 19. National Team Position

| 字段 | 内容 |
|---|---|
| 仓库 | National Team Position |
| GitHub URL | https://github.com/Xiaoyuan-Liu/national-team-position |
| License | MIT |
| 最近活跃 | 2026-05-29 |
| 候选能力 | 可沉淀为 `qveris-a-share-national-team-position`。金融价值在用宽基 ETF 份额变化估计中央汇金/国家队持仓趋势，作为 A 股市场稳定因子。 |
| 直接可用性 | 需改造。专题价值明确，但场景很窄。 |
| 核心代码 | `SKILL.md`；`scripts/national_team_position.py`；`scripts/requirements.txt`。 |
| 外部依赖 | AkShare、ETF 份额、A 股宽基 ETF 数据。 |
| 安全风险 | 指标解释需谨慎，不能把估计值当成官方持仓事实。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 用 QVeris 获取 ETF 份额和市场数据，输出趋势、置信度、估算方法和局限性。 |
| 优先级 | P1 |

## 20. Valuation Calculator

| 字段 | 内容 |
|---|---|
| 仓库 | Valuation Calculator |
| GitHub URL | https://github.com/arbiger/valuation-calculator |
| License | NOASSERTION |
| 最近活跃 | 2026-03-24 |
| 候选能力 | 可沉淀为 `qveris-valuation-calculator` 的公式参考。金融价值在估值公式和命令面。 |
| 直接可用性 | 仅可参考。实现过轻，license 未明确。 |
| 核心代码 | `SKILL.md`；`valuation.py`。 |
| 外部依赖 | 估值输入数据，可能无复杂外部依赖。 |
| 安全风险 | 估值结果容易被误认为目标价；license unclear。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只吸收公式和输入输出字段，把数据获取、假设、敏感性和引用交给 QVeris workflow。 |
| 优先级 | P2 |

## 21. Financial Red Flag Auditor

| 字段 | 内容 |
|---|---|
| 仓库 | Financial Red Flag Auditor |
| GitHub URL | https://github.com/noahnan-max/financial-red-flag-auditor-skill |
| License | MIT |
| 最近活跃 | 2026-06-23 |
| 候选能力 | 可沉淀为 `qveris-financial-red-flag-auditor`、`qveris-10k-red-flag-digest`。金融价值在年报排雷、财务质量、收入确认、现金流、商誉、存货和应收等风险标签。 |
| 直接可用性 | 仅可参考/需改造。方向很有价值，但 runner/schema 不足。 |
| 核心代码 | `SKILL.md`。 |
| 外部依赖 | 年报/10-K、财务报表、附注、审计意见、行业数据。 |
| 安全风险 | 红旗评分可能被误用为投资结论；必须逐项引用证据，缺失数据不得补估。 |
| 测试情况 | 未发现明确 tests/fixtures。 |
| QVeris 改造方式 | 把红旗指标拆成结构化标签、证据引用、严重性、置信度和缺失数据字段。 |
| 优先级 | P2；但指标值得吸收进 P0 的 `qveris-10k-red-flag-digest` |

## 22. Money Atlas

| 字段 | 内容 |
|---|---|
| 仓库 | Money Atlas |
| GitHub URL | https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent |
| License | NOASSERTION |
| 最近活跃 | 2026-04-14 |
| 候选能力 | 可参考宏观、组合、风险、情绪、多 agent 金融分析 persona。 |
| 直接可用性 | 仅可参考。更像 agent/persona 框架，不是明确金融 skill。 |
| 核心代码 | `skill.md`；`agents/macro_agent.py`；`agents/portfolio_agent.py`；`agents/risk_agent.py`；`agents/sentiment_agent.py`；`agents/orchestrator.py`；`adapter.py`。 |
| 外部依赖 | 视 adapter 而定，可能涉及市场、宏观、组合和情绪数据。 |
| 安全风险 | License unclear；多 agent 输出容易缺少证据和边界。 |
| 测试情况 | 有 `backtest/backtest_engine.py`，但不是完整 skill tests。 |
| QVeris 改造方式 | 不引入代码，只参考 agent 分工和风险/宏观/情绪分类。 |
| 优先级 | P2 |

## 23. GMGN Skills

| 字段 | 内容 |
|---|---|
| 仓库 | GMGN Skills |
| GitHub URL | https://github.com/GMGNAI/gmgn-skills |
| License | MIT |
| 最近活跃 | 2026-07-01 |
| 候选能力 | 可沉淀为 `qveris-crypto-token-market`、`qveris-crypto-portfolio`、`qveris-token-tracking`，前提是 QVeris 覆盖 crypto/meme token。 |
| 直接可用性 | 仅可参考。不是当前传统金融主线。 |
| 核心代码 | `skills/gmgn-market/SKILL.md`；`skills/gmgn-portfolio/SKILL.md`；`skills/gmgn-token/SKILL.md`；`src/client/OpenApiClient.ts`；`src/commands/*`。 |
| 外部依赖 | GMGN API、crypto/token market data、wallet/portfolio data。 |
| 安全风险 | crypto、wallet、交易/swap 相关风险高；需避免任何自动交易或钱包权限。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只有在产品确认 crypto coverage 后，抽取 market/token/portfolio 只读分析能力。 |
| 优先级 | P2/暂不投入 |

## 24. Stock Analysis

| 字段 | 内容 |
|---|---|
| 仓库 | Stock Analysis |
| GitHub URL | https://github.com/moinsen-dev/stock-analysis |
| License | Unknown；仓库已 archived |
| 最近活跃 | 2026-02-03 |
| 候选能力 | 可参考 `qveris-stock-analysis`、`qveris-hot-scanner`、`qveris-rumor-scanner`、`qveris-portfolio-watchlist`。 |
| 直接可用性 | 仅可参考。license unknown 且仓库已归档。 |
| 核心代码 | `SKILL.md`；`scripts/analyze_stock.py`；`scripts/hot_scanner.py`；`scripts/rumor_scanner.py`；`scripts/portfolio.py`；`scripts/watchlist.py`。 |
| 外部依赖 | 股票数据、传闻/新闻源、组合/watchlist 数据。 |
| 安全风险 | rumor scanner 容易放大未确认信息；license unclear。 |
| 测试情况 | 有 `scripts/test_stock_analysis.py`。 |
| QVeris 改造方式 | 可参考脚本边界，但需重建数据源、证据标注和谣言/未确认信息处理规则。 |
| 优先级 | P2 |

## 25. Canadian Finance Planner

| 字段 | 内容 |
|---|---|
| 仓库 | Canadian Finance Planner |
| GitHub URL | https://github.com/cjpatten/canadian-finance-planner-skill |
| License | MIT |
| 最近活跃 | 2026-03-15 |
| 候选能力 | 可沉淀为加拿大个人财务规划 skill，例如税务、退休、预算、储蓄计划。 |
| 直接可用性 | 仅可参考。偏个人财务规划，不属于当前金融市场数据/投研主线。 |
| 核心代码 | `SKILL.md`。 |
| 外部依赖 | 加拿大税务/养老金/个人财务规则，可能需要最新法规数据。 |
| 安全风险 | 个人财务建议、税务建议和地区法规高风险。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 当前不建议改造；若未来做个人理财，需要独立合规框架。 |
| 优先级 | P2/暂不投入 |

## 26. Indian Stock Analyst

| 字段 | 内容 |
|---|---|
| 仓库 | Indian Stock Analyst |
| GitHub URL | https://github.com/jitu2611/indian-stock-analyst |
| License | Unknown |
| 最近活跃 | 2026-03-18 |
| 候选能力 | 可参考印度股票研究 skill，例如公司分析、市场概览、区域市场数据。 |
| 直接可用性 | 仅可参考。缺 license、runner 和 tests。 |
| 核心代码 | `SKILL.md`。 |
| 外部依赖 | 印度市场行情、财报和新闻数据。 |
| 安全风险 | License unknown；区域市场数据源和投资建议边界需确认。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只有在 QVeris 明确覆盖印度市场时，再以合规数据源重建。 |
| 优先级 | P2/暂不投入 |

## 27. OpenClaw Master Skills

| 字段 | 内容 |
|---|---|
| 仓库 | OpenClaw Master Skills |
| GitHub URL | https://github.com/LeoYeAI/openclaw-master-skills |
| License | MIT |
| 最近活跃 | 2026-06-29 |
| 候选能力 | 作为发现源，可继续挖 Eastmoney、Tushare、Yahoo Finance、TickDB、market-signal-fusion 等金融单项 skill。 |
| 直接可用性 | 仅可参考。巨型聚合库，不建议整体引入。 |
| 核心代码 | `skills/*/SKILL.md`；需按单项 skill 继续筛。 |
| 外部依赖 | 取决于具体子 skill，覆盖面很广。 |
| 安全风险 | 聚合库噪音和重复多；单项 license、安全、依赖需逐个核验。 |
| 测试情况 | 仓库内存在部分 `tests/*`，但不能代表金融子 skill 已测试。 |
| QVeris 改造方式 | 只作为继续发现源，单项金融 skill 需另开评估卡。 |
| 优先级 | Index/暂不投入 |

## 28. Claude Skill Registry

| 字段 | 内容 |
|---|---|
| 仓库 | Claude Skill Registry |
| GitHub URL | https://github.com/majiayu000/claude-skill-registry |
| License | MIT |
| 最近活跃 | 2026-07-05 |
| 候选能力 | 作为 skill 索引，可继续发现金融、投研、数据分析相关 skill。 |
| 直接可用性 | 仅可参考。registry 不是单个候选实现。 |
| 核心代码 | `skills/*/*/SKILL.md`；`crawler/*`；`scripts/*`。 |
| 外部依赖 | 取决于被索引 skill。 |
| 安全风险 | 索引内容来源复杂，不能整体信任。 |
| 测试情况 | 有 `scripts/test_discovery.py`，但与金融 skill 可用性无直接关系。 |
| QVeris 改造方式 | 仅用于继续搜索候选；每个候选另行评估。 |
| 优先级 | Index/暂不投入 |

## 29. Awesome Agent Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Awesome Agent Skills |
| GitHub URL | https://github.com/VoltAgent/awesome-agent-skills |
| License | MIT |
| 最近活跃 | 2026-06-30 |
| 候选能力 | 作为 awesome list，可继续发现 agent skill；不代表金融能力本身。 |
| 直接可用性 | 仅可参考。索引，不是实现。 |
| 核心代码 | README/索引清单；本轮未抓取到可直接评估的金融 skill 入口。 |
| 外部依赖 | 取决于索引指向的外部仓库。 |
| 安全风险 | 索引项质量差异大，需要逐个核验 license、依赖和安全。 |
| 测试情况 | 不适用。 |
| QVeris 改造方式 | 作为发现入口，不直接改造。 |
| 优先级 | Index/暂不投入 |

## 评审使用建议

金融同学评审时建议只给每张卡一个结论：

| 结论 | 含义 |
|---|---|
| 引入 | 金融场景真实、输出有用、值得做成 QVeris skill |
| 试点 | 方向有价值，但字段、数据源或合规边界还要收敛 |
| 仅参考 | 思路有用，但不值得直接引入仓库或代码 |
| 不引入 | 金融价值弱、风险高或不在当前产品范围 |

建议第一轮优先评审：`qveris-earnings-analysis`、`qveris-a-share-market-snapshot`、`qveris-10k-red-flag-digest`。
