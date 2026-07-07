# 金融领域第三方 Skill 候选评估报告（专家评估版）

日期：2026-07-06
用途：供金融专家、产品负责人、合规/数据负责人评估哪些 GitHub 金融 skill 值得改造成 QVeris/Open Skills。

## 1. 评估结论

本轮按“工程化可落地 + 金融场景价值 + QVeris 可替代数据源”的标准，扫描并初评 38 个 GitHub 仓库。

核心结论：

1. 真正可直接引入的金融 skill 很少，多数仍需重构数据获取层、输出 schema、测试和合规声明。
2. 最高价值方向不是“预测股价”，而是 earnings analysis、财报/10-K 摘要、DCF/comps、A 股市场快照、金融情绪/资讯因子、因子筛选。
3. 对 QVeris 最有价值的候选通常具备两类资产：
   - 金融分析流程和输出模板成熟，例如 earnings update、DCF、comps、10-K digest。
   - 数据获取工具明确，例如 EODHD、Snowball、AkShare、FMP/Yahoo adapters，可被 QVeris Discover / Inspect / Execute 替换。
4. 不建议直接搬运任何包含登录态、cookie、浏览器自动化、明文 API key 配置、交易建议或“买卖点”承诺的实现。

建议优先落地 5 个 QVeris skill：

| 优先级 | 建议 Skill | 金融价值 | 主要参考来源 |
|---|---|---|---|
| P0 | `qveris-earnings-analysis` | 财报发布后快速解读，覆盖 beat/miss、指引、估值影响、风险变化 | Anthropic financial-services, LangAlpha, EODHD, earnings-tracker |
| P0 | `qveris-a-share-market-snapshot` | A 股盘后快照、日历、资金、题材、融资融券和实时快讯 | hhxg-top-hhxg-python, AkShare skill, Snowball CLI |
| P0 | `qveris-financial-sentiment` | 新闻、社媒、KOL、研报的情绪和影响方向因子 | finance-skills, Snowball/Xueqiu skills, market-signal-fusion |
| P1 | `qveris-10k-red-flag-digest` | 年报/10-K 摘要、财报排雷、财务质量评分 | InvestSkill, financial-red-flag-auditor, financial-analyst-skills |
| P1 | `qveris-factor-screen` | 估值、质量、动量、流动性、新闻风险等多因子候选池 | EODHD screener, InvestSkill, AkShare, Tradermonty |

## 2. 专家评估口径

本报告不判断某仓库的投资观点是否正确，而是判断它是否值得作为 QVeris/Open Skills 的候选资产。

评分维度：

| 维度 | 专家关注点 |
|---|---|
| 金融场景清晰度 | 输入、输出、目标用户、使用场景是否明确 |
| 数据可信度 | 数据源是否清楚、是否能被 QVeris 工具体系替代、是否能追溯 |
| 分析方法质量 | earnings、DCF、comps、风险、情绪、因子等框架是否符合专业工作流 |
| 工程化程度 | 是否有 `SKILL.md`、runner/scripts、tests/fixtures/examples、schema/JSON |
| 合规/安全风险 | 是否包含投资建议承诺、交易信号包装、cookie/token/API key 风险 |
| 改造成本 | 是否可以低成本替换数据源、增加 trace/schema/tests 后上线 |

推荐解释：

| 等级 | 含义 |
|---|---|
| P0 | 建议进入候选池，值得做 skeleton/scaffold 或专项设计 |
| P1 | 值得专家进一步评审，适合借鉴部分流程或输出结构 |
| P2 | 仅作参考，不建议近期投入工程改造 |
| Index | 只作为搜索/发现源，不作为单个候选引入 |

## 3. P0 候选

### 3.1 Anthropic Financial Services

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/anthropics/financial-services |
| License | Apache-2.0 |
| 最近活跃 | 2026-06-26 |
| 候选能力 | earnings review、DCF、comps、market research、model update、Excel/spreadsheet 输出 |
| 代表性 Skill 链接 | https://github.com/anthropics/financial-services/blob/main/plugins/agent-plugins/earnings-reviewer/skills/earnings-analysis/SKILL.md |
| 代表性 Skill 链接 | https://github.com/anthropics/financial-services/blob/main/plugins/agent-plugins/market-researcher/skills/comps-analysis/SKILL.md |
| 专家评估重点 | 是否适合作为 QVeris 的机构级 earnings/comps/DCF 报告标准；哪些字段必须强制证据化 |
| 主要风险 | 工作流较重，假设有机构级 MCP/数据源；不能照搬其数据源依赖 |
| QVeris 改造方式 | 用 QVeris 获取财报、价格、估值、同行、宏观利率和新闻；保留报告结构、数据注释、Excel/JSON 输出要求 |
| 建议 | P0。优先作为 `qveris-earnings-analysis` 和 `qveris-comps-analysis` 的报告模板来源 |

### 3.2 LangAlpha

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/ginlix-ai/LangAlpha |
| License | Apache-2.0 |
| 最近活跃 | 2026-07-06 |
| 候选能力 | DCF model、earnings analysis、earnings preview、sector overview |
| 代表性 Skill 链接 | https://github.com/ginlix-ai/LangAlpha/blob/main/skills/dcf-model/SKILL.md |
| 代表性 Skill 链接 | https://github.com/ginlix-ai/LangAlpha/blob/main/skills/earnings-analysis/SKILL.md |
| 专家评估重点 | DCF 假设、敏感性分析、财报 post-mortem 的专业口径是否适合 QVeris |
| 主要风险 | 大型应用/平台属性强；部分 skill 派生自 Anthropic financial-services |
| QVeris 改造方式 | 借鉴 skill 定义和 schema，替换 fundamentals/macro MCP 为 QVeris tools |
| 建议 | P0。适合与 Anthropic financial-services 交叉参考，沉淀 QVeris 金融报告标准 |

### 3.3 EODHD Claude Skills

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/EodHistoricalData/eodhd-claude-skills |
| License | MIT |
| 最近活跃 | 2026-07-01 |
| 候选能力 | company brief、earnings monitor、market overview、portfolio risk、stock screener、macro dashboard、options analysis |
| 代表性 Skill 链接 | https://github.com/EodHistoricalData/eodhd-claude-skills/blob/main/skills/stock-screener/SKILL.md |
| 代表性 Skill 链接 | https://github.com/EodHistoricalData/eodhd-claude-skills/blob/main/skills/portfolio-risk/SKILL.md |
| 专家评估重点 | stock screener、portfolio risk、company brief 的指标口径是否专业且可验证 |
| 主要风险 | 绑定 EODHD API/subscription；不可直接照搬数据访问层 |
| QVeris 改造方式 | 保留 workflow 和输出结构；用 QVeris 替换 EODHD endpoint；增加 QVeris trace 和 budget |
| 建议 | P0。工程化最完整，是第三方金融 skill 改造的标杆参考 |

### 3.4 Finance Skills

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/himself65/finance-skills |
| License | MIT |
| 最近活跃 | 2026-06-14 |
| 候选能力 | finance sentiment、company valuation、earnings preview/recap、estimate analysis、stock correlation、stock liquidity |
| 代表性 Skill 链接 | https://github.com/himself65/finance-skills/blob/main/plugins/data-providers/skills/finance-sentiment/SKILL.md |
| 代表性 Skill 链接 | https://github.com/himself65/finance-skills/blob/main/plugins/market-analysis/skills/company-valuation/SKILL.md |
| 专家评估重点 | 情绪因子、估值模型、流动性指标、相关性分析是否适合变成标准化金融因子 |
| 主要风险 | 直连 yfinance/Adanos/Funda；部分说明鼓励临时安装依赖 |
| QVeris 改造方式 | 用 QVeris 统一数据源；保留任务定义、默认参数和输出字段 |
| 建议 | P0。适合拆成 sentiment、earnings recap、liquidity risk、correlation 几个小 skill |

### 3.5 InvestSkill

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/yennanliu/InvestSkill |
| License | MIT |
| 最近活跃 | 2026-07-05 |
| 候选能力 | 10-K digest、bear case、catalyst calendar、competitor analysis、DCF valuation、dividend analysis、earnings call analysis |
| 代表性 Skill 链接 | https://github.com/yennanliu/InvestSkill/blob/main/plugins/us-stock-analysis/skills/10k-digest/SKILL.md |
| 代表性 Skill 链接 | https://github.com/yennanliu/InvestSkill/blob/main/plugins/us-stock-analysis/skills/dcf-valuation/SKILL.md |
| 专家评估重点 | 10-K digest 的章节、引用和关键指标是否足以做投研入口；DCF 默认假设是否需要收紧 |
| 主要风险 | 部分 skill 标注已合并/弃用；测试和 fixtures 较弱 |
| QVeris 改造方式 | 把 skill taxonomy 转成 QVeris workflows；数据从 SEC/filing/news/market tools 获取 |
| 建议 | P0。非常适合做 QVeris US stock research skill taxonomy |

### 3.6 Tech Earnings Deepdive

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/webleon/tech-earnings-deepdive-openclaw-skill |
| 相关上游链接 | https://github.com/star23/Day1Global-Skills |
| License | MIT |
| 最近活跃 | 2026-03 to 2026-04 |
| 候选能力 | 科技股 earnings deep dive、多视角投资 memo、反偏见框架、估值/管理层/竞争格局/position decision |
| 代表性 Skill 链接 | https://github.com/webleon/tech-earnings-deepdive-openclaw-skill/blob/main/tech-earnings-deepdive/SKILL.md |
| 专家评估重点 | 输出是否过度接近投资建议；哪些模块可保留为研究报告，哪些要改成证据/情景分析 |
| 主要风险 | 偏长报告和主观判断；需要强免责声明和 evidence gating |
| QVeris 改造方式 | 改成 evidence-first tech earnings report，输出驱动因素、风险、证据、缺失数据，不输出交易指令 |
| 建议 | P0。适合作为 `qveris-tech-earnings-deepdive` 设计参考 |

### 3.7 Earnings Tracker

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/Indomi/earnings-tracker |
| License | MIT |
| 最近活跃 | 2026-03-19 |
| 候选能力 | US/HK/CN 财报日历、行业筛选、watchlist、财报摘要、Feishu 推送 |
| 代表性 Skill 链接 | https://github.com/Indomi/earnings-tracker/blob/main/SKILL.md |
| 专家评估重点 | 三市场财报日历口径、行业分类、财报发布后摘要字段是否合理 |
| 主要风险 | API key 配置可能写入 config；缺少正式 tests |
| QVeris 改造方式 | 把 FMP/Alpha/Yahoo/Polygon/Sina/WebSearch adapter 统一替换为 QVeris tools |
| 建议 | P0。窄场景、容易改造，适合快速做成 QVeris earnings tracker |

### 3.8 HHXG Market

| 字段 | 内容 |
|---|---|
| 原始 GitHub 链接 | https://github.com/Niceck/hhxg-top-hhxg-python |
| License | MIT |
| 最近活跃 | 2026-06-20 |
| 候选能力 | A 股日报快照、交易日历、融资融券、实时快讯；标准库脚本；支持 JSON 输出 |
| 代表性 Skill 链接 | https://github.com/Niceck/hhxg-top-hhxg-python/blob/main/SKILL.md |
| 专家评估重点 | 日报快照字段是否有金融解释价值；资金/题材/新闻口径是否可靠 |
| 主要风险 | 第三方数据源依赖；缺测试 |
| QVeris 改造方式 | 用 QVeris 获取 A 股日历、融资融券、新闻、主题和快照；保留 JSON output 和 stdlib-like 简洁形态 |
| 建议 | P0。适合 `qveris-a-share-market-snapshot` |

## 4. P1 候选

| 仓库 | 原始 GitHub 链接 | License | 候选能力 | 专家评估重点 | 主要风险 | 建议 |
|---|---|---:|---|---|---|---|
| Tradermonty Trading Skills | https://github.com/tradermonty/claude-trading-skills | MIT | portfolio risk、market regime、sector analysis、data-quality checker、earnings calendar | 哪些风险/市场状态框架可作为研究辅助，而非交易建议 | 偏交易流程；部分依赖 FMP/Alpaca/FinViz | P1，借鉴风险框架和测试 |
| Financial Analyst Skills | https://github.com/Ruinius/financial-analyst-skills | MIT | PDF/earnings document → financial extraction → calculations → DCF → JSON viewer | 财务抽取与 DCF 输出链条是否适合 QVeris 文档分析 | 本地模型/PDF pipeline 重 | P1，借鉴 10-K/财报抽取和 JSON viewer |
| AkShare Skill | https://github.com/cloudzun/akshare-skill | Unknown | A 股基本面、数据采集、估值、宏观，多阶段课程结构，mock data/test cases | A 股指标体系和多源验证设计 | 缺 license；课程项目 | P1，先做概念参考，法律确认后再考虑代码 |
| Snowball CLI | https://github.com/baixianger/snowball-cli | GitHub metadata unknown, README says MIT | 雪球行情、财报、资金流、KOL、热帖、基金，JSON CLI | 哪些雪球数据可合规地经 QVeris 替代 | 登录/cookie 风险，缺 tests | P1，借鉴数据覆盖和 JSON 命令面 |
| Xueqiu Skills | https://github.com/CNife/xueqiu-skills | Apache-2.0 | 雪球 timeline 抓取 | KOL/社媒情绪是否适合做因子 | Auth/session 敏感 | P1，仅保留任务定义 |
| LLMQuant Skills | https://github.com/LLMQuant/skills | MIT | market intelligence、portfolio、macro、crypto、derivatives | 宏观/组合/衍生品 skill taxonomy | API/security signals 需深审 | P1，做二次评估 |
| Marian Trading Skills | https://github.com/marian2js/trading-skills | MIT | portfolio-risk-review、earnings-trade-prep、market-regime-analysis | 风险复盘和组合暴露框架 | prompt/workflow 多，runner 少 | P1，借鉴流程 |
| Bigdata Financial Research Analyst | https://github.com/Bigdata-com/skills-financial-research-analyst | NOASSERTION | 金融研究分析 skill | 是否有可复用的研究流程 | license unclear | P1，法律确认前不引入 |
| Finance Alerts Skill | https://github.com/jmkim-ntels/finance-alerts-skill | Unknown | 韩国汇率/股价 dashboard、alert scripts | 是否值得扩展 QVeris KR market coverage | license unclear，缺 tests | P1/P2 |
| National Team Position | https://github.com/Xiaoyuan-Liu/national-team-position | MIT | A 股国家队/中央汇金 ETF 持仓趋势估计 | 宽基 ETF 份额变化是否可作为市场稳定因子 | 窄场景；依赖 AkShare | P1，适合做专题因子 |

## 5. P2 / 仅参考候选

| 仓库 | 原始 GitHub 链接 | 原因 |
|---|---|---|
| Valuation Calculator | https://github.com/arbiger/valuation-calculator | 公式和命令面有参考价值，但单文件、缺测试，工程化不足 |
| Financial Red Flag Auditor | https://github.com/noahnan-max/financial-red-flag-auditor-skill | 年报排雷 workflow 有价值，但偏长报告生成，runner/schema 不足 |
| Money Atlas | https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent | 金融/宏观 taxonomy 宽，但 license 不清，输出更像 persona |
| GMGN Skills | https://github.com/GMGNAI/gmgn-skills | Crypto/meme token 数据技能，只有在 QVeris 明确要 crypto/social token coverage 时才评估 |
| Stock Analysis | https://github.com/moinsen-dev/stock-analysis | 与 OpenClaw stock-analysis 类似，但 license unknown |
| Canadian Finance Planner | https://github.com/cjpatten/canadian-finance-planner-skill | 个人财务规划强，但不属于金融市场数据/投研主线 |
| Indian Stock Analyst | https://github.com/jitu2611/indian-stock-analyst | 印度股票分析想法可参考，但缺 runner/tests/license |

## 6. Index / Discovery Source

以下仓库不应整体引入，只适合作为继续发现单项 skill 的索引。

| 仓库 | 原始 GitHub 链接 | 说明 |
|---|---|---|
| OpenClaw Master Skills | https://github.com/LeoYeAI/openclaw-master-skills | 巨型 OpenClaw skill 聚合库。可挖 Eastmoney、Tushare、Yahoo Finance、TickDB、market-signal-fusion 等单项 |
| Claude Skill Registry | https://github.com/majiayu000/claude-skill-registry | 巨型 registry，重复/噪音多，只作发现源 |
| Awesome Agent Skills | https://github.com/VoltAgent/awesome-agent-skills | 索引，不是候选实现 |

## 7. 需要金融专家重点判断的问题

### 7.1 Earnings / 财报方向

待判断：

- 标准输出是否应固定为：summary、reported vs consensus、guidance、margin/FCF、management tone、stock reaction、estimate revision、risk watch、evidence。
- 是否允许给出“方向判断”，还是只能给出“影响因素 + 不确定性”。
- 财报数据缺失时，哪些字段必须标红，不能补估。

优先参考：

- https://github.com/anthropics/financial-services
- https://github.com/ginlix-ai/LangAlpha
- https://github.com/Indomi/earnings-tracker
- https://github.com/webleon/tech-earnings-deepdive-openclaw-skill

### 7.2 A 股 / 港股 / 中文财经方向

待判断：

- A 股快照应优先包括哪些指标：赚钱效应、涨跌家数、连板、题材、融资融券、北向/南向资金、龙虎榜、财报日历、重要新闻。
- KOL/雪球/大V 内容是否可以作为情绪因子，如何标注低置信度和来源偏差。
- “国家队持仓估计”这类专题因子是否适合 QVeris Featured Skill。

优先参考：

- https://github.com/Niceck/hhxg-top-hhxg-python
- https://github.com/cloudzun/akshare-skill
- https://github.com/baixianger/snowball-cli
- https://github.com/Xiaoyuan-Liu/national-team-position

### 7.3 估值 / DCF / Comps 方向

待判断：

- DCF 默认假设是否应由用户输入、QVeris 数据推导，还是仅作为 scenario template。
- comps 分组和估值倍数如何避免“模型自动挑同行”的误导。
- 输出是否必须包含 sensitivity table、假设来源、缺失数据和低置信度警告。

优先参考：

- https://github.com/anthropics/financial-services
- https://github.com/ginlix-ai/LangAlpha
- https://github.com/yennanliu/InvestSkill
- https://github.com/EodHistoricalData/eodhd-claude-skills

### 7.4 风险 / 排雷方向

待判断：

- 财报排雷评分是否适合量化为总分，还是应使用风险标签。
- 关联交易、现金流质量、收入确认、商誉/存货/应收等红旗指标的最低必备字段。
- 是否要先做“来源可得性检查”，不足时禁止输出强结论。

优先参考：

- https://github.com/noahnan-max/financial-red-flag-auditor-skill
- https://github.com/Ruinius/financial-analyst-skills
- https://github.com/yennanliu/InvestSkill

## 8. 推荐下一步

建议先开 3 个候选 scaffold：

1. `third_party/finance/anthropics-financial-services/`
   - 不搬代码，沉淀 earnings/DCF/comps schema 和报告模板。

2. `third_party/finance/indomi-earnings-tracker/`
   - 替换 adapter 为 QVeris tools，做 US/HK/CN earnings calendar + recap。

3. `third_party/finance/niceck-hhxg-market/`
   - 做 A 股市场快照，要求 JSON + markdown + trace。

每个 scaffold 必须补齐：

- `candidate.json`
- `SKILL.md`
- `schemas/output.schema.json`
- `fixtures/*.json`
- `tests/*`
- `scripts/run.*`
- QVeris trace 字段
- dry-run / max calls / budget 限制
- “不构成投资建议”声明

## 9. 保留的原始链接清单

P0:

- https://github.com/anthropics/financial-services
- https://github.com/ginlix-ai/LangAlpha
- https://github.com/EodHistoricalData/eodhd-claude-skills
- https://github.com/himself65/finance-skills
- https://github.com/yennanliu/InvestSkill
- https://github.com/webleon/tech-earnings-deepdive-openclaw-skill
- https://github.com/star23/Day1Global-Skills
- https://github.com/Indomi/earnings-tracker
- https://github.com/Niceck/hhxg-top-hhxg-python

P1:

- https://github.com/tradermonty/claude-trading-skills
- https://github.com/Ruinius/financial-analyst-skills
- https://github.com/cloudzun/akshare-skill
- https://github.com/baixianger/snowball-cli
- https://github.com/CNife/xueqiu-skills
- https://github.com/LLMQuant/skills
- https://github.com/marian2js/trading-skills
- https://github.com/Bigdata-com/skills-financial-research-analyst
- https://github.com/jmkim-ntels/finance-alerts-skill
- https://github.com/Xiaoyuan-Liu/national-team-position

P2 / Reference:

- https://github.com/arbiger/valuation-calculator
- https://github.com/noahnan-max/financial-red-flag-auditor-skill
- https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent
- https://github.com/GMGNAI/gmgn-skills
- https://github.com/moinsen-dev/stock-analysis
- https://github.com/cjpatten/canadian-finance-planner-skill
- https://github.com/jitu2611/indian-stock-analyst

Index:

- https://github.com/LeoYeAI/openclaw-master-skills
- https://github.com/majiayu000/claude-skill-registry
- https://github.com/VoltAgent/awesome-agent-skills
