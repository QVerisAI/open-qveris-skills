# 金融 Skill 候选逐项评估卡片（Round 2 追加扫描）

日期：2026-07-06
用途：延续第一轮 29 个候选，继续补充 GitHub 上可用于 QVeris/Open Skills 的金融 skill/仓库。
扫描说明：本轮优先浅克隆核验 `SKILL.md`、脚本、测试和 README；少数仓库 clone 失败，仅按 GitHub 页面信息标注，后续需复核。

## Round 2 总结

本轮新增 22 个候选。建议优先进入金融专家评审的新增项：

| 优先级 | 新增候选 | 金融价值 |
|---|---|---|
| P0 | Longbridge Skills | US/HK/A 股财报、基本面、行情、组合、研究、量化 taxonomy 很完整 |
| P0 | SEC Filing Legal Decoder | 10-K/20-F/10-Q 法律语言转金融风险卡，证据链和测试较强 |
| P0 | Alphasift | A 股策略筛选、候选池、后验评估，适合 QVeris 因子筛选方向 |
| P1 | cnstock-cli | A/H/US/指数/基金行情查询，边界清楚，适合作为市场数据 CLI 参考 |
| P1 | HHFinAi Earnings Analysis | 专门的机构级 earnings analysis 框架，适合补强财报分析 rubric |
| P1 | Daymade Financial Suite | US equity 数据收集、A 股新闻、RavenPack/Bigdata、医药日报等数据 pipeline |
| P1 | UZI-Skill | A/H/US 个股深度分析覆盖广，但合规和主观决策表达需强改造 |

## 30. Longbridge Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Longbridge Skills |
| GitHub URL | https://github.com/longbridge/skills |
| License | MIT |
| 最近活跃 | 2026-06-19 |
| 候选能力 | 可沉淀为 `qveris-longbridge-earnings`、`qveris-market-data`、`qveris-fundamentals`、`qveris-portfolio`、`qveris-research`、`qveris-technical`、`qveris-watchlist`。金融价值在 US/HK/A 股财报、行情、基本面、组合和研究 workflow。 |
| 直接可用性 | 需改造。金融场景很贴近，但原实现有 Longbridge 平台数据源约束。 |
| 核心代码 | `skills/longbridge-earnings/SKILL.md`；`skills/longbridge-fundamentals/SKILL.md`；`skills/longbridge-market-data/SKILL.md`；`skills/longbridge-portfolio/SKILL.md`；`skills/longbridge-research/SKILL.md`；`skills/longbridge-quant/SKILL.md`；`skills/longbridge-earnings/scripts/collect.py`。 |
| 外部依赖 | Longbridge CLI/API、行情、财报、机构评级、EPS forecast、新闻、K 线、估值数据。 |
| 安全风险 | 平台/券商数据绑定；部分 skill 可能涉及交易/组合语境，需收窄为研究和风险分析。 |
| 测试情况 | 本轮未发现明确 tests；有脚本和多 skill 目录。 |
| QVeris 改造方式 | 将 Longbridge 数据调用替换为 QVeris tools，优先保留 earnings lite/full 报告结构、market data/fundamentals 输出字段和 portfolio risk 框架。 |
| 优先级 | P0 |

## 31. SEC Filing Legal Decoder

| 字段 | 内容 |
|---|---|
| 仓库 | SEC Filing Legal Decoder |
| GitHub URL | https://github.com/Stahl-G/sec-filing-legal-decoder |
| License | MIT |
| 最近活跃 | 2026-06-02 |
| 候选能力 | 可沉淀为 `qveris-sec-filing-legal-risk`、`qveris-10k-risk-cards`、`qveris-legal-to-finance-review`。金融价值在把 10-K、10-Q、20-F、40-F、6-K 的法律语言转成 finance-relevant risk cards、升级问题和管理层 follow-up。 |
| 直接可用性 | 需改造，但工程化强。适合直接进入 P0 评审。 |
| 核心代码 | `skills/sec-filing-legal-decoder/SKILL.md`；`src/sec_filing_legal_decoder/cli.py`；`src/sec_filing_legal_decoder/classifiers/*`；`src/sec_filing_legal_decoder/content_routing/finance_kpi_rules.py`；`scripts/validate_outputs.py`。 |
| 外部依赖 | SEC EDGAR HTML/TXT、公司 IR HTML、PDF/OCR fallback、Python CLI。 |
| 安全风险 | 法律风险解释不能替代法律意见；必须保持 source-only、证据引用、升级问题边界。 |
| 测试情况 | 测试信号强：`tests/test_classifier.py`、`tests/test_risk_cards.py`、`tests/test_privacy_sanitization.py`、`tests/test_quality_baseline.py`、`tests/test_zh_cn_report_quality.py` 等。 |
| QVeris 改造方式 | 用 QVeris filing/document tools 获取 filings；保留 risk-card、evidence audit、JSON 输出和中英双语报告；补 QVeris trace 和合规声明。 |
| 优先级 | P0 |

## 32. Alphasift

| 字段 | 内容 |
|---|---|
| 仓库 | Alphasift |
| GitHub URL | https://github.com/ZhuLinsen/alphasift |
| License | Apache-2.0 |
| 最近活跃 | 2026-07-03 |
| 候选能力 | 可沉淀为 `qveris-a-share-factor-screen`、`qveris-strategy-screen`、`qveris-screen-evaluation`。金融价值在 A 股全市场候选发现、策略筛选、评分排序、保存运行和 T+N 后验评估。 |
| 直接可用性 | 需改造。业务方向高度相关，但应去掉自动交易联想，定位为候选池和研究筛选。 |
| 核心代码 | `SKILL.md`；`.github/skills/alphasift/SKILL.md`；`alphasift/cli.py`；`alphasift/filter.py`；`alphasift/evaluate.py`；`alphasift/daily.py`；`alphasift/strategies/*`。 |
| 外部依赖 | AkShare、Baostock、LiteLLM/LLM API、可选 DSA 后置分析器。 |
| 安全风险 | 选股结果可能被误读为投资建议；需要输出因子解释、缺失数据、回测局限和免责声明。 |
| 测试情况 | 测试信号强：`tests/test_cli.py`、`tests/test_filter.py`、`tests/test_evaluate.py`、`tests/test_daily.py`、`tests/test_industry.py`、`tests/test_overview.py` 等。 |
| QVeris 改造方式 | 用 QVeris 替代 AkShare/Baostock 数据源；保留 strategy registry、screen result JSON、run/evaluate 后验机制。 |
| 优先级 | P0 |

## 33. cnstock-cli

| 字段 | 内容 |
|---|---|
| 仓库 | cnstock-cli |
| GitHub URL | https://github.com/fatecannotbealtered/cnstock-cli |
| License | MIT |
| 最近活跃 | 2026-07-02 |
| 候选能力 | 可沉淀为 `qveris-cn-market-data-cli`、`qveris-stock-quote`、`qveris-market-breadth`、`qveris-sector-ranking`。金融价值在 A 股、港股、美股、指数、ETF、基金的行情、K 线、分时、搜索、板块排名和市场宽度。 |
| 直接可用性 | 需改造。CLI 边界清楚，适合参考，但 public endpoint 不适合直接作为 QVeris 正式数据源。 |
| 核心代码 | `skills/cnstock-cli/SKILL.md`；`cmd/*`；`internal/api/*`；`scripts/gen-contract.js`；`scripts/sync-spec.js`。 |
| 外部依赖 | 腾讯财经、东方财富等公开网页端点；Go CLI；NPM platform packages。 |
| 安全风险 | README 明确不应用于交易、商用、合规报告或高频抓取；数据源非官方 SLA。 |
| 测试情况 | 测试信号强：`cmd/*_test.go`、`internal/api/*_test.go`、`reference_schema_test.go`、`e2e_test.go`。 |
| QVeris 改造方式 | 抽取命令契约、JSON envelope、reference/doctor 思路；正式数据由 QVeris 承担，保留行情查询和市场宽度 schema。 |
| 优先级 | P1 |

## 34. UZI-Skill

| 字段 | 内容 |
|---|---|
| 仓库 | UZI-Skill |
| GitHub URL | https://github.com/wbh604/UZI-Skill |
| License | MIT |
| 最近活跃 | 2026-06-25 |
| 候选能力 | 可沉淀为 `qveris-stock-deep-analysis`、`qveris-valuation-methods`、`qveris-a-share-lhb-analyzer`、`qveris-trap-detector`。金融价值在 A/H/US 个股深度分析、DCF/Comps/LBO/3-statement/IC memo、龙虎榜、杀猪盘检测。 |
| 直接可用性 | 需强改造。覆盖面很强，但输出语气和“值不值得买/决策”边界风险高。 |
| 核心代码 | `SKILL.md`；`skills/deep-analysis/SKILL.md`；`skills/deep-analysis/run.py`；`skills/deep-analysis/scripts/fetch_*`；`skills/deep-analysis/scripts/compute_*`；`skills/lhb-analyzer/SKILL.md`；`skills/trap-detector/SKILL.md`。 |
| 外部依赖 | AkShare、A/H/US 市场数据、财报、资金流、新闻、LLM/API、HTML 报告生成。 |
| 安全风险 | 投资建议、买卖判断、模型黑箱、数据源稳定性；需要强制 evidence-first 和不输出交易结论。 |
| 测试情况 | 测试信号较强：`skills/deep-analysis/scripts/tests/*`、`run_real_test.py`。 |
| QVeris 改造方式 | 不照搬“分析师角色/决策”文案，只抽取数据维度、方法库、缺失数据报告和可审计 methodology log；用 QVeris 数据源重建执行链。 |
| 优先级 | P1 |

## 35. MarketBot

| 字段 | 内容 |
|---|---|
| 仓库 | MarketBot |
| GitHub URL | https://github.com/EthanAlgoX/MarketBot |
| License | MIT |
| 最近活跃 | 2026-07-02 |
| 候选能力 | 可沉淀为 `qveris-earnings-readout`、`qveris-catalyst-tracker`、`qveris-daily-stock-screener`、`qveris-eastmoney-live`、`qveris-browser-news-verifier`。金融价值在财报快读、催化剂追踪、日度筛选、东方财富快讯和新闻核验。 |
| 直接可用性 | 需改造。金融 skill 多且覆盖面广，但属于一套 agent runtime。 |
| 核心代码 | `marketbot/skills/earnings-readout/SKILL.md`；`marketbot/skills/catalyst-tracker/SKILL.md`；`marketbot/skills/daily-stock-screener/SKILL.md`；`marketbot/skills/eastmoney-live/SKILL.md`；`claw-screener/SKILL.md`；`claw-screener/src/*`。 |
| 外部依赖 | MarketBot runtime、market_news、market_snapshot、market_fundamentals、新闻、东方财富、可能有浏览器工具。 |
| 安全风险 | 多 skill 多工具，权限和数据源需拆开审；筛选/催化剂输出不能变成交易建议。 |
| 测试情况 | 测试信号较强：`tests/test_agent_runner.py`、`tests/test_cli_market_runtime.py`、`tests/test_agent_router_planner.py` 等。 |
| QVeris 改造方式 | 优先抽取 `earnings-readout` 的结构化输出模板和 `catalyst-tracker` 的事件框架，替换工具为 QVeris market/news/fundamental tools。 |
| 优先级 | P1 |

## 36. HHFinAi Earnings Analysis

| 字段 | 内容 |
|---|---|
| 仓库 | HHFinAi Earnings Analysis |
| GitHub URL | https://github.com/HHFinAi/earnings-analysis |
| License | MIT |
| 最近活跃 | 2026-04-13 |
| 候选能力 | 可沉淀为 `qveris-earnings-quality-score`、`qveris-post-print-memo`、`qveris-earnings-risk-map`。金融价值在 Parse → Compare → Diagnose → Decide 四层 earnings framework 和机械评分引擎。 |
| 直接可用性 | 需改造。框架专业，但 “Decide / trade note / what do I do now” 需改成研究辅助边界。 |
| 核心代码 | `SKILL.md`；`scripts/score_earnings.py`；`references/parsing-checklist.md` 等。 |
| 外部依赖 | 10-Q/10-K、earnings release、8-K、call transcript、consensus estimates、historical data、web search。 |
| 安全风险 | 可能接近投资行动建议；必须把输出限制为证据、影响因素、风险和不确定性。 |
| 测试情况 | 未发现明确 tests；有 scorer 脚本。 |
| QVeris 改造方式 | 将评分引擎和四层框架改成 QVeris earnings rubric；数据由 QVeris filings/news/market/consensus tools 获取。 |
| 优先级 | P1 |

## 37. Daymade Financial Suite

| 字段 | 内容 |
|---|---|
| 仓库 | Daymade Claude Code Skills |
| GitHub URL | https://github.com/daymade/claude-code-skills |
| License | MIT |
| 最近活跃 | GitHub README 显示 Last updated: 2026-06-05；本轮 clone 失败，待复核最近提交 |
| 候选能力 | 可沉淀为 `qveris-financial-data-collector`、`qveris-ashare-news-fetcher`、`qveris-pharma-daily-report`、`qveris-bigdata-sentiment`。金融价值在 US equity fundamentals、RavenPack/Bigdata sentiment、Gangtise research suite、A 股新闻/政策和医药日报。 |
| 直接可用性 | 需改造。数据 pipeline 设计有价值，但依赖 daymade plugin suite 和多个外部服务。 |
| 核心代码 | README 指向 `daymade-financial:financial-data-collector`、`bigdata-skill`、`gangtise-copilot`、`ashare-news-fetcher`、`pharma-daily-report`；需后续 clone 成功后核具体 `SKILL.md`。 |
| 外部依赖 | yfinance、pandas、Bigdata.com/RavenPack SDK、Gangtise OpenAPI、Sina Finance、Feishu。 |
| 安全风险 | 多 API key、供应商数据授权、Feishu 推送和 A 股新闻合规边界。 |
| 测试情况 | 本轮未能 clone 核验；README 声称有生产化技能 marketplace 和安全配置文件。 |
| QVeris 改造方式 | 优先吸收 `financial-data-collector` 的 NO FALLBACK、字段完整性校验、source attribution 和 validation 思路；数据源替换为 QVeris。 |
| 优先级 | P1 |

## 38. Claude Office Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Claude Office Skills |
| GitHub URL | https://github.com/fivetaku/claude-office-skills |
| License | 仓库结构/文档 MIT；README 声明 skill 内容为 Anthropic 版权，需法律复核 |
| 最近活跃 | 本轮 clone 失败；GitHub 页面显示 2 commits，待复核最近提交 |
| 候选能力 | 可沉淀为 `qveris-3-statement-model`、`qveris-dcf-model`、`qveris-lbo-model`、`qveris-comps-analysis`、`qveris-ib-deck-check`。金融价值在 Excel/PowerPoint 金融建模和 IB deck 工作流。 |
| 直接可用性 | 仅可参考。金融工作流很有价值，但版权声明不适合直接引入 skill 内容。 |
| 核心代码 | `claude-in-excel/3-statement-model/SKILL.md`；`claude-in-excel/dcf-model/SKILL.md`；`claude-in-excel/lbo-model/SKILL.md`；`claude-in-excel/comps-analysis/SKILL.md`；`claude-in-powerpoint/ib-check-deck/SKILL.md`。 |
| 外部依赖 | Python、openpyxl、Excel/PPTX 文件、recalc/validate helpers。 |
| 安全风险 | 版权/许可风险最高；估值模型输出需避免目标价承诺。 |
| 测试情况 | README 提到 helper scripts，如 `recalc.py`、`validate_dcf.py`、`extract_numbers.py`；本轮未核 tests。 |
| QVeris 改造方式 | 只参考字段和模型质量控制要求，不复用 skill 文本；重新编写 QVeris 自有建模 skill。 |
| 优先级 | P1/仅参考 |

## 39. Hermes Agent Optional Finance Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Hermes Agent |
| GitHub URL | https://github.com/NousResearch/hermes-agent |
| License | MIT |
| 最近活跃 | 2026-07-05 |
| 候选能力 | 可沉淀为 `qveris-3-statement-model`、`qveris-dcf-model`、`qveris-comps-analysis`、`qveris-lbo-model`、`qveris-merger-model`、`qveris-finance-stocks`、`qveris-finance-pptx-author`。金融价值在建模、Excel/PPT 交付和 Yahoo 股票数据。 |
| 直接可用性 | 需改造。finance optional skills 完整，但属于 Hermes 生态。 |
| 核心代码 | `optional-skills/finance/3-statement-model/SKILL.md`；`optional-skills/finance/dcf-model/SKILL.md`；`optional-skills/finance/comps-analysis/SKILL.md`；`optional-skills/finance/lbo-model/SKILL.md`；`optional-skills/finance/stocks/SKILL.md`；`optional-skills/finance/stocks/scripts/stocks_client.py`。 |
| 外部依赖 | openpyxl、Yahoo Finance unofficial endpoint、可选 Alpha Vantage key、PPTX/Excel 生成工具。 |
| 安全风险 | Yahoo endpoint 非官方；建模输出需强制来源注释和公式审计。 |
| 测试情况 | 大仓库有 tests，但本轮未确认 finance 子 skill 专项测试；`dcf-model` 有 `scripts/validate_dcf.py`。 |
| QVeris 改造方式 | 保留建模质量约束、公式/敏感性表/注释要求；用 QVeris 获取历史财务、估值、股价和同行数据。 |
| 优先级 | P1 |

## 40. OpenClaw AkShare Skill

| 字段 | 内容 |
|---|---|
| 仓库 | OpenClaw AkShare Skill |
| GitHub URL | https://github.com/succ985/openclaw-akshare-skill |
| License | MIT |
| 最近活跃 | 2026-02-08 |
| 候选能力 | 可沉淀为 `qveris-akshare-data-access`、`qveris-china-market-data`、`qveris-cn-macro-data`。金融价值在 AkShare A 股、港股、美股、期货、基金、宏观数据访问。 |
| 直接可用性 | 仅可参考/需改造。更像 AkShare 使用指南和工具封装。 |
| 核心代码 | `SKILL.md`；`scripts/akshare_tool.py`；`scripts/example_usage.py`；`scripts/test_basic.py`；`scripts/test_quick.py`。 |
| 外部依赖 | AkShare、Python、公开金融数据接口。 |
| 安全风险 | AkShare 上游数据源不稳定，数据授权/商用需确认。 |
| 测试情况 | 有 `scripts/test_basic.py` 和 `scripts/test_quick.py`。 |
| QVeris 改造方式 | 只参考 AkShare 覆盖范围和命令结构；正式数据由 QVeris 中国市场数据工具提供。 |
| 优先级 | P1 |

## 41. OpenClaw Stock Skill

| 字段 | 内容 |
|---|---|
| 仓库 | OpenClaw Stock Skill |
| GitHub URL | https://github.com/molezzz/openclaw-stock-skill |
| License | Unknown |
| 最近活跃 | 2026-03-11 |
| 候选能力 | 可沉淀为 `qveris-a-share-chat-analysis`、`qveris-a-share-router`、`qveris-sector-rotation`、`qveris-fund-flow-analysis`。金融价值在 A 股自然语言路由、实时行情、技术面、基本面、板块、资金流和跨市场分析。 |
| 直接可用性 | 仅可参考。license unknown，且本地路径和聊天平台输出耦合较强。 |
| 核心代码 | `SKILL.md`；`main.py`；`router.py`；`formatter.py`；`adapters/akshare_adapter.py`。 |
| 外部依赖 | AkShare、pandas、numpy、Python 3.9、本地环境路径。 |
| 安全风险 | License unknown；聊天式短结论易产生投资建议误解。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 借鉴 Router → Service → Analyzer → Formatter 分层，数据源替换为 QVeris，输出改成 JSON + evidence + markdown。 |
| 优先级 | P2/P1 |

## 42. Awesome Finance Skills / AlphaEar

| 字段 | 内容 |
|---|---|
| 仓库 | Awesome Finance Skills |
| GitHub URL | https://github.com/RKiding/Awesome-finance-skills |
| License | Apache-2.0 |
| 最近活跃 | 2026-03-29 |
| 候选能力 | 可沉淀为 `qveris-alphaear-stock`、`qveris-alphaear-news`、`qveris-alphaear-sentiment`、`qveris-alphaear-reporter`、`qveris-signal-tracker`。金融价值在 A/H/US 股票搜索、价格历史、基本面、新闻、情绪和信号追踪。 |
| 直接可用性 | 需改造。目录完整、有测试，但 predictor/forecast 需谨慎。 |
| 核心代码 | `skills/alphaear-stock/SKILL.md`；`skills/alphaear-news/SKILL.md`；`skills/alphaear-sentiment/SKILL.md`；`skills/alphaear-signal-tracker/SKILL.md`；`skills/alphaear-predictor/SKILL.md`；对应 `scripts/*`。 |
| 外部依赖 | pandas、requests、AkShare、yfinance、数据库 manager、可能包含模型权重。 |
| 安全风险 | predictor/forecast 和 signal-tracker 可能被解读为交易信号；需拆成研究辅助因子。 |
| 测试情况 | 测试信号强：`skills/*/tests/test_*.py` 和 `tests/alphaear-*/*`。 |
| QVeris 改造方式 | 优先吸收 stock/news/sentiment/reporter 的结构和测试；不直接引入预测模型，改为 QVeris 新闻/行情/基本面因子。 |
| 优先级 | P1 |

## 43. X2Strategy

| 字段 | 内容 |
|---|---|
| 仓库 | X2Strategy |
| GitHub URL | https://github.com/ALAGENT-HKU/x2strategy |
| License | Unknown |
| 最近活跃 | 2026-06-12 |
| 候选能力 | 可沉淀为 `qveris-quant-paper-to-strategy`、`qveris-strategy-spec-extractor`、`qveris-backtest-diagnosis`。金融价值在把量化论文/研究文档转成结构化策略 spec、Backtrader 代码和回测诊断。 |
| 直接可用性 | 需改造。适合量化研究团队，不适合面向普通投研用户直接开放。 |
| 核心代码 | `SKILL.md`；`paper2spec/*`；`scripts/analyze.py`；`scripts/extract.py`；`assets/backtrader_template.py`；`tests/*`。 |
| 外部依赖 | PyMuPDF、FAISS、LLM API、Backtrader、Python/DOCX/PDF parsing。 |
| 安全风险 | 代码生成和回测结果容易被误解为实盘可用策略；需强制 out-of-sample 和风险披露。 |
| 测试情况 | 测试信号强：`tests/test_e2e.py`、`tests/test_extractor.py`、`tests/test_parser.py`、`tests/test_validator.py`、`scripts/run_full_tests.sh`。 |
| QVeris 改造方式 | 定位为研究论文解析和策略说明生成，不直接生成可交易策略；QVeris 提供行情和回测数据源。 |
| 优先级 | P1 |

## 44. 10k-analysis

| 字段 | 内容 |
|---|---|
| 仓库 | 10k-analysis |
| GitHub URL | https://github.com/twCarllin/10k-analysis |
| License | MIT |
| 最近活跃 | 2026-05-17 |
| 候选能力 | 可沉淀为 `qveris-multi-agent-10k-analysis`、`qveris-jp-filing-analysis`、`qveris-edgar-edinet-report`。金融价值在 US SEC EDGAR 10-K/10-Q 与 JP EDINET/TDNET filings 的 multi-agent 财报分析。 |
| 直接可用性 | 需改造。不是标准 SKILL.md 仓库，但 pipeline 场景很贴近。 |
| 核心代码 | `main.py`；`runtime/sec_data_fetcher.py`；`runtime/jp_data_fetcher.py`；`runtime/jp_ixbrl_parser.py`；`runtime/report_writer.py`；`runtime/orchestrator.py`；`runtime/transcript_scraper/*`。 |
| 外部依赖 | SEC EDGAR、EDINET API key、TDNET scraping、logmi Finance、Stagehand、Anthropic API、PDF generation。 |
| 安全风险 | API key、网页抓取、模型成本、跨市场法规和日文/繁中报告质量。 |
| 测试情况 | 有 `runtime/transcript_scraper/test_parser.py`；整体 pipeline 测试需复核。 |
| QVeris 改造方式 | 抽取 US/JP filing workflow 和报告章节；用 QVeris filing/document tools 取代 EDGAR/EDINET/TDNET adapter。 |
| 优先级 | P1 |

## 45. Awesome Claude Corporate Skills

| 字段 | 内容 |
|---|---|
| 仓库 | Awesome Claude Corporate Skills |
| GitHub URL | https://github.com/w95/awesome-claude-corporate-skills |
| License | MIT |
| 最近活跃 | 2026-02-26 |
| 候选能力 | 可沉淀为 `qveris-corporate-finance-dcf`、`qveris-3-statement-model`、`qveris-ma-due-diligence`、`qveris-risk-assessment`。金融价值在 corporate finance、DCF、3-statement、M&A due diligence、board/kpi/risk 场景。 |
| 直接可用性 | 仅可参考。更偏企业职能 skill 聚合，不是市场投研主线。 |
| 核心代码 | `02-finance-accounting/3-statements/SKILL.md`；`02-finance-accounting/dcf-model/SKILL.md`；`02-finance-accounting/dcf-model/scripts/validate_dcf.py`；`01-executive-leadership/ma-due-diligence/SKILL.md`。 |
| 外部依赖 | 财务报表、Excel/openpyxl、公司内部数据、M&A DD 材料。 |
| 安全风险 | 公司内部财务和交易材料隐私；估值结果需避免投资承诺。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只参考 DCF/3-statement/MA DD 模板，数据源与输出 evidence 由 QVeris 重建。 |
| 优先级 | P2/P1 |

## 46. Borghei Business Investment Advisor

| 字段 | 内容 |
|---|---|
| 仓库 | Claude-Skills / Business Investment Advisor |
| GitHub URL | https://github.com/borghei/Claude-Skills |
| License | 仓库 LICENSE 存在；该 skill frontmatter 标注 MIT + Commons Clause |
| 最近活跃 | 2026-06-29 |
| 候选能力 | 可沉淀为 `qveris-private-investment-screening`、`qveris-due-diligence-checklist`、`qveris-portfolio-diversification`。金融价值在投资机会筛选、ROI、payback、风险、尽调清单和非上市投资组合。 |
| 直接可用性 | 仅可参考/需法律复核。Commons Clause 不适合直接引入商业产品。 |
| 核心代码 | `finance/business-investment-advisor/SKILL.md`；`finance/business-investment-advisor/scripts/investment_screener.py`；`portfolio_analyzer.py`；`due_diligence_checklist.py`；`examples/*.json`。 |
| 外部依赖 | JSON opportunity/portfolio data、业务/财务 DD 数据。 |
| 安全风险 | License/Commons Clause；可能输出投资建议和 portfolio recommendation。 |
| 测试情况 | 有 examples；未发现明确 tests。 |
| QVeris 改造方式 | 只抽取 DD checklist 和 risk framework，作为 private market/CorpDev 场景参考；不引入代码。 |
| 优先级 | P2/P1 |

## 47. Valyu CLI

| 字段 | 内容 |
|---|---|
| 仓库 | Valyu CLI |
| GitHub URL | https://github.com/valyuAI/valyu-cli |
| License | MIT |
| 最近活跃 | 2026-07-01 |
| 候选能力 | 可沉淀为 `qveris-cited-finance-research`、`qveris-sec-search-answer`、`qveris-ma-dd-research`。金融价值在有引用的搜索、SEC、finance、economics、news、deepresearch 和 deliverables。 |
| 直接可用性 | 需改造/仅参考。不是金融 skill 本身，而是金融研究搜索和交付工具。 |
| 核心代码 | `skills/valyu-cli/SKILL.md`；`src/cli.ts`；`src/commands/search/*`；`src/commands/answer/*`；`src/commands/deepresearch/*`。 |
| 外部依赖 | VALYU_API_KEY、Valyu 平台、搜索/深度研究服务、CSV/XLSX/PPTX/DOCX/PDF deliverables。 |
| 安全风险 | API key、费用、第三方平台数据授权；不能替代 QVeris 自有数据 lineage。 |
| 测试情况 | 有 `src/__tests__/client.test.ts`、`config.test.ts`、`render.test.ts` 等。 |
| QVeris 改造方式 | 借鉴 cited answer、deepresearch workflow、budget/account/key 管理；QVeris 自己实现 finance/SEC/news search。 |
| 优先级 | P1/参考 |

## 48. Wealth Guide

| 字段 | 内容 |
|---|---|
| 仓库 | Wealth Guide |
| GitHub URL | https://github.com/caseonix/wealth-guide |
| License | MIT |
| 最近活跃 | 2026-04-16 |
| 候选能力 | 可沉淀为个人理财规划、退休规划、财富路线图、多 agent 财务 coaching。 |
| 直接可用性 | 仅可参考。偏个人理财，不属于当前金融市场数据/投研主线。 |
| 核心代码 | `SKILL.md`；`config/init_db.py`；`scripts/md_to_html.py`；`knowledge/*`；`workflows/*`。 |
| 外部依赖 | SQLite profile DB、个人财务信息、US/Canada/India 理财知识库。 |
| 安全风险 | 高度个人隐私、税务/投资建议、地区法规。 |
| 测试情况 | 有 `scripts/test_md_to_html.py`。 |
| QVeris 改造方式 | 当前不建议改造；如未来覆盖个人理财，需要独立合规/隐私框架。 |
| 优先级 | P2/暂不投入 |

## 49. Investment Masters

| 字段 | 内容 |
|---|---|
| 仓库 | Investment Masters |
| GitHub URL | https://github.com/AlphaGBM/investment-masters |
| License | MIT |
| 最近活跃 | 2026-05-27 |
| 候选能力 | 可沉淀为 `qveris-investment-framework-library`、`qveris-13f-holdings-context`。金融价值在投资大师方法论、13F holdings、哲学对比、策略映射。 |
| 直接可用性 | 仅可参考。更像知识库/方法论，不是数据执行 skill。 |
| 核心代码 | `SKILL.md`；`masters/*.md`。 |
| 外部依赖 | 公开信、书籍、访谈、13F filings。 |
| 安全风险 | 大师观点可能被用户当作投资建议；13F 滞后性必须标注。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 只作为研究框架/投资风格 glossary；13F 数据由 QVeris filings/holdings 工具提供。 |
| 优先级 | P2 |

## 50. Peter Lynch Skill

| 字段 | 内容 |
|---|---|
| 仓库 | Peter Lynch Skill |
| GitHub URL | https://github.com/DjNero11/peter-lynch-skill |
| License | MIT |
| 最近活跃 | 2026-06-28 |
| 候选能力 | 可沉淀为 `qveris-investment-framework-peter-lynch`。金融价值在 GARP/成长股研究框架和教育性分析。 |
| 直接可用性 | 仅可参考。投资风格 persona，不是可执行数据 skill。 |
| 核心代码 | `SKILL.md`。 |
| 外部依赖 | 公司基本面、估值、成长指标、用户提供材料。 |
| 安全风险 | 风格化观点容易被当作个股建议；需避免“某大师会买/卖”的确定性表述。 |
| 测试情况 | 未发现明确 tests。 |
| QVeris 改造方式 | 抽取为研究框架模板，不作为独立 production skill。 |
| 优先级 | P2 |

## 51. BB Browser

| 字段 | 内容 |
|---|---|
| 仓库 | BB Browser |
| GitHub URL | https://github.com/epiral/bb-browser |
| License | MIT |
| 最近活跃 | 2026-05-29 |
| 候选能力 | 可作为金融网页验证、浏览器抓取、截图和网页操作基础设施参考；不应作为金融 skill 本身。 |
| 直接可用性 | 仅可参考。浏览器自动化工具，不是金融业务 skill。 |
| 核心代码 | `skills/bb-browser/SKILL.md`；`skills/bb-browser-openclaw/SKILL.md`；`packages/cli/src/*`；`packages/daemon/src/*`。 |
| 外部依赖 | Browser/CDP、daemon、SQLite history、Node/TypeScript。 |
| 安全风险 | 浏览器自动化、登录态、cookie、网页指令注入、隐私数据。 |
| 测试情况 | 测试信号强：`packages/cli/src/__tests__/*`、`packages/daemon/src/__tests__/*`。 |
| QVeris 改造方式 | 若需要网页证据核验，可参考其浏览器控制和测试设计；金融数据获取不依赖登录态网页抓取。 |
| 优先级 | P2/基础设施参考 |

## 52. X2 / Browser / Personal Finance 暂不投入类补充

| 字段 | 内容 |
|---|---|
| 仓库 | 本节汇总未单独展开的低优先补充项 |
| GitHub URL | 已在上方各卡片保留 |
| License | 分别待复核 |
| 最近活跃 | 分别见上方卡片 |
| 候选能力 | 个人理财、投资大师方法论、浏览器工具、量化论文转策略等都有局部价值，但不应挤占 P0/P1 金融市场数据和投研 skill 的评审资源。 |
| 直接可用性 | 仅可参考 |
| 核心代码 | 见各自卡片 |
| 外部依赖 | 见各自卡片 |
| 安全风险 | 投资建议、个人隐私、网页自动化、版权/数据授权 |
| 测试情况 | 见各自卡片 |
| QVeris 改造方式 | 作为后续专项储备，不进入第一批引入。 |
| 优先级 | 暂不投入 |

## 建议合并到主评审清单的新增 P0/P1

第一批建议把以下新增项合并到主评审材料：

1. `longbridge/skills` → `qveris-earnings-analysis`、`qveris-market-data`、`qveris-fundamentals`
2. `Stahl-G/sec-filing-legal-decoder` → `qveris-10k-risk-cards`
3. `ZhuLinsen/alphasift` → `qveris-a-share-factor-screen`
4. `fatecannotbealtered/cnstock-cli` → `qveris-cn-market-data-cli`
5. `HHFinAi/earnings-analysis` → `qveris-earnings-quality-score`
6. `daymade/claude-code-skills` → `qveris-financial-data-collector`
7. `wbh604/UZI-Skill` → 仅抽取数据维度和方法库，暂不直接引入
