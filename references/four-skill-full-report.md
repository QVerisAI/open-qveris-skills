# 四个 QVeris Finance Skill 产品化完整报告

报告日期：2026-07-02

工作分支：`codex/qveris-supply-chain-research`

本次覆盖的四个 skill：

| Skill | 中文定位 | 当前结论 |
| --- | --- | --- |
| `qveris-news-sentiment-radar` | 新闻情绪雷达 | 已从指令型 skill 升级为 preview 级别，可通过本地 runner 做 dry-run、真实 QVeris smoke test、报告和 trace 输出 |
| `qveris-portfolio-risk-monitor` | 组合风险监控 | 已具备组合输入、预算控制、QVeris 调用、报告和 trace；新闻催化剂能力在本次 preflight 中缺口明确 |
| `qveris-quant-factor-screen` | 量化因子筛选 | 已具备因子筛选 runner、fixture 回归和真实 QVeris smoke；当前先对昂贵数据做小样本验证 |
| `qveris-sector-rotation-map` | 板块轮动地图 | 已具备板块/ETF 代理输入、QVeris sector snapshot 调用、报告和 trace；ETF performance 能力在本次 preflight 中缺口明确 |

## 一、执行背景

飞书 SOP 的核心要求是：这批 QVeris skill 不能只停留在提示词或说明文档层面。每个 skill 必须重新评估数据适配、实现路径、确定性逻辑、测试证据和上线条件。

本次工作针对四个 P0/P1 finance skill，按 SOP 做了以下事情：

1. 盘点现状：检查 `SKILL.md`、`qveris.skill.json`、`references/`、`agents/`。
2. GitHub 调研：找类似开源项目，判断可参考内容和不可使用内容。
3. QVeris 数据适配：补 `qveris-tool-map.md`，记录候选工具、provider、参数模板、返回字段、成本和兜底策略。
4. 确定性脚本：实现 runner、QVeris adapter、transform、analysis、render、trace。
5. 测试：补 fixture 回归、Node 测试、dry-run 预检和真实 QVeris smoke test。
6. examples/artifacts：补可复制命令、报告、trace、Codex E2E 记录。
7. 元数据更新：把未真正上线的 `published` 降为 `preview`，并收缩已验证平台。

## 二、原始状态盘点

四个 skill 在远端分支里已经存在，但原始状态更接近“指令型 skill”：

| 检查项 | 原始状态 | 影响 |
| --- | --- | --- |
| `SKILL.md` | 有，但主要描述 Agent 应该怎么做 | 没有确定性 runner，执行路径依赖 Agent 临场发挥 |
| `qveris.skill.json` | 有，而且都写成 `published` | 与 SOP 不一致，因为还没有脚本、测试、trace 和平台验证 |
| `agent.md` | 有安装和 QVeris 调用提醒 | 没有指向可执行脚本，也没有明确失败处理 |
| `agents/openai.yaml` | 有 display name、description、default prompt | 没有机器可读输入输出 schema |
| `references/methodology.md` | 有方法论和 source inspiration | 没有经过验证的 QVeris tool map |
| `scripts/` | 缺失 | 无法 CI、无法本地回归、无法稳定复现 |
| `tests/` | 缺失 | 无法证明功能未回归 |
| `fixtures/` | 缺失 | 无法做离线回归 |
| `examples/` | 缺失 | 用户和 Agent 没有可复制命令 |
| `artifacts/` | 缺失 | 无真实 QVeris 调用报告和 trace |

因此，四个 skill 都不应该继续标记为 `published`。

## 三、GitHub 调研结论

本次调研的原则是：只借鉴方法、结构、测试思路和产品形态，不复制代码、prompt、README 文案、品牌或数据。

### 1. 可作为主参考的项目

| 项目 | License | 调研时 stars | 适合参考的方向 |
| --- | --- | ---: | --- |
| `AI4Finance-Foundation/FinGPT` | MIT | 20,766 | 金融新闻、情绪、RAG 金融文本分析、事件分类 |
| `AI4Finance-Foundation/FinRobot` | Apache-2.0 | 7,447 | 金融分析报告、多 Agent 研究流程、证据组织 |
| `virattt/ai-hedge-fund` | MIT | 60,737 | 多视角投资分析、风险经理、组合经理、基本面/技术面/情绪面拆分 |
| `microsoft/qlib` | MIT | 45,512 | 量化研究 pipeline、因子建模、实验/测试结构 |
| `AI4Finance-Foundation/FinRL` | MIT | 15,576 | 风险控制、市场环境、策略评估流程 |

### 2. 可作为次级参考的项目

| 项目 | License | 调研时 stars | 用途 |
| --- | --- | ---: | --- |
| `cooragent/ClarityFinance` | Apache-2.0 | 59 | Claude skill 风格、planning-with-files、金融分析 artifact 组织 |
| `AlainDaccache/Quantropy` | MIT | 182 | 风险因子、股票筛选、组合优化、模块边界 |
| `gyanesh-m/Sentiment-analysis-of-financial-news-data` | MIT | 133 | 简单新闻情绪 fixture 形态 |
| `zubair-trabzada/ai-trading-claude` | MIT | 179 | 金融 Agent UX、sector rotation 报告结构 |
| `garroshub/Quant_Sector_Rotation_Strategy` | MIT | 11 | ETF 板块轮动 momentum/volatility 思路 |
| `brianbeals/sector-rotation-screener` | MIT | 0 | sector ETF 测试和输出结构思路 |

### 3. 排除项目

排除原因主要是无 license、长期失修、课堂/demo 属性太强、或只适合概念参考。

| 项目 | 排除原因 |
| --- | --- |
| `BangaloreSharks/SharkStock` | 无 license，最后活跃时间太旧 |
| `rohanag/StockMarketSentimentAnalysis` | 无 license，最后活跃时间太旧 |
| `MBKraus/Python_Portfolio__VaR_Tool` | 无 license，且偏 GUI 工具 |
| `AdroitAnandAI/RRG-Sector-Rotation-India` | 无 license，只能把 RRG 作为公开概念独立实现 |

## 四、QVeris 数据适配结果

本次为四个 skill 都补了 `references/qveris-tool-map.md`。这些 tool map 不是凭空写的，而是通过 QVeris Discover / Inspect 预检得到的候选工具、参数和费用。

### 1. News Sentiment Radar

主要数据类别：

| 数据类别 | 候选工具 | provider | 用途 | 成本 |
| --- | --- | --- | --- | --- |
| 新闻情绪 | `alphavantage.news_sentiment.query.v1.467a92c0` | Alpha Vantage | 新闻和情绪主来源 | 2 credits/call |
| 聚合情绪 | `eodhd.sentiments.list.v1.9ba159a0` | EODHD | 股票/ETF/crypto 情绪分数 | 2.81 credits/call |
| 内部人情绪 | `finnhub.stock.insidersentiment.retrieve.v1.dff02940` | Finnhub | 补充情绪信号 | 1 credit/call |
| SEC filings | `finnhub.stock.filings.retrieve.v1.b6619ba1` | Finnhub | 判断是否有官方文件支持 | 1 credit/call |
| quote | `finnhub_io_api.stock.quote` | Finnhub | 价格反应 sanity check | 1 credit/call |

兜底策略：

- 新闻情绪失败时，用聚合情绪和 quote reaction，但明确标注缺少文章证据。
- filings 失败或无结果时，不把新闻自动当作官方确认。
- quote 失败时，可以输出催化剂证据，但不能做价格反应评分。

### 2. Portfolio Risk Monitor

主要数据类别：

| 数据类别 | 候选工具 | provider | 用途 | 成本 |
| --- | --- | --- | --- | --- |
| quote/live OHLCV | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | EODHD | quote、volume、流动性快照 | 2.81 credits/call |
| historical prices | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | FMP | 回撤、波动、历史表现 | 24.2 credits/call |
| company profile | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | FMP | sector/industry 暴露 | 24.2 credits/call |
| news sentiment | `alphavantage.news_sentiment.query.v1.467a92c0` | Alpha Vantage | 新闻催化剂风险 | 2 credits/call |
| CN beta/volatility | `cn_financial_pro.beta_volatility.v1` | CN Financial Pro | A 股 beta/波动路径 | 1 credit/result |

兜底策略：

- 历史价格过贵或缺失时，只输出 quote/news/profile，并把 volatility/drawdown 标为缺口。
- sector/profile 缺失时，不重新分配权重，直接标 unknown exposure。
- news 未命中时，保留数量化风险结论，但 catalyst risk 标为缺口。

### 3. Quant Factor Screen

主要数据类别：

| 数据类别 | 候选工具 | provider | 用途 | 成本 |
| --- | --- | --- | --- | --- |
| ratios | `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | FMP | valuation / quality 因子 | 24.2 credits/call |
| shares float | `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | FMP | liquidity / float 因子 | 24.2 credits/call |
| quote/live OHLCV | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | EODHD | quote 和 volume | 2.81 credits/call |
| quote fallback | `finnhub_io_api.stock.quote` | Finnhub | 低成本 quote | 1 credit/call |
| ROCR | `alphavantage.rocr.list.v1.467a92c0` | Alpha Vantage | momentum 因子 | 2 credits/call |
| BBANDS | `alphavantage.technical-indicators.bbands.v1` | Alpha Vantage | volatility / band context | 2 credits/call |

兜底策略：

- FMP ratios 超预算时，只跑 quote/momentum，并把 valuation/quality 标为 missing。
- 技术指标失败时，尝试 quote/history 兜底。
- 缺失 fundamentals 不能当作中性分处理。

### 4. Sector Rotation Map

主要数据类别：

| 数据类别 | 候选工具 | provider | 用途 | 成本 |
| --- | --- | --- | --- | --- |
| sector snapshot | `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | FMP | 美国市场板块表现快照 | 24.2 credits/call |
| available sectors | `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | FMP | 验证 sector 命名和覆盖 | 24.2 credits/call |
| ETF list | `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | FMP | ETF universe / proxy 校验 | 24.2 credits/call |
| ETF performance | `twelvedata.etfs.world.performance.retrieve.v1.792b716e` | Twelve Data | ETF 表现路径，当前命中不稳定 | 2.37 credits/call |
| CN adjusted price | `cn_financial_pro.adjusted_price.v1` | CN Financial Pro | 中国板块/指数代理价格 | 1 credit/result |
| CN industry flow | `mcp_gildata.industryrealsectorfundflow.v1` | Gildata | 中国行业资金流 | 1 credit/call |

兜底策略：

- sector snapshot 失败时，用 ETF proxy 的 quote/history 做部分图。
- ETF performance 不可用时，保留 sector snapshot 和 ETF universe 结果，并标记缺少 ETF performance。
- 非美国市场必须先验证 sector proxy mapping，再打分。

## 五、实现内容

本次新增了共享 runner：

`qveris-finance-common/runner.mjs`

它负责：

1. 参数解析：`--dry-run`、`--live`、`--fixture`、`--max-paid-calls`、`--max-credits`、`--output`、`--trace`。
2. QVeris Discover：按 skill 配置的查询发现候选工具。
3. QVeris Inspect：执行前检查工具参数、费用、成功率和候选能力。
4. QVeris Execute：只在 `--live` 模式下执行付费 Call。
5. 预算控制：超过 paid call 或 credits 上限时跳过。
6. strict preferred：关键能力没有命中经过验证的工具时，跳过并写入 trace，而不是随便 fallback 到不匹配工具。
7. 报告渲染：输出 Markdown。
8. trace 输出：输出 JSON，包含 tool id、execution id、费用、跳过原因和缺口。

四个 skill 各有自己的 runner 配置：

| Skill | runner |
| --- | --- |
| `qveris-news-sentiment-radar` | `qveris-news-sentiment-radar/scripts/run.mjs` |
| `qveris-portfolio-risk-monitor` | `qveris-portfolio-risk-monitor/scripts/run.mjs` |
| `qveris-quant-factor-screen` | `qveris-quant-factor-screen/scripts/run.mjs` |
| `qveris-sector-rotation-map` | `qveris-sector-rotation-map/scripts/run.mjs` |

## 六、测试和验证

### 1. 静态/语法检查

已执行：

```bash
node --check qveris-finance-common/runner.mjs
node --check qveris-news-sentiment-radar/scripts/run.mjs
node --check qveris-portfolio-risk-monitor/scripts/run.mjs
node --check qveris-quant-factor-screen/scripts/run.mjs
node --check qveris-sector-rotation-map/scripts/run.mjs
```

结果：通过。

### 2. Fixture 回归测试

已执行：

```bash
node --test \
  qveris-news-sentiment-radar/tests/runner.fixture.test.mjs \
  qveris-portfolio-risk-monitor/tests/runner.fixture.test.mjs \
  qveris-quant-factor-screen/tests/runner.fixture.test.mjs \
  qveris-sector-rotation-map/tests/runner.fixture.test.mjs
```

结果：

| 测试 | 结果 |
| --- | --- |
| news sentiment fixture | pass |
| portfolio risk fixture | pass |
| quant factor fixture | pass |
| sector rotation fixture | pass |

### 3. Dry-run 预检

四个 skill 都执行了 `--dry-run`，只跑 Discover / Inspect，不产生付费 Call。

| Skill | 产物 |
| --- | --- |
| `qveris-news-sentiment-radar` | `artifacts/dry-run.md`, `artifacts/dry-run-trace.json` |
| `qveris-portfolio-risk-monitor` | `artifacts/dry-run.md`, `artifacts/dry-run-trace.json` |
| `qveris-quant-factor-screen` | `artifacts/dry-run.md`, `artifacts/dry-run-trace.json` |
| `qveris-sector-rotation-map` | `artifacts/dry-run.md`, `artifacts/dry-run-trace.json` |

### 4. 真实 QVeris smoke test

四个 skill 都跑了真实 `--live` QVeris 调用。

| Skill | Paid calls | Credits | 结果 |
| --- | ---: | ---: | --- |
| `qveris-news-sentiment-radar` | 4 | 6.81 | 3 个成功，filings check 返回 unsuccessful，已作为缺口保留 |
| `qveris-portfolio-risk-monitor` | 3 | 51.21 | quote、历史价格、profile 成功；news catalyst 因 strict preferred 未命中而跳过 |
| `qveris-quant-factor-screen` | 4 | 51.4 | ratios、float、quote、technical indicator 成功 |
| `qveris-sector-rotation-map` | 3 | 72.6 | sector snapshot、available sectors、ETF list 成功；ETF performance 因 strict preferred 未命中而跳过 |

真实调用 execution id：

| Skill | Execution IDs |
| --- | --- |
| `qveris-news-sentiment-radar` | `70d0672a-6a6d-4862-b00f-315b1aa76fad`, `4d8f4af4-f70f-48f5-808e-662db1033dad`, `0d4cc78f-0a92-40d6-8c48-602579e36110`, `c08314af-3d5a-48b9-8712-56510c189fe5` |
| `qveris-portfolio-risk-monitor` | `b961be79-5b4b-424e-8ddb-3324eaa904c7`, `220c6ea3-ee30-4310-8b6f-aa7342e75fb7`, `d606dca9-b277-4502-a10b-741df3a5b6c8` |
| `qveris-quant-factor-screen` | `987a0b10-8660-4f6c-b1a9-c0a2f57b350e`, `5eb8e072-57d1-4f0a-aebe-ff3ee647e9f7`, `9ec94a39-5f8a-4fe1-99e5-17e1107c32b4`, `39378274-360d-40d3-acba-c0586317fdaa` |
| `qveris-sector-rotation-map` | `03bb593c-c359-46f8-b782-55a8f8b641f0`, `6368bb54-97e5-4879-989d-0e21f09882e4`, `f83f4b3b-e4e5-4355-aba2-5e9841a7b332` |

### 5. Secret 扫描

对 artifacts JSON 做了关键词扫描：

- `QVERIS_API_KEY`
- `Bearer`
- `Authorization`
- `access_token`
- `api_key`
- `API_KEY`

结果：未发现真实密钥。早期 trace 中有 provider 文档里的 `API_KEY` 占位示例，已通过 trace 精简清理掉。

## 七、Codex E2E

四个 skill 都写入了 Codex E2E 记录，模拟自然语言任务映射到 runner 命令，并保存报告和 trace。

| Skill | Codex E2E 产物 |
| --- | --- |
| `qveris-news-sentiment-radar` | `qveris-news-sentiment-radar/artifacts/codex-e2e.md` |
| `qveris-portfolio-risk-monitor` | `qveris-portfolio-risk-monitor/artifacts/codex-e2e.md` |
| `qveris-quant-factor-screen` | `qveris-quant-factor-screen/artifacts/codex-e2e.md` |
| `qveris-sector-rotation-map` | `qveris-sector-rotation-map/artifacts/codex-e2e.md` |

OpenClaw E2E 没有跑。原因是本轮你明确说“第八个用 Codex 跑就行”，所以本次把 OpenClaw 标为 pending，没有把 skill 标回 published。

## 八、qveris.skill.json 更新

四个 skill 的元数据做了以下调整：

1. `status`: 从 `published` 改为 `preview`。
2. `platforms`: 从 `openclaw/cursor/claude-code/cli` 收缩为 `cli`。
3. 增加 `validation` 字段，指向 runner、fixture test、examples、live smoke trace、Codex E2E。
4. 增加 `status_note`，说明为什么当前是 preview。
5. `usage_estimate` 增加 evidence 说明，标明估算来自 QVeris Discover / Inspect 和 live smoke。

这样做的原因是：按 SOP，没有 OpenClaw 和多平台验证前，不能把未验证平台写成已上线能力。

## 九、每个 skill 的当前能力与限制

### 1. qveris-news-sentiment-radar

当前能力：

- 支持 ticker、market、window-days、预算控制。
- 能发现并调用新闻情绪、聚合情绪、filings、quote 类工具。
- 输出报告和 trace。
- 已真实跑 NVDA 7-day smoke。

限制：

- filings check 本次返回 unsuccessful，需要作为缺失证据处理。
- 情绪判断当前主要是 evidence table 和基础文本统计，还不是完整 NLP 分类器。

### 2. qveris-portfolio-risk-monitor

当前能力：

- 支持 holdings 输入，例如 `AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15`。
- 计算基础 concentration HHI。
- 调用 quote、historical prices、profile/sector。
- 输出报告和 trace。

限制：

- news catalyst 调用本次 preflight 没命中严格首选工具，因此跳过。
- 完整 portfolio risk 里的 volatility、drawdown、liquidity 还可以继续深化为更完整的数值计算。

### 3. qveris-quant-factor-screen

当前能力：

- 支持 universe 输入。
- 调用 ratios、shares float、quote、technical indicator。
- 明确因子集合：momentum、valuation、liquidity、volatility、quality、news risk。
- 输出报告和 trace。

限制：

- 当前 live smoke 为成本可控，只对第一个 ticker 做昂贵因子输入。
- 下一步需要扩展为批量 universe 评分，并把 missing factor policy 固化得更细。

### 4. qveris-sector-rotation-map

当前能力：

- 支持 sector ETF/proxy list 和 benchmark。
- 调用 sector snapshot、available sectors、ETF list。
- 输出报告和 trace。

限制：

- ETF performance 严格首选工具本次没有命中，因此跳过。
- 轮动 phase/quadrant 目前是框架级输出，下一步需要用历史数据算 relative strength 和 momentum。

## 十、产物清单

每个 skill 现在都有：

| 类型 | 路径 |
| --- | --- |
| runner | `*/scripts/run.mjs` |
| QVeris tool map | `*/references/qveris-tool-map.md` |
| fixture | `*/fixtures/*.json` |
| test | `*/tests/runner.fixture.test.mjs` |
| examples | `*/examples/README.md` |
| dry-run report/trace | `*/artifacts/dry-run.md`, `*/artifacts/dry-run-trace.json` |
| live smoke report/trace | `*/artifacts/live-smoke.md`, `*/artifacts/live-smoke-trace.json` |
| Codex E2E | `*/artifacts/codex-e2e.md` |

新增共享模块：

`qveris-finance-common/runner.mjs`

新增完整 SOP 汇总：

`references/four-skill-full-report.md`

## 十一、结论

本次四个 skill 已经从“只有说明和提示词的候选 skill”推进到“preview 级产品化 skill”。

已经完成：

- GitHub source review
- QVeris tool map
- deterministic runner
- dry-run preflight
- fixture regression
- live QVeris smoke test
- report and trace artifacts
- Codex E2E
- metadata 降级与 validation 指针

尚未完成：

- OpenClaw E2E
- 多平台验证
- 更完整的批量因子计算和板块轮动 scoring
- 根据更多真实样本继续优化 tool selection 和 fallback

因此，当前状态应该是 `preview`，不应该是 `published`。完成 OpenClaw 和更多真实样本验证后，才适合进入 published。
