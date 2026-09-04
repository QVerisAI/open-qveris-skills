# 第三方金融 Skill 引入评估报告（金融团队评审版）

日期：2026-07-06
读者：金融研究、量化、风控、投研产品、数据合规同学
目的：判断已扫描的 GitHub 金融类 skill 是否有金融业务价值，是否值得引入或改造成 QVeris/Open Skills。

## 1. 给金融同学的评审结论

本报告不是让金融同学评代码质量，也不是采纳这些仓库里的投资观点。金融同学只需要判断三件事：

1. 这个 skill 是否对应真实金融工作流，例如财报解读、10-K 摘要、估值、组合风险、市场快照、新闻情绪、因子筛选。
2. 它的输出是否能被研究员、量化、风控或产品直接使用，例如是否有明确指标、证据、引用、缺失数据提示，而不是只给泛泛总结。
3. 它是否值得 QVeris 引入为标准 skill，或者只适合参考思路。

总体判断：

| 方向 | 金融价值 | 是否建议引入 | 说明 |
|---|---|---|---|
| 财报解读 / earnings analysis | 高 | 建议优先引入 | 高频、刚需、结果容易标准化，适合做 QVeris 标准投研 skill |
| 10-K / 年报摘要 / 财报排雷 | 高 | 建议引入 | 适合尽调、基本面研究和风险提示，但必须强制引用原文证据 |
| DCF / comps / 估值分析 | 高 | 建议引入为研究辅助 | 有明确金融工作流，但不能输出“目标价即结论”，应输出假设、敏感性和可比公司依据 |
| A 股市场快照 / 中文财经数据 | 高 | 建议引入，若 QVeris 覆盖中国市场 | 对盘后复盘、题材、资金、融资融券、公告快讯有价值 |
| 新闻情绪 / 社媒情绪 / KOL 信号 | 中高 | 建议谨慎引入 | 可作为风险、催化剂和关注度因子，不应直接包装成收益预测 |
| 因子筛选 / stock screener | 中高 | 建议引入为候选池工具 | 适合量化和研究选股入口，但需要可追溯数据和统一指标口径 |
| 组合风险 / sector rotation / market regime | 中高 | 建议引入部分框架 | 对风控和组合复盘有价值，需避免变成交易指令 |
| options / trading signal / 买卖点 | 低到中 | 暂不建议直接引入 | 合规风险高，除非改造成风险解释或情景分析 |
| crypto / meme token / 个人理财 | 低或条件性 | 暂不作为主线 | 只有在 QVeris 明确覆盖这些业务线时再评估 |

## 2. 建议优先评审的 QVeris Skill

| 优先级 | 拟引入 Skill | 金融价值 | 适合评审的金融同学 | 需要金融专家判断的问题 | 参考 GitHub 原始链接 |
|---|---|---|---|---|---|
| P0 | `qveris-earnings-analysis` | 财报发布后快速形成研究摘要，覆盖业绩、指引、margin、FCF、管理层语气、股价反应和风险变化 | 股票研究、投研产品、数据产品 | 标准输出字段是否完整；是否允许方向判断；哪些字段必须强制引用来源 | https://github.com/anthropics/financial-services；https://github.com/ginlix-ai/LangAlpha；https://github.com/Indomi/earnings-tracker |
| P0 | `qveris-10k-red-flag-digest` | 从年报/10-K 中提取业务变化、财务质量、风险因素、会计异常和潜在红旗 | 基本面研究、信用研究、风控 | 红旗指标是否专业；是否应打分还是只打标签；证据不足时如何处理 | https://github.com/yennanliu/InvestSkill；https://github.com/noahnan-max/financial-red-flag-auditor-skill；https://github.com/Ruinius/financial-analyst-skills |
| P0 | `qveris-comps-dcf-analysis` | 统一 DCF、comps、敏感性分析和估值假设，提升研究报告一致性 | 股票研究、估值团队、投研产品 | WACC、terminal growth、peer group、multiples 等默认口径是否可接受 | https://github.com/anthropics/financial-services；https://github.com/ginlix-ai/LangAlpha；https://github.com/yennanliu/InvestSkill |
| P0 | `qveris-a-share-market-snapshot` | A 股盘后快照、交易日历、融资融券、主题、资金、公告和快讯 | A 股研究、市场策略、数据产品 | 盘后快照应包含哪些字段；题材/资金/快讯来源是否可靠 | https://github.com/Niceck/hhxg-top-hhxg-python；https://github.com/cloudzun/akshare-skill；https://github.com/baixianger/snowball-cli |
| P1 | `qveris-financial-sentiment` | 把新闻、社媒、KOL、研报转成情绪、风险、催化剂和关注度因子 | 量化、策略、新闻数据产品 | 情绪标签体系是否有金融解释力；是否需要事件类型和置信度 | https://github.com/himself65/finance-skills；https://github.com/CNife/xueqiu-skills；https://github.com/baixianger/snowball-cli |
| P1 | `qveris-factor-screen` | 多因子候选池：估值、质量、动量、流动性、新闻风险、盈利修正 | 量化、股票研究、产品 | 因子定义是否稳定；候选池输出是否应附带排名解释和数据缺失提示 | https://github.com/EodHistoricalData/eodhd-claude-skills；https://github.com/himself65/finance-skills；https://github.com/tradermonty/claude-trading-skills |
| P1 | `qveris-portfolio-risk-review` | 组合集中度、sector exposure、波动、回撤、新闻风险和催化剂检查 | 风控、组合管理、投研产品 | 风险维度是否覆盖实际复盘需求；是否应给出调仓建议或只给风险解释 | https://github.com/EodHistoricalData/eodhd-claude-skills；https://github.com/tradermonty/claude-trading-skills；https://github.com/marian2js/trading-skills |

## 3. 候选仓库金融价值评估

### 3.1 高价值，建议进入引入评审

| 仓库 | 原始 GitHub 链接 | 金融价值判断 | 适合引入的能力 | 金融风险点 | 建议 |
|---|---|---|---|---|---|
| Anthropic Financial Services | https://github.com/anthropics/financial-services | 高。覆盖机构投研常见工作流，尤其 earnings、DCF、comps、market research | 财报解读、可比公司、估值模型、研究报告结构 | 原实现依赖其数据/MCP 环境，不能直接照搬 | P0，作为 QVeris 金融报告标准的核心参考 |
| LangAlpha | https://github.com/ginlix-ai/LangAlpha | 高。DCF、earnings、sector overview 与金融分析强相关 | DCF、财报分析、行业概览、报告 schema | 部分内容与 Anthropic 来源重叠，需去重 | P0，与 Anthropic 交叉验证后沉淀模板 |
| EODHD Claude Skills | https://github.com/EodHistoricalData/eodhd-claude-skills | 高。覆盖 company brief、stock screener、portfolio risk、macro dashboard | 筛选、组合风险、宏观仪表盘、公司画像 | 数据源绑定 EODHD API | P0，适合参考工程形态和金融指标结构 |
| Finance Skills | https://github.com/himself65/finance-skills | 高。情绪、估值、流动性、相关性、财报预览/回顾均有金融用途 | 情绪因子、公司估值、流动性、相关性 | 直连外部 API，需要统一数据口径 | P0，拆成多个小 skill 更合适 |
| InvestSkill | https://github.com/yennanliu/InvestSkill | 高。10-K digest、bear case、catalyst calendar、DCF、dividend、earnings call 都是投研刚需 | 年报摘要、催化剂、竞争分析、DCF、电话会分析 | 部分 skill 标注合并/弃用，需重整 taxonomy | P0，适合作为 US stock research skill 目录 |
| Earnings Tracker | https://github.com/Indomi/earnings-tracker | 高。财报日历和发布后摘要是明确工作流 | US/HK/CN 财报日历、watchlist、行业筛选、推送 | API key/config 风险，测试不足 | P0，适合快速试点 |
| HHXG Market | https://github.com/Niceck/hhxg-top-hhxg-python | 高，前提是 QVeris 要覆盖 A 股市场 | A 股日报快照、交易日历、融资融券、快讯、JSON 输出 | 第三方数据源稳定性和口径需确认 | P0，适合做 A 股市场快照 |
| Tech Earnings Deepdive | https://github.com/webleon/tech-earnings-deepdive-openclaw-skill | 中高。科技股财报深度分析场景明确 | 科技股 earnings memo、竞争格局、估值、管理层分析 | 容易过度主观或接近投资建议 | P0/P1，改成 evidence-first 研究报告 |

### 3.2 有价值，但建议金融专家二次评审

| 仓库 | 原始 GitHub 链接 | 金融价值判断 | 可参考能力 | 主要顾虑 | 建议 |
|---|---|---|---|---|---|
| Tradermonty Trading Skills | https://github.com/tradermonty/claude-trading-skills | 中高。portfolio risk、market regime、sector analysis 有价值 | 风险框架、市场状态、数据质量检查 | trading 色彩较强 | P1，只保留研究/风控部分 |
| Financial Analyst Skills | https://github.com/Ruinius/financial-analyst-skills | 中高。财务文档抽取到 DCF 的链条有价值 | PDF/earnings 文档抽取、财务计算、DCF、JSON viewer | 本地模型/PDF pipeline 重 | P1，借鉴文档分析和结构化输出 |
| AkShare Skill | https://github.com/cloudzun/akshare-skill | 中高。A 股数据和指标体系有价值 | A 股基本面、宏观、估值、多源验证 | license 不明，课程项目属性 | P1，先让金融同学确认指标体系 |
| Snowball CLI | https://github.com/baixianger/snowball-cli | 中高。雪球行情、财报、资金流、KOL 数据覆盖有参考价值 | 中文市场数据覆盖、JSON CLI | 登录/cookie 和合规风险 | P1，只参考数据覆盖，不直接引入抓取方式 |
| Xueqiu Skills | https://github.com/CNife/xueqiu-skills | 中。KOL/社媒情绪可做另类数据 | 雪球 timeline、社媒情绪 | auth/session 敏感 | P1，仅保留任务定义 |
| LLMQuant Skills | https://github.com/LLMQuant/skills | 中高。market intelligence、portfolio、macro、crypto、derivatives taxonomy 较全 | 宏观、组合、衍生品分类 | 安全和 API 设计需深审 | P1，单独二次评估 |
| Marian Trading Skills | https://github.com/marian2js/trading-skills | 中。风险复盘和 market regime 有参考价值 | portfolio-risk-review、earnings-trade-prep、market-regime-analysis | prompt/workflow 多，runner 少 | P1，借鉴流程，不照搬交易表达 |
| Bigdata Financial Research Analyst | https://github.com/Bigdata-com/skills-financial-research-analyst | 中。金融研究分析方向相关 | 研究流程 | license unclear | P1，法律确认前不引入 |
| Finance Alerts Skill | https://github.com/jmkim-ntels/finance-alerts-skill | 中。若覆盖韩国市场则有价值 | KR 汇率/股价 dashboard、alert scripts | license unclear，场景较窄 | P1/P2，视市场覆盖决定 |
| National Team Position | https://github.com/Xiaoyuan-Liu/national-team-position | 中。A 股国家队/中央汇金 ETF 持仓变化是专题因子 | 宽基 ETF 份额变化、市场稳定信号 | 场景很窄，依赖 AkShare | P1，适合专题因子 |

### 3.3 仅参考或暂不建议引入

| 仓库 | 原始 GitHub 链接 | 金融价值判断 | 不建议优先引入的原因 |
|---|---|---|---|
| Valuation Calculator | https://github.com/arbiger/valuation-calculator | 中 | 估值公式有参考价值，但实现过轻、缺测试 |
| Financial Red Flag Auditor | https://github.com/noahnan-max/financial-red-flag-auditor-skill | 中高 | 年报排雷方向有价值，但 runner/schema 不足，适合吸收指标而不是引入仓库 |
| Money Atlas | https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent | 低到中 | 更像宏观/金融 persona，结构和 license 不清 |
| GMGN Skills | https://github.com/GMGNAI/gmgn-skills | 条件性 | crypto/meme token 方向，只有覆盖该业务线时才评估 |
| Stock Analysis | https://github.com/moinsen-dev/stock-analysis | 中 | stock-analysis 思路可参考，但 license unknown |
| Canadian Finance Planner | https://github.com/cjpatten/canadian-finance-planner-skill | 低到中 | 偏个人财务规划，不是当前投研/市场数据主线 |
| Indian Stock Analyst | https://github.com/jitu2611/indian-stock-analyst | 低到中 | 区域市场想法可参考，但缺 runner/tests/license |

### 3.4 只作为继续搜索来源

| 仓库 | 原始 GitHub 链接 | 用途 |
|---|---|---|
| OpenClaw Master Skills | https://github.com/LeoYeAI/openclaw-master-skills | 巨型 skill 聚合库，可继续挖 Eastmoney、Tushare、Yahoo Finance、TickDB、market-signal-fusion 等单项 |
| Claude Skill Registry | https://github.com/majiayu000/claude-skill-registry | registry，适合发现候选，不适合整体引入 |
| Awesome Agent Skills | https://github.com/VoltAgent/awesome-agent-skills | 索引，不是候选实现 |

## 4. 金融专家评审表

金融同学评审每个候选 skill 时，建议填写以下结论：

| 问题 | 可选结论 |
|---|---|
| 这个 skill 对应的金融场景是否真实存在？ | 高频刚需 / 低频但重要 / 偶发 / 不真实 |
| 使用者是谁？ | 股票研究 / 量化 / 风控 / 组合管理 / 数据产品 / 合规 / 其他 |
| 输出是否能进入实际工作流？ | 可直接用 / 需补字段 / 只能参考 / 不可用 |
| 输出是否需要证据引用？ | 必须逐条引用 / 关键结论引用 / 可选 / 不需要 |
| 是否存在合规风险？ | 低 / 中 / 高 / 不可接受 |
| 是否值得 QVeris 引入？ | 引入 / 试点 / 仅参考 / 不引入 |

建议金融专家特别关注：

- 输出是否能帮助研究员少花时间，而不是只生成一段看似专业的文字。
- 指标口径是否正确，例如 revenue growth、gross margin、FCF、net debt、WACC、terminal growth、EV/EBITDA、P/E、estimate revision。
- 对“情绪”“催化剂”“红旗”“风险”的标签是否有金融解释力。
- 是否把不确定性讲清楚，是否标出数据缺失、估算值和引用来源。
- 是否避免直接给买入、卖出、目标价承诺或收益预测。

## 5. 不建议引入的情况

即使某个仓库看起来与金融相关，只要出现以下情况，建议金融同学标为“不引入”或“仅参考”：

- 主要卖点是“预测股价”“自动交易”“买卖点”，但没有可验证证据链。
- 输出只有自然语言观点，没有指标、来源、置信度、缺失数据说明。
- 依赖登录态、cookie、个人 token、浏览器自动化抓取。
- license 不清，或无法确认是否能改造分发。
- 金融场景很窄，且不在 QVeris 当前覆盖市场内。
- 把社媒/KOL 情绪直接等同于投资结论。

## 6. 建议评审顺序

建议先让金融同学按以下顺序评审：

1. 财报与估值方向：Anthropic Financial Services、LangAlpha、InvestSkill、Earnings Tracker。
2. A 股与中文财经方向：HHXG Market、AkShare Skill、Snowball CLI、Xueqiu Skills。
3. 情绪与因子方向：Finance Skills、EODHD Claude Skills、Tradermonty Trading Skills。
4. 风险与排雷方向：Financial Red Flag Auditor、Financial Analyst Skills、portfolio risk 相关 skill。

优先试点建议：

1. `qveris-earnings-analysis`
2. `qveris-a-share-market-snapshot`
3. `qveris-10k-red-flag-digest`

这三个方向金融价值最明确，也最容易让专家判断输出是否专业。
