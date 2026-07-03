# 四个 QVeris Finance Skill 的 GitHub 参考来源与修改说明

日期：2026-07-03

分支：`codex/qveris-supply-chain-research`

覆盖 skill：

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

## 一、参考方式说明

这次 GitHub 调研只用于产品形态、方法论、测试结构和产物格式参考。没有复制外部仓库的代码、prompt、README 文案、模型、数据集、UI 资源或 vendor 集成。

最终实现保持 QVeris-native：真实数据来自 QVeris Discover / Inspect / Execute，离线测试来自本仓库 fixtures，报告和 trace 由本仓库 runner 生成。

## 二、参考过的 GitHub 仓库

| GitHub 仓库 | 主要参考 skill | 参考点 | 最终怎么落到本仓库 |
| --- | --- | --- | --- |
| [AI4Finance-Foundation/FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) | `qveris-news-sentiment-radar` | 金融新闻、情绪、事件文本分析的任务分类和证据组织方式 | 在 news skill 里把数据路径拆成 news sentiment、aggregate sentiment、filings check、price reaction；报告里明确情绪证据和 missing-data 风险 |
| [AI4Finance-Foundation/FinRobot](https://github.com/AI4Finance-Foundation/FinRobot) | `qveris-news-sentiment-radar`、四个 skill 通用 | 金融分析报告的 evidence-backed report 结构 | 四个 skill 的输出统一为 Scope、Findings、Evidence、Missing Data And Risks、QVeris Usage |
| [cooragent/ClarityFinance](https://github.com/cooragent/ClarityFinance) | `qveris-news-sentiment-radar`、`qveris-quant-factor-screen` | skill-style planning、artifact 留痕、agent 可读工作流 | 每个 skill 补 `examples/README.md`、`artifacts/*.md`、`artifacts/*-trace.json`，并让 `SKILL.md` / `agent.md` 指向确定性 runner |
| [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | `qveris-portfolio-risk-monitor`、`qveris-sector-rotation-map` | 多视角投资分析、风险经理、组合经理、技术/基本面/情绪/风险分层 | portfolio skill 拆出 quote、history、profile/sector、news catalyst 等角色；sector skill 拆出 performance、sector list、ETF search 等证据角色 |
| [microsoft/qlib](https://github.com/microsoft/qlib) | `qveris-portfolio-risk-monitor`、`qveris-quant-factor-screen`、`qveris-sector-rotation-map` | 量化 pipeline、因子建模、实验/回归测试纪律 | 新增公共 `qveris-finance-common/runner.mjs`，把 preflight、execute、analysis、render、trace 固化；四个 skill 都补 fixture test |
| [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL) | `qveris-portfolio-risk-monitor`、`qveris-quant-factor-screen` | risk control、market environment、evaluation workflow | 把风险提示、预算限制、not investment advice、missing-field policy 写进 runner 输出和各 skill metadata |
| [AlainDaccache/Quantropy](https://github.com/AlainDaccache/Quantropy) | `qveris-portfolio-risk-monitor`、`qveris-quant-factor-screen` | risk factor、stock screening、portfolio module 边界 | quant skill 定义 momentum、valuation、liquidity、volatility、quality、news risk 因子集合；portfolio skill 增加 concentration 和风险 lens |
| [gyanesh-m/Sentiment-analysis-of-financial-news-data](https://github.com/gyanesh-m/Sentiment-analysis-of-financial-news-data) | `qveris-news-sentiment-radar` | 简单新闻情绪 fixture 形态 | news fixture 保留 headline/sentiment 风格的最小可回归输入，但真实数据路径改为 QVeris |
| [zubair-trabzada/ai-trading-claude](https://github.com/zubair-trabzada/ai-trading-claude) | `qveris-sector-rotation-map` | finance agent UX、sector rotation/report workflow | sector skill 的 examples 和 report 组织成 agent 可直接复用的命令与报告结构 |
| [garroshub/Quant_Sector_Rotation_Strategy](https://github.com/garroshub/Quant_Sector_Rotation_Strategy) | `qveris-sector-rotation-map` | sector ETF rotation、momentum/volatility 信号思路 | sector skill 采用 sector ETF/proxy list、benchmark、window-days 作为输入，并保留 momentum/volatility/relative strength 的后续计算接口 |
| [brianbeals/sector-rotation-screener](https://github.com/brianbeals/sector-rotation-screener) | `qveris-sector-rotation-map` | 11-sector ETF screener、测试和输出形态 | sector fixture/test 采用 sector proxy set 的结构，输出 Evidence 表和 rotation risk caveat |

## 三、排除的 GitHub 仓库

| GitHub 仓库 | 排除原因 |
| --- | --- |
| [BangaloreSharks/SharkStock](https://github.com/BangaloreSharks/SharkStock) | 无明确 license，且项目陈旧 |
| [rohanag/StockMarketSentimentAnalysis](https://github.com/rohanag/StockMarketSentimentAnalysis) | 无明确 license，且项目陈旧 |
| [MBKraus/Python_Portfolio__VaR_Tool](https://github.com/MBKraus/Python_Portfolio__VaR_Tool) | 无明确 license，且偏 GUI 工具，不适合作为实现来源 |
| [AdroitAnandAI/RRG-Sector-Rotation-India](https://github.com/AdroitAnandAI/RRG-Sector-Rotation-India) | 无明确 license，只保留 RRG/relative rotation 公开概念，不使用代码或文案 |

## 四、公共层怎么改

新增文件：

- `qveris-finance-common/runner.mjs`

这个文件是四个 skill 的公共执行底座，负责：

- 解析 CLI 参数：`--dry-run`、`--live`、`--fixture`、`--max-paid-calls`、`--max-credits`、`--output`、`--trace`
- 读取 `QVERIS_API_KEY`
- 调 QVeris `/search` 做 Discover
- 调 QVeris `/tools/by-ids` 做 Inspect
- 调 QVeris `/tools/execute` 做真实 Execute
- 按 `maxPaidCalls` 和 `maxCredits` 控制预算
- 选择首选工具；设置 `strictPreferred` 时，不用不匹配工具硬凑结果
- 生成 Markdown 报告
- 生成 JSON trace，记录 `tool_id`、`execution_id`、cost、ok/error、preflight 信息

这样四个 skill 不再各自临场拼 QVeris 调用，而是共享一套可复现、可测试、可审计的执行方式。

## 五、四个 skill 分别怎么改

### 1. `qveris-news-sentiment-radar`

参考来源：

- FinGPT：金融新闻和情绪任务拆分
- FinRobot：证据型金融报告结构
- ClarityFinance：skill artifact 留痕方式
- Sentiment-analysis-of-financial-news-data：最小情绪 fixture 形态

主要修改：

- 新增 `scripts/run.mjs`：定义 news sentiment、market reaction、filings 三类 QVeris tool category
- 新增 call plan：
  - `market_news_sentiment`
  - `aggregate_sentiment`
  - `filings_check`
  - `price_reaction`
- 新增 `references/source-review.md`：记录 GitHub 调研
- 新增 `references/qveris-tool-map.md`：记录已验证 QVeris 工具、provider、参数、返回字段、成本和兜底策略
- 新增 `fixtures/normal-news-sentiment.json`
- 新增 `tests/runner.fixture.test.mjs`
- 新增 `examples/README.md`
- 新增 `artifacts/dry-run.md`、`artifacts/dry-run-trace.json`
- 新增 `artifacts/live-smoke.md`、`artifacts/live-smoke-trace.json`
- 新增 `artifacts/codex-e2e.md`
- 更新 `SKILL.md` 和 `agent.md`：要求优先调用确定性 runner
- 更新 `qveris.skill.json`：从 `published` 调整为 `preview`，补 validation、qveris_api、usage_estimate、platforms

真实 QVeris smoke test：

- paid calls：4
- estimated credits：6.81
- 已记录 execution_id 到 `artifacts/live-smoke-trace.json`

### 2. `qveris-portfolio-risk-monitor`

参考来源：

- ai-hedge-fund：风险经理/组合经理式多视角分析
- qlib：pipeline 和测试纪律
- FinRL：risk control 和 evaluation framing
- Quantropy：组合风险和 factor module 边界

主要修改：

- 新增 `scripts/run.mjs`：支持 holdings、market、benchmark、window-days 输入
- 新增 call plan：
  - `quote_snapshot`
  - `historical_prices`
  - `profile_sector`
  - `news_catalyst`
- 新增组合集中度 HHI 计算
- 新增最大非现金持仓识别
- 新增 `references/source-review.md`
- 新增 `references/qveris-tool-map.md`
- 新增 `fixtures/normal-portfolio-risk.json`
- 新增 `tests/runner.fixture.test.mjs`
- 新增 `examples/README.md`
- 新增 dry-run、live-smoke、trace、Codex E2E artifacts
- 更新 `SKILL.md` 和 `agent.md`：要求通过 runner 产出报告和 trace
- 更新 `qveris.skill.json`：降为 `preview`，补 validation 和真实调用证据

真实 QVeris smoke test：

- paid calls：3
- estimated credits：51.21
- `news_catalyst` 因本次 preflight 没命中严格首选工具而跳过，已在 trace 中保留缺口

### 3. `qveris-quant-factor-screen`

参考来源：

- qlib：因子 pipeline、factor modeling、实验结构
- FinRL：评估和风险提示
- Quantropy：stock screening 和 risk factor module
- ClarityFinance：报告与 artifact 组织

主要修改：

- 新增 `scripts/run.mjs`：支持 universe、market、window-days、预算限制输入
- 新增 factor set：
  - momentum
  - valuation
  - liquidity
  - volatility
  - quality
  - news risk
- 新增 call plan：
  - `valuation_ratios`
  - `liquidity_float`
  - `quote_snapshot`
  - `momentum_or_volatility`
- 新增 `references/source-review.md`
- 新增 `references/qveris-tool-map.md`
- 新增 `fixtures/normal-factor-screen.json`
- 新增 `tests/runner.fixture.test.mjs`
- 新增 `examples/README.md`
- 新增 dry-run、live-smoke、trace、Codex E2E artifacts
- 更新 `SKILL.md` 和 `agent.md`
- 更新 `qveris.skill.json`：降为 `preview`，补 validation、qveris_api、usage_estimate

真实 QVeris smoke test：

- paid calls：4
- estimated credits：51.4
- 当前 smoke 为成本可控，只对小样本做验证；完整 ranking table 和 score normalization 还未产品化

### 4. `qveris-sector-rotation-map`

参考来源：

- qlib：ranking、factor normalization、回测纪律
- ai-hedge-fund：多视角市场分析
- ai-trading-claude：agent-facing finance report UX
- Quant_Sector_Rotation_Strategy：sector ETF momentum/volatility 思路
- sector-rotation-screener：sector ETF screener 测试和输出形态

主要修改：

- 新增 `scripts/run.mjs`：支持 sectors、benchmark、market、window-days 输入
- 新增 call plan：
  - `sector_performance_snapshot`
  - `available_sectors`
  - `etf_symbol_search`
  - `etf_performance`
- 新增 `references/source-review.md`
- 新增 `references/qveris-tool-map.md`
- 新增 `fixtures/normal-sector-rotation.json`
- 新增 `tests/runner.fixture.test.mjs`
- 新增 `examples/README.md`
- 新增 dry-run、live-smoke、trace、Codex E2E artifacts
- 更新 `SKILL.md` 和 `agent.md`
- 更新 `qveris.skill.json`：降为 `preview`，补 validation 和真实调用证据

真实 QVeris smoke test：

- paid calls：3
- estimated credits：72.6
- `etf_performance` 因本次 preflight 没命中严格首选工具而跳过，已在 trace 中保留缺口

## 六、共同修改模式

四个 skill 都按同一套 SOP 做了这些改动：

| 类型 | 修改内容 |
| --- | --- |
| GitHub 调研 | 每个 skill 新增 `references/source-review.md` |
| QVeris 工具映射 | 每个 skill 新增 `references/qveris-tool-map.md` |
| 确定性执行 | 每个 skill 新增 `scripts/run.mjs`，共享 `qveris-finance-common/runner.mjs` |
| 离线回归 | 每个 skill 新增 `fixtures/*.json` 和 `tests/runner.fixture.test.mjs` |
| 可复制示例 | 每个 skill 新增 `examples/README.md` |
| 执行证据 | 每个 skill 新增 dry-run 和 live-smoke 的 report/trace |
| Codex 验证 | 每个 skill 新增 `artifacts/codex-e2e.md` |
| 元数据 | 每个 skill 的 `qveris.skill.json` 从 `published` 改为 `preview`，并补 validation 指针 |
| Agent 指令 | 每个 skill 的 `SKILL.md` / `agent.md` 改为优先使用 runner，不再只靠自由发挥 |

## 七、当前状态

已经完成：

- GitHub 调研和 clean-room 参考记录
- QVeris tool map
- runner / adapter / transform / analysis / render / trace
- dry-run
- fixture regression test
- 真实 QVeris smoke test
- Codex E2E 记录
- skill metadata 降级为 `preview`

尚未完成：

- OpenClaw / Skill Hub 平台端到端验证
- 正式上线级 output JSON schema
- 更多真实业务场景样例
- quant factor 的完整 ranking table、score normalization、tie-break rule
- sector rotation 的完整 relative strength / momentum quadrant
- portfolio risk 的更完整 volatility、drawdown、correlation、VaR 计算

因此这四个 skill 当前适合标记为 `preview`，不适合直接标记为 `published`。
