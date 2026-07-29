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

- 解析 CLI 参数：`--dry-run`、`--live`、`--fixture`、`--max-paid-calls`、`--max-credits`、`--output`、`--json-output`、`--trace`
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

## 七、后续追加工作

在完成初版 runner、tool map、fixture、live smoke 和报告后，又继续补了几块上线前更关键的东西。

### 1. 补正式业务 output JSON

之前只有两类产物：

- Markdown 报告：给人读。
- trace JSON：给审计和排查调用链读。

后续补了第三类产物：

- business output JSON：给平台、前端或下游系统稳定消费。

具体修改：

- `qveris-finance-common/runner.mjs`
  - 新增 `--json-output PATH`
  - 新增 `buildBusinessOutput`
  - 每次运行可以同时生成 Markdown report、business output JSON、trace JSON
- `qveris-finance-common/schema-validator.mjs`
  - 新增轻量 schema 校验器
  - 测试时不用额外引入依赖，也能校验 required、type、enum、array items 等基础 schema 规则
- 每个 skill 新增：
  - `schemas/output.schema.json`
  - `artifacts/fixture-output.json`
- 每个 skill 的 `tests/runner.fixture.test.mjs` 都升级为：
  - 跑 fixture
  - 生成 report
  - 生成 trace
  - 生成 business output JSON
  - 按 `schemas/output.schema.json` 校验 business output
- 每个 skill 的 `examples/README.md` 都补了 `--json-output`
- 每个 skill 的 `qveris.skill.json` 都补了：
  - `output_schema`
  - `fixture_output`

这一步解决的是：平台不能只靠 Markdown 或 trace 上线，必须有稳定业务结果合同。

### 2. 四个 skill 的业务 JSON 现在长什么样

四个 skill 的 business output 都有共同外壳：

```json
{
  "schema_version": "2026-07-03",
  "skill_id": "...",
  "generated_at": "...",
  "mode": "fixture | dry-run | live",
  "scope": {},
  "findings": [],
  "evidence": [],
  "risks": [],
  "usage": {
    "paid_calls": 0,
    "estimated_credits": 0
  },
  "result": {}
}
```

各 skill 的 `result` 字段不同：

| Skill | `result` 重点字段 |
| --- | --- |
| `qveris-news-sentiment-radar` | `ticker`、`sentiment_counts`、`total_records`、`signal_level`、`catalyst_status`、`missing_data` |
| `qveris-portfolio-risk-monitor` | `top_holding`、`concentration_hhi`、`concentration_level`、`measurable_risks`、`missing_metrics`、`missing_data` |
| `qveris-quant-factor-screen` | `universe`、`factor_set`、`coverage_roles`、`ranking_ready`、`missing_outputs`、`missing_data` |
| `qveris-sector-rotation-map` | `sector_proxies`、`benchmark`、`total_records`、`signal_framework`、`phase_labels_ready`、`missing_outputs`、`missing_data` |

### 3. OpenClaw / Skill Hub 检查结果

本机 WSL 里有一个 `openclaw` 命令，但它不是 Skill Hub 平台 CLI，而是另一个会启动并查找 `CLAW.REZ` 的程序。因此没有把 OpenClaw / Skill Hub E2E 伪装成已完成。

新增记录：

- `references/openclaw-skillhub-e2e-check.md`

结论：

- QVeris CLI 可用。
- Codex CLI 可用。
- 但本机没有可用的 OpenClaw / Skill Hub 平台调度入口。
- 四个 skill 的 `qveris.skill.json` 里保留 `openclaw_e2e: pending`，并补 `openclaw_e2e_blocker` 指针。

### 4. 用 WSL Codex CLI 做了四个真实 E2E

按用户要求，不再管 Skill Hub，改用 WSL 里的 `codex exec` 做真实使用方验证。

执行方式：

- Codex CLI：`/home/wjh/.local/opt/node-v24.15.0-linux-x64/bin/codex`
- Codex 版本：`codex-cli 0.130.0`
- 模型：`gpt-5.5`
- 每个 skill 一个独立 `CODEX_HOME`
- 每个 `CODEX_HOME/skills` 里只安装一个目标 skill
- 四个 Codex 会话并行跑
- 工作目录：`/home/wjh/matecode/open-qveris-skills-qveris-research`
- 模式：真实 QVeris live，不是 dry-run，也不是 fixture

隔离目录：

- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-news-sentiment-radar`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-portfolio-risk-monitor`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-quant-factor-screen`
- `/home/wjh/matecode/qveris-codex-skill-e2e/qveris-sector-rotation-map`

新增总报告：

- `references/codex-cli-four-skill-e2e-report.md`

每个 skill 新增三份 Codex CLI live artifact：

- `artifacts/codex-cli-live.md`
- `artifacts/codex-cli-live-output.json`
- `artifacts/codex-cli-live-trace.json`

### 5. WSL Codex CLI E2E 结果

| Skill | Codex CLI E2E 结论 | Paid calls | Credits | 主要缺口 |
| --- | --- | ---: | ---: | --- |
| `qveris-news-sentiment-radar` | 跑通 | 4 | 6.81 | `filings_check` 和 `price_reaction` 返回 no records / unsuccessful |
| `qveris-portfolio-risk-monitor` | 跑通 | 3 | 49.4 | `news_catalyst` 被跳过；`quote_snapshot` provider unsuccessful |
| `qveris-quant-factor-screen` | 跑通 | 4 | 51.4 | 当前只验证首个 ticker 的因子证据；还没有完整 ranking table |
| `qveris-sector-rotation-map` | 跑通 | 3 | 72.6 | `etf_performance` 被跳过；还没有 rotation quadrant |

执行 ID：

| Skill | execution_id |
| --- | --- |
| `qveris-news-sentiment-radar` | `fe656bd3-5e73-42d0-922a-9d0498e7dd1c`, `f4321b89-8b22-42d0-b4f9-ea36db694f80`, `5ff86d84-869a-45d2-afd7-8548331126f2`, `13cc8685-c772-4eb8-9405-7862a5b72576` |
| `qveris-portfolio-risk-monitor` | `47d85aeb-230f-4618-82a4-c7efbaf54fd0`, `3ce118f8-cd6d-48f2-b0d6-5c16d9290023`, `7771d7a5-3a9c-4804-a887-d15fa91242d4` |
| `qveris-quant-factor-screen` | `f97575ad-d0c8-4127-9c78-6d344ba82dc5`, `1e23402a-8938-4cc0-86c6-87086729e9e1`, `86895d55-09f9-4ff5-9029-968c83ce2ed6`, `c23225cc-a30a-40dd-be19-75c22f7d386c` |
| `qveris-sector-rotation-map` | `5701f6fb-8279-4bc8-a1e6-75b8a04104a8`, `c7ac9d90-288c-4829-9753-0a949e9add7f`, `cb738819-7bd7-4a03-96af-1b7df814de66` |

这一步证明的是：

- Codex CLI 能在隔离安装环境里识别并使用单个 skill。
- Codex 能按 skill 指令调用真实 QVeris live 流程。
- 每个 skill 都能产出 Markdown、business JSON、trace。
- 每个 `codex-cli-live-output.json` 都通过对应 `schemas/output.schema.json` 校验。

### 6. 后续新增 commit

| Commit | 内容 |
| --- | --- |
| `aefb49f` | 新增完整报告和 GitHub 参考/修改说明文档 |
| `7123caf` | 新增 business output schema、`--json-output`、schema validator、fixture output 和 schema 测试 |
| `6e02c92` | 新增 WSL Codex CLI 四 skill 真实 E2E 证据 |

当前本地分支比远端同名分支 ahead 7。之前尝试 push 失败过：一次是当前 GitHub 凭据没有 `QVerisAI/open-qveris-skills` 写权限，后续又遇到连接 reset。因此这些本地 commit 还没有更新到远端 PR。

## 八、当前状态

已经完成：

- GitHub 调研和 clean-room 参考记录
- QVeris tool map
- runner / adapter / transform / analysis / render / trace
- dry-run
- fixture regression test
- 正式业务 output JSON schema、`--json-output` 和 fixture output 样例
- 真实 QVeris smoke test
- Codex E2E 记录
- WSL Codex CLI 四实例真实 E2E
- skill metadata 降级为 `preview`

尚未完成：

- OpenClaw / Skill Hub 平台端到端验证
- 更多真实业务场景样例
- quant factor 的完整 ranking table、score normalization、tie-break rule
- sector rotation 的完整 relative strength / momentum quadrant
- portfolio risk 的更完整 volatility、drawdown、correlation、VaR 计算
- 推送本地 ahead 7 commit 到远端 PR 分支

因此这四个 skill 当前适合标记为 `preview`，不适合直接标记为 `published`。

## 2026-07-03 Skill-side hardening addendum

This addendum records the later skill-side fixes after the initial SOP delivery. It is intentionally appended in ASCII because the earlier Chinese text in this file is already stored with mojibake in this checkout.

### Common runner changes

- `qveris-finance-common/runner.mjs`
  - Added ordered provider fallback across preferred, provider, inspected, and discovered tools.
  - Added `fallbackOnEmpty`, `fallbackOnUnsuccessful`, and per-role `maxAttempts`.
  - Added trace rows for `fallback_attempt` and `fallback_skipped`.
  - Preserved unsuccessful provider calls in evidence instead of hiding them.
  - Normalized tool IDs from either `tool_id` or `id`.
  - Exported `resultPayload` and `countRecords` for deterministic transforms.
- `qveris-finance-common/schema-validator.mjs`
  - Added `null` type support for structured fields such as `risk_metrics`.

### Skill-specific fixes

| Skill | Fix |
| --- | --- |
| `qveris-news-sentiment-radar` | Added capped filings fallback, EODHD price-reaction fallback, `catalyst_confidence_score`, and `corroborating_roles`. Filings can fail without starving the price-reaction role. |
| `qveris-portfolio-risk-monitor` | Split historical prices into a strict historical-price discovery category, preventing quote tools from filling the history role. Added top-holding volatility, max drawdown, and historical VaR from returned closes. |
| `qveris-quant-factor-screen` | Added deterministic partial `ranking_table`, `factor_weights`, `tie_break_rules`, `coverage_level`, and EODHD quote fallback. |
| `qveris-sector-rotation-map` | Added snapshot-derived `rotation_quadrants`, `momentum_scores`, `relative_strength_scores`, nested payload extraction, sector-name aliases, and FMP `averageChange` parsing. |

### Hardening live verification

Artifact prefix for each skill: `artifacts/hardening-live-20260703.*`.

| Skill | Result | Paid calls | Credits | Execution IDs |
| --- | --- | ---: | ---: | --- |
| `qveris-news-sentiment-radar` | News, aggregate sentiment, and EODHD price reaction succeeded; filings remained missing. | 5 | 9.62 | `2d9c86b4-eda6-4c81-afba-005b6f6f99eb`, `5aedd7ae-ce90-4045-afb8-6521aa63c825`, `2789fe2a-148e-4946-9a1f-0730d282ac93`, `feda7e34-4644-4244-ae44-0bdb4934ccad`, `51c7d248-4d5c-4059-952a-561b9369127a` |
| `qveris-portfolio-risk-monitor` | Quote, FMP historical prices, profile, and EODHD news all succeeded; risk metrics populated; correlation remains missing. | 4 | 54.02 | `38fa36b7-952c-4dfb-9828-892328a084ec`, `6170f7cb-7b04-44fb-aace-8c7bc4cf70f3`, `59c3bddf-ef86-4b4e-9316-523d89974bd2`, `e1224f9b-bf32-40e9-9e23-ca4045545763` |
| `qveris-quant-factor-screen` | Valuation, float, EODHD quote, and BBANDS succeeded; partial ranking output is populated; complete-universe ranking remains missing. | 4 | 53.21 | `354836bf-efc6-4fd4-9494-7b629f764212`, `12566c61-8cc1-48bf-bd90-5c0b728f8715`, `1e798482-8966-4ca5-a096-f9fffec8f3ab`, `0e816a4d-225e-446a-a178-c547edf4bd57` |
| `qveris-sector-rotation-map` | FMP sector snapshot, available sectors, and ETF list succeeded; Twelve Data ETF performance failed; snapshot quadrants and scores are populated. | 4 | 74.97 | `5557d60b-9208-4806-9e39-c50ab5b3c49e`, `c526e7e5-71df-4da2-8005-f470b0184711`, `ff55839d-3f73-44ff-841b-e21c8b8d64b8`, `f492783d-0a61-4cca-b9a3-707b863af1a8` |

Additional paid debug call for sector transform: `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159`, 24.2 credits, `execution_id=7f2fcdde-340d-46df-bedb-5d8fa46d1396`. It identified the FMP `averageChange` field used by the final sector parser.

### Verification commands

```bash
node --check qveris-finance-common/runner.mjs
node --check qveris-finance-common/schema-validator.mjs
node --check qveris-news-sentiment-radar/scripts/run.mjs
node --check qveris-portfolio-risk-monitor/scripts/run.mjs
node --check qveris-quant-factor-screen/scripts/run.mjs
node --check qveris-sector-rotation-map/scripts/run.mjs
node --test qveris-news-sentiment-radar/tests/runner.fixture.test.mjs qveris-portfolio-risk-monitor/tests/runner.fixture.test.mjs qveris-quant-factor-screen/tests/runner.fixture.test.mjs qveris-sector-rotation-map/tests/runner.fixture.test.mjs
```

All four final hardening live outputs passed their corresponding `schemas/output.schema.json` validation.

## 九、2026-07-03 重新自然语言安装态 E2E

本节是最新准线，覆盖前面 `codex-cli-live` 旧结果里的若干 preview 缺口。区别是：

- 旧 `codex-cli-live`：在初版 runner 和初版输出契约后跑，暴露了 quote、ranking、quadrant、correlation 等 skill 侧缺口。
- `hardening-live` / `repair-live`：直接用 runner 修复并验证这些 skill 侧缺口。
- 最新 `codex-cli-natural-e2e-20260703`：重新用四个独立 Codex CLI 安装单个 skill，再用自然语言任务触发真实 QVeris live 流程，验证“安装后的 skill 能不能被 Codex 按说明真实使用”。

这轮不是主会话直接手工调用脚本，而是四个 Codex CLI 子会话各自读取安装到 `CODEX_HOME/skills/<skill>/SKILL.md` 的 skill 指令，然后按 skill 指令调用确定性 runner。runner 仍然是 skill 的标准执行入口，因为四个 `SKILL.md` 都明确要求优先使用它来保证 trace、预算、schema 和报告可复现。

执行环境：

- Codex CLI：`/home/wjh/.local/opt/node-v24.15.0-linux-x64/bin/codex`
- 模型：`gpt-5.5`
- 工作目录：`/home/wjh/matecode/open-qveris-skills-qveris-research`
- 安装方式：每个 skill 一个独立 `CODEX_HOME`，每个 `CODEX_HOME/skills` 里只放一个目标 skill
- 数据模式：真实 QVeris live，不是 dry-run，不是 fixture
- 产物前缀：`artifacts/codex-cli-natural-e2e-20260703.*`

### 1. 最新 E2E 汇总

| Skill | 场景 | 结论 | Paid calls | Credits | Schema | Trace |
| --- | --- | --- | ---: | ---: | --- | --- |
| `qveris-news-sentiment-radar` | NVDA，US，7 天新闻/情绪/价格反应 | 跑通；情绪和价格反应有证据，但 issuer/filing confirmation 缺失 | 6 | 33.82 | 通过 | 6/6 calls 有 `execution_id` |
| `qveris-portfolio-risk-monitor` | AAPL/NVDA/MSFT/TSLA/CASH 组合，SPY benchmark，30 天 | 跑通；VaR、drawdown、volatility、correlation 均有结构化结果 | 5 | 78.22 | 通过 | 5/5 calls 有 `execution_id` |
| `qveris-quant-factor-screen` | AAPL/MSFT，valuation/quality/liquidity/momentum/news risk | 跑通；完整 two-name ranking table、factor weights、tie-break rules 均已生成 | 10 | 153.20 | 通过 | 10/10 calls 有 `execution_id` |
| `qveris-sector-rotation-map` | XLK/XLE vs SPY，30 天 | 跑通；rotation quadrants、momentum scores、relative strength scores 均已生成 | 7 | 147.20 | 通过 | 7/7 calls 有 `execution_id` |
| **Total** | 四个 skill | 全部完成安装态自然语言 E2E | **28** | **412.44** | 全部通过 | 全部 paid calls 有 `execution_id` |

### 2. 最新 E2E 结构化输出重点

`qveris-news-sentiment-radar`：

- Scope：`NVDA`，`US`，`2026-06-25` 到 `2026-07-02`
- Findings：5 条
- Evidence：6 条
- Risks：3 条
- 结构化结果：
  - `signal_level=positive`
  - `catalyst_status=needs_confirmation`
  - `catalyst_confidence_score=0.705`
  - `corroborating_roles=["market_news_sentiment","aggregate_sentiment","price_reaction"]`
  - `confirmation_roles=[]`
  - `missing_data=["filings_or_issuer_confirmation: no filings, issuer-news, or press-release confirmation records returned"]`

`qveris-portfolio-risk-monitor`：

- Scope：AAPL 25%、NVDA 25%、MSFT 20%、TSLA 15%、CASH 15%，benchmark `SPY`，30 天
- Findings：5 条
- Evidence：5 条
- Risks：3 条
- 结构化结果：
  - `concentration_hhi=0.21`
  - `concentration_level=medium`
  - `daily_volatility=0.0239`
  - `annualized_volatility=0.3786`
  - `max_drawdown=-0.1271`
  - `historical_var_95=-0.0364`
  - `correlation_to_benchmark=0.1667`
  - `missing_metrics=[]`
  - `missing_data=[]`

`qveris-quant-factor-screen`：

- Scope：`AAPL`、`MSFT`，US，90 天
- Findings：4 条
- Evidence：10 条
- Risks：3 条
- 结构化结果：
  - `ranking_ready=true`
  - `coverage_level=complete`
  - `ranking_table` 已包含 AAPL、MSFT 两行
  - `factor_weights={"valuation":0.25,"quality":0.25,"liquidity":0.15,"momentum":0.2,"news_risk":0.15}`
  - `tie_break_rules` 已生成
  - `missing_outputs=[]`
  - `missing_data=[]`

`qveris-sector-rotation-map`：

- Scope：`XLK`、`XLE` vs `SPY`，US，30 天
- Findings：5 条
- Evidence：7 条
- Risks：3 条
- 结构化结果：
  - `phase_labels_ready=true`
  - `rotation_quadrants` 已包含 XLK、XLE
  - `momentum_scores` 已包含 XLK、XLE
  - `relative_strength_scores` 已包含 XLK、XLE
  - `benchmark_relative_history` 已生成
  - `missing_outputs=[]`
  - `missing_data=[]`

### 3. 最新 E2E artifacts

每个 skill 都新增四类最新自然语言 E2E 产物：

| Skill | Markdown report | Business JSON | Trace JSON | Codex final |
| --- | --- | --- | --- | --- |
| `qveris-news-sentiment-radar` | `artifacts/codex-cli-natural-e2e-20260703.md` | `artifacts/codex-cli-natural-e2e-20260703-output.json` | `artifacts/codex-cli-natural-e2e-20260703-trace.json` | `artifacts/codex-cli-natural-e2e-20260703-final.txt` |
| `qveris-portfolio-risk-monitor` | `artifacts/codex-cli-natural-e2e-20260703.md` | `artifacts/codex-cli-natural-e2e-20260703-output.json` | `artifacts/codex-cli-natural-e2e-20260703-trace.json` | `artifacts/codex-cli-natural-e2e-20260703-final.txt` |
| `qveris-quant-factor-screen` | `artifacts/codex-cli-natural-e2e-20260703.md` | `artifacts/codex-cli-natural-e2e-20260703-output.json` | `artifacts/codex-cli-natural-e2e-20260703-trace.json` | `artifacts/codex-cli-natural-e2e-20260703-final.txt` |
| `qveris-sector-rotation-map` | `artifacts/codex-cli-natural-e2e-20260703.md` | `artifacts/codex-cli-natural-e2e-20260703-output.json` | `artifacts/codex-cli-natural-e2e-20260703-trace.json` | `artifacts/codex-cli-natural-e2e-20260703-final.txt` |

### 4. 最新 E2E execution_id

| Skill | execution_id |
| --- | --- |
| `qveris-news-sentiment-radar` | `2ce523a2-aa64-4214-a548-8efe281b8db2`, `c07fd605-9eee-4224-a1e6-0467448ba99a`, `f55969a6-a93a-4304-b771-17cc643a6018`, `7fbac52e-ad23-42e8-9a79-885922ab16ce`, `9df97fae-f798-4d69-87f1-92507c617e27`, `26c3c253-875d-4838-bba3-3bb39f5a1bec` |
| `qveris-portfolio-risk-monitor` | `4ceefbb9-909c-4c48-8aa6-1cdb7174bfd2`, `d12a23c4-1594-4545-a46a-d0db68a89988`, `99d32666-b5e3-4117-b279-2fe728e4efc8`, `7f18bf5a-428d-429f-b436-ecbc812ffd53`, `0b75ea32-c018-4fad-91a0-f502d5f353b0` |
| `qveris-quant-factor-screen` | `03f39f8a-9fd5-48a4-9df5-cf07d9f537a9`, `4ba5ae6d-8871-41fa-bacf-fc9e371289a8`, `ca2ed60d-a513-4ad1-a819-d2d0fc21ee1c`, `73476508-c584-4982-80d9-e362f30e3b92`, `b0aa6b19-da8b-4d43-be5e-48e8cff23312`, `955a545a-44aa-4cdf-abd7-ed37dd5fdd2b`, `6c997a3c-d64c-4ccf-b34b-b70c3569efce`, `1ef61662-601b-4a93-9d11-b09e39420d67`, `f8a6c4f0-8205-4443-9260-8bf8301dc67a`, `4878f166-f434-4480-ab3e-408d522b3c99` |
| `qveris-sector-rotation-map` | `3a60e139-b94b-41df-af2a-486b4d7fac1e`, `fbca2a89-928c-46a3-a8c6-da66b6b1dfeb`, `cf3fd212-db8c-4889-83f4-ec1284396cbd`, `8de12eaf-ee42-4d52-bb1d-31ee80effd0e`, `042dc4da-fdf4-4464-973b-670b5fd3940a`, `ed118317-19f1-426c-a087-026eb0a3fee7`, `b991e6c8-3889-4d71-aef0-8f29948d124b` |

### 5. Schema 校验命令和结果

最新四个 `codex-cli-natural-e2e-20260703-output.json` 均通过对应 `schemas/output.schema.json`：

```bash
cd /home/wjh/matecode/open-qveris-skills-qveris-research
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import { validateSchema } from './qveris-finance-common/schema-validator.mjs';

const skills = [
  'qveris-news-sentiment-radar',
  'qveris-portfolio-risk-monitor',
  'qveris-quant-factor-screen',
  'qveris-sector-rotation-map'
];

for (const skill of skills) {
  const schema = JSON.parse(readFileSync(`${skill}/schemas/output.schema.json`, 'utf8'));
  const output = JSON.parse(readFileSync(`${skill}/artifacts/codex-cli-natural-e2e-20260703-output.json`, 'utf8'));
  const errors = validateSchema(schema, output);
  if (errors.length) throw new Error(`${skill}: ${errors.join('; ')}`);
  console.log(`${skill}: schema ok`);
}
NODE
```

结果：

```text
qveris-news-sentiment-radar: schema ok
qveris-portfolio-risk-monitor: schema ok
qveris-quant-factor-screen: schema ok
qveris-sector-rotation-map: schema ok
```

## 十、GitHub 参考到实际修改的深化映射

这一节把“参考了 GitHub 什么”进一步落到“实际改了本仓库哪里”。所有参考都只使用公开方法论和产品形态，不复制外部代码、prompt、README 文案、数据或模型。

| 参考来源 | 借鉴的抽象能力 | 本仓库落点 | 验证方式 |
| --- | --- | --- | --- |
| FinGPT | 金融新闻/情绪/事件证据分层 | `qveris-news-sentiment-radar/scripts/run.mjs` 拆出 `market_news_sentiment`、`aggregate_sentiment`、`filings_check`、`price_reaction`、`issuer_confirmation` | live trace 记录六个角色，输出 `catalyst_confidence_score`、`corroborating_roles`、`confirmation_roles` |
| FinRobot | evidence-backed analyst report | 公共 runner 输出 Scope、Findings、Evidence、Risks、QVeris Usage；四个 skill 的 Markdown report 和 business JSON 都保留 evidence/risk 分层 | 四个 natural E2E report 均生成 Markdown、JSON、trace |
| ClarityFinance | skill-style artifacts 和 agent 可读工作流 | 每个 skill 都有 `examples/`、`artifacts/`、`references/`、`fixtures/`、`tests/`，`SKILL.md` 指向确定性 runner | 四个隔离 Codex CLI 能读安装后的 `SKILL.md` 并完成 live 调用 |
| ai-hedge-fund | 多视角投资/风险 lens | portfolio 拆 quote/history/profile/news；sector 拆 snapshot/sector list/proxy history/benchmark/news confirmation | portfolio 生成 risk metrics；sector 生成 quadrants 和 benchmark-relative history |
| qlib | pipeline、实验、fixture、schema 纪律 | `qveris-finance-common/runner.mjs` 固化 preflight、execute、transform、analysis、render、trace；每个 skill 有 schema 和 fixture regression | `node --test` fixture 测试和 output schema 校验 |
| FinRL | risk control、evaluation framing、guardrails | runner 支持 `--max-paid-calls`、`--max-credits`，报告里声明 not investment advice 和 missing-data policy | dry-run、fixture、live smoke、natural E2E 都保留 usage 和 missing flags |
| Quantropy | factor/risk module 边界 | quant 输出 factor weights、ranking table、tie-break rules；portfolio 输出 concentration、VaR、drawdown、volatility、correlation | quant natural E2E `ranking_ready=true`；portfolio natural E2E `missing_metrics=[]` |
| Quant_Sector_Rotation_Strategy / sector-rotation-screener | sector proxy、relative strength、rotation map 形态 | sector 输出 `rotation_quadrants`、`momentum_scores`、`relative_strength_scores`、`benchmark_relative_history` | sector natural E2E `phase_labels_ready=true` 且无 `missing_outputs` |

## 十一、当前剩余问题归因

按最新自然语言 E2E，四个 skill 的 skill 侧主流程已经没有新的阻塞问题。剩余事项分三类：

| 类别 | 当前问题 | 影响 | 归因 | 当前处理 |
| --- | --- | --- | --- | --- |
| QVeris/provider 数据覆盖 | news 的 filing 或 issuer confirmation 没返回可用记录 | `catalyst_status=needs_confirmation`，不能把新闻催化剂标成 fully confirmed | QVeris provider 在该 NVDA 窗口没有返回 filing/issuer confirmation 记录 | skill 已正确调用 fallback 并在 `missing_data` 明确标出 |
| 平台验证 | Hosted Skill Hub / ClawHub 发布路径未跑 | 不能声明 hosted Skill Hub UI、ClawHub 发布或远端生产调度路径已验证 | 本轮验证的是 OpenClaw CLI 本地安装和 natural-language agent 路径 | `qveris.skill.json` 保持 `preview`；OpenClaw CLI E2E 已完成，hosted path 仍 pending |
| 交付流程 | 最新 natural E2E artifacts 尚未提交到远端 PR | 远端 PR 不会自动包含最新证据 | 用户暂时要求不提 PR；之前 push 也遇到权限/连接问题 | 本地 artifacts 已落盘，后续可选择性 stage/commit/push |

以前的 skill 侧缺口已经被修复或显式降级：

- portfolio：VaR、drawdown、volatility、correlation 已在最新 natural E2E 中生成。
- quant：ranking table、factor weights、tie-break rules、complete coverage 已在 AAPL/MSFT 场景生成。
- sector：rotation quadrants、momentum scores、relative strength scores、benchmark-relative history 已生成。
- news：不是流程没跑，而是 confirmation provider 没返回可确认记录，所以保留 `needs_confirmation` 是正确输出。

## 十二、SOP 状态按最新准线更新

| SOP 项 | 当前状态 |
| --- | --- |
| 每个 skill 完成 GitHub `source-review.md` | 已完成 |
| 每个 skill 完成 `references/qveris-tool-map.md` | 已完成，并补了 fallback、repair live、natural E2E 后的 provider 行为 |
| runner、QVeris adapter、transform、analysis、render、trace | 已完成，公共 runner 承担主流程 |
| dry-run、预算限制、输出文件 | 已完成 |
| schema 校验、mock/fixture 回归、缺失数据和预算不足场景 | 已完成 |
| 小额或受控真实 QVeris smoke test | 已完成 |
| examples/artifacts 至少 2 个可复制场景 | 已完成基础场景；最新 live 场景也已落盘 |
| 更新 `SKILL.md` 输出契约和成本 guardrails | 已完成 |
| 更新 `qveris.skill.json`，status 与实际阶段一致 | 已完成，保持 `preview` |
| Codex 自然语言端到端测试 | 已完成，四个隔离 Codex CLI 安装态 live E2E 通过 |
| OpenClaw 安装和运行测试 | 已完成 OpenClaw CLI 本地安装态自然语言 E2E；Hosted Skill Hub / ClawHub 发布验证仍 pending |
| PR 附测试命令、费用、execution_id、样例输出和已知限制 | 未完成，因暂不提 PR |

当前结论：

- 从 Codex CLI 使用路径看，四个 skill 已经能真实安装、读取指令、调用 QVeris、生成结构化 JSON 和 trace。
- 从上线流程看，仍应保留 `preview`，原因不是四个 skill 主流程失败，而是 hosted Skill Hub / ClawHub 发布验证和 PR 流程尚未完成。
- 从业务数据看，news 的 external confirmation 仍取决于 provider 返回；skill 已做到可追踪、可降级、可解释。

## 十三、2026-07-03 OpenClaw CLI 自然语言 E2E

在发现 `/home/wjh/.local/bin/openclaw` 是游戏 runtime wrapper 之后，又继续找到真正的平台 CLI：

- `/home/wjh/matecode/QVerisAI-openclaw/node_modules/.bin/openclaw`
- Version：`OpenClaw 2026.5.28 (e932160)`

使用该 CLI 建了隔离 profile：

- Profile：`qveris-skill-e2e-20260703`
- Agent：`main`
- Model：`deepseek/deepseek-chat`
- Workspace：`/home/wjh/matecode/open-qveris-skills-qveris-research`

四个 skill 均通过 `openclaw skills install` 从本地目录安装，并在 `openclaw skills list --agent main` 中显示为 `ready`。

随后用 `openclaw agent --local` 分别发送自然语言任务，要求 agent 读取对应 `SKILL.md`、使用真实 QVeris live、保存 Markdown report、business JSON、trace JSON 和 final validation summary。产物前缀：

- `artifacts/openclaw-natural-e2e-20260703.*`

最新 OpenClaw CLI E2E 结果：

| Skill | Paid calls | Credits | Schema | Trace | 结论 |
| --- | ---: | ---: | --- | --- | --- |
| `qveris-news-sentiment-radar` | 6 | 33.82 | 通过 | 6/6 有 `execution_id` | 跑通；`catalyst_status=needs_confirmation`，缺 filing/issuer confirmation |
| `qveris-portfolio-risk-monitor` | 5 | 78.22 | 通过 | 5/5 有 `execution_id` | 跑通；volatility、drawdown、VaR、correlation 均生成 |
| `qveris-quant-factor-screen` | 10 | 153.20 | 通过 | 10/10 有 `execution_id` | 跑通；`ranking_ready=true`，`coverage_level=complete` |
| `qveris-sector-rotation-map` | 7 | 147.20 | 通过 | 7/7 有 `execution_id` | 跑通；`phase_labels_ready=true`，quadrants 和 relative-strength scores 均生成 |
| **Total** | **28** | **412.44** | 全部通过 | 全部有 | 四个 OpenClaw natural-language live E2E 完成 |

详细报告：

- `references/openclaw-four-skill-natural-e2e-report.md`

边界：

- 这次完成的是 OpenClaw CLI 本地安装和自然语言 agent 调用验证。
- 还没有验证 hosted Skill Hub UI、ClawHub publication 或远端生产 Skill Hub 调度路径。
- OpenClaw 安装过程在 repo 下创建了 `skills/` workspace copy，目前是本地未跟踪安装产物。

## 14. 2026-07-04 standalone skill packaging hardening

Goal: make each of the four QVeris skills runnable when installed or copied as a single skill directory, without requiring the repository-level `qveris-finance-common/` folder.

Changes:
- Vendored `qveris-finance-common/runner.mjs` into each skill as `scripts/lib/runner.mjs`.
- Vendored `qveris-finance-common/schema-validator.mjs` into each skill as `scripts/lib/schema-validator.mjs`.
- Updated each `scripts/run.mjs` import from `../../qveris-finance-common/runner.mjs` to `./lib/runner.mjs`.
- Updated each `tests/runner.fixture.test.mjs` import from repository-level common files to `../scripts/lib/*`.
- Updated fixture tests to run from the skill root with `scripts/run.mjs`, `fixtures/*`, and `schemas/output.schema.json`, instead of assuming the whole repo root is present.
- Applied the same changes to both root skill directories and the `skills/` workspace/install copies.

Validation:
- Root skill tests: `node --test qveris-news-sentiment-radar/tests/runner.fixture.test.mjs qveris-portfolio-risk-monitor/tests/runner.fixture.test.mjs qveris-quant-factor-screen/tests/runner.fixture.test.mjs qveris-sector-rotation-map/tests/runner.fixture.test.mjs` -> 12/12 pass.
- `skills/` copy tests: `node --test skills/qveris-news-sentiment-radar/tests/runner.fixture.test.mjs skills/qveris-portfolio-risk-monitor/tests/runner.fixture.test.mjs skills/qveris-quant-factor-screen/tests/runner.fixture.test.mjs skills/qveris-sector-rotation-map/tests/runner.fixture.test.mjs` -> 12/12 pass.
- True standalone temp-copy tests: each skill was copied alone into `/tmp/qveris-skill-standalone-20260704110135/` and tested from inside its own directory -> 12/12 pass.

Result: a user who installs or copies one of these four skill folders independently now receives the deterministic runner, schema validator, fixtures, tests, and script entrypoint needed for local fixture validation without the repository-level common folder.
## 15. 2026-07-04 standalone product-package semantics

Goal: make each QVeris skill feel and behave like an independent installable product package, not a partial folder that depends on repository context.

Changes:
- Renamed the embedded per-skill runtime from `scripts/lib/runner.mjs` to `scripts/lib/qveris-runtime.mjs` so `scripts/run.mjs` remains the skill-specific deterministic runner entrypoint.
- Updated `scripts/run.mjs` and fixture tests in root skill folders and `skills/` install copies to import `qveris-runtime.mjs`.
- Updated `SKILL.md`, `agent.md`, `examples/README.md`, and `references/scenario-review.md` to use skill-root relative commands such as `node scripts/run.mjs ...`.
- Added a Standalone Execution Contract to each `SKILL.md`: normal dry-run, fixture, and live E2E must use `scripts/run.mjs`; manual QVeris curl calls are debug-only and cannot be reported as successful skill E2E.
- Updated `qveris.skill.json` validation paths to skill-root relative paths and added `validation.runtime = scripts/lib/qveris-runtime.mjs`.
- Added `scripts/sync-qveris-runtime.mjs` as a development helper for future skills. It copies the shared development source into each skill as bundled runtime, but installed skills do not depend on this script.
- Updated QVeris runtime trace events to include provider and non-secret parameters for successful and failed live calls, improving auditability.

Validation:
- `node scripts/sync-qveris-runtime.mjs --all` synced 8 targets: four root skills and four `skills/` install copies.
- Static standalone-facing file scan found no repo-common imports, old `scripts/lib/runner.mjs` imports, or repo-root `node qveris-*/scripts/run.mjs` commands outside historical artifacts.
- `qveris.skill.json` strict JSON parse passed for root and `skills/` copies, with `validation.runner = scripts/run.mjs` and `validation.runtime = scripts/lib/qveris-runtime.mjs`.
- Root skill fixture tests: 12/12 pass.
- `skills/` copy fixture tests: 12/12 pass.
- True standalone temp-copy tests from `/tmp/qveris-skill-independent-20260704112356/`: 12/12 pass.

Result: each of the four skills can now be installed or copied as a standalone folder with its own instructions, manifest, deterministic runner entrypoint, bundled runtime, fixtures, schemas, tests, examples, and QVeris audit trace behavior.

## 16. 2026-07-04 OpenClaw install-copy security hardening

Goal: remove OpenClaw skill code-safety warnings caused by test/runtime structure while preserving standalone skill installability.

Changes:
- Updated each skill `scripts/run.mjs` to export `config` and `defaults`, and to call `runCli(config, defaults)` only when executed directly as a CLI entrypoint.
- Reworked each `tests/runner.fixture.test.mjs` to import the skill-local runner config and call `runSkill(config, ...)` directly instead of spawning `node scripts/run.mjs` via `child_process`.
- Added `qveris-finance-common/fixture-loader.mjs` and synced it into each skill as `scripts/lib/fixture-loader.mjs`.
- Moved fixture file reading out of `scripts/lib/qveris-runtime.mjs` so the runtime file no longer combines fixture reads with live network-call code.
- Updated `scripts/sync-qveris-runtime.mjs` so future bundled skills receive `qveris-runtime.mjs`, `schema-validator.mjs`, and `fixture-loader.mjs` together.
- Reinstalled all four skills into OpenClaw profile `qveris-skill-e2e-20260703` with `--force`.

Validation:
- Root skill fixture tests: 12/12 pass.
- `skills/` install-copy fixture tests: 12/12 pass.
- True standalone temp-copy fixture tests: 12/12 pass.
- CLI fixture smoke from each skill root produced Markdown report, business JSON, and trace JSON for all four skills.
- `openclaw skills list --agent main` shows all four QVeris skills as `ready` from `openclaw-workspace`.
- `openclaw security audit --deep` result: `0 critical`, `3 warn`, `1 info`.

Remaining OpenClaw audit warnings are environment-level only:
- `gateway.trusted_proxies_missing`
- `fs.state_dir.perms_readable`
- `gateway.probe_failed` due missing `operator.read` scope

Result: the four skill install copies no longer produce OpenClaw `skills.code_safety` warnings, and the root skill folders were not deleted or replaced.

## 17. 2026-07-04 natural-language canonical output hardening

Goal: make natural-language skill invocation produce the canonical report, structured business JSON, and QVeris trace by default, instead of relying on the user or agent to know command details.

Rationale:
- A Codex natural-language portfolio test previously produced a useful enhanced report, but it wrote a temporary enhanced runner and emitted a non-canonical `skill_id`, so the JSON did not satisfy the original `qveris-portfolio-risk-monitor` schema.
- The correct product behavior is: when the skill is triggered, the skill owns the structured output contract. `scripts/run.mjs` is an internal deterministic execution path, not something the user should need to know.

Changes:
- Added a `Natural-Language Invocation Contract` to all four `SKILL.md` files.
- The contract requires every normal analysis/report invocation to produce:
  - Markdown report
  - schema-valid business JSON
  - QVeris trace JSON
- The contract forbids alternate runners, alternate schemas, and one-off JSON shapes for normal use.
- Updated `agent.md` examples so live runs always include business JSON output.
- Upgraded `qveris-portfolio-risk-monitor/scripts/run.mjs` from top-holding-only analysis to full portfolio coverage:
  - quote, historical price, company profile, and news catalyst calls repeat across every non-cash holding
  - benchmark history is still included
  - output now includes `portfolio_risk_metrics`, `holdings_risk`, `sector_exposure`, `risk_leaders`, and `coverage_level`
- Updated `qveris-portfolio-risk-monitor/schemas/output.schema.json` so the new portfolio-level fields are part of the canonical structured output.
- Updated portfolio `qveris.skill.json` usage estimate to `17-25` calls and `150-520` credits for a 4-stock portfolio plus benchmark history.
- Synced changes to `skills/` OpenClaw install copies and Windows Codex skill copies.
- Reinstalled all four skills into OpenClaw profile `qveris-skill-e2e-20260703`.

Validation:
- Root fixture tests: 12/12 pass.
- `skills/` install-copy fixture tests: 12/12 pass.
- True standalone temp-copy fixture tests: 12/12 pass.
- OpenClaw security audit remains `0 critical`; remaining warnings are environment-level gateway/state-dir warnings.
- Portfolio canonical live runner smoke:
  - `17` paid calls
  - `240.28` estimated credits
  - `holdings_risk` covers 4 non-cash holdings
  - `portfolio_risk_metrics` present
  - `sector_exposure`: Technology 70%, Consumer Cyclical 15%, Cash 15%
  - schema validation passed with no errors
- Codex natural-language portfolio regression:
  - prompt was ordinary business language, not a command
  - Codex read `qveris-portfolio-risk-monitor/SKILL.md`
  - Codex used the canonical `scripts/run.mjs`
  - no enhanced runner or alternate schema was created
  - produced Markdown, schema-valid business JSON, and QVeris trace
  - `17` paid calls, `240.28` estimated credits, `17` execution IDs, schema validation passed

Result: natural-language invocation now drives agents toward canonical structured output owned by the skill. The command remains an internal deterministic runner, but successful skill usage is defined by the emitted report, JSON, and trace artifacts.

## 18. 2026-07-04 SOP review bugfix pass

Goal: fix the implementation/manifest mismatches found during the SOP compliance review, while preserving standalone installability.

Changes:
- Fixed `qveris-finance-common/runner.mjs` so paid-call budget exhaustion writes `call_skipped` trace rows instead of breaking silently. Synced the runtime fix into all four root skill folders and `skills/` install copies.
- Updated `qveris-news-sentiment-radar/scripts/run.mjs` so `--tickers`/watchlist inputs expand across every ticker instead of silently using only the first ticker. The JSON output keeps the legacy primary `ticker` fields and adds `tickers` plus `watchlist` rows.
- Updated news schema and usage estimate for watchlist output and the larger 5-ticker call envelope.
- Updated `qveris-quant-factor-screen/scripts/run.mjs` so the documented tie-break rules are actually applied: total score, non-missing factor count, liquidity score, news-risk score, then ticker symbol.
- Updated the quant manifest default prompt so it no longer implies a 50-stock screen fits the default 25-call execution model. Large 50-stock runs now require explicit larger paid-call and credit budgets.
- Updated `qveris-portfolio-risk-monitor/scripts/run.mjs` so concentration HHI is calculated on non-cash holdings by default, matching the rest of the risk-asset analysis. Added `concentration_scope` to the structured output schema.
- Updated `qveris-sector-rotation-map/scripts/run.mjs` so ticker watchlists map to common sector ETF proxies when no explicit `--sectors` are provided.
- Tightened sector readiness: `phase_labels_ready` is true only when every requested proxy has usable signal coverage. Partial coverage now appears in `missing_outputs` and per-proxy `missing_data`.
- Removed broken manifest references to `references/openclaw-skillhub-e2e-check.md` from all four skill folders. Replaced them with `openclaw_e2e = complete-local-cli` and `hosted_skillhub_e2e = pending`.
- Repaired the damaged Chinese `usage_estimate.evidence.zh` and `status_note.zh` fields in all four manifests.
- Synced root skill changes to `skills/` install copies and Windows Codex skill copies.
- Reinstalled all four skills into OpenClaw profile `qveris-skill-e2e-20260703`.

Validation:
- Root skill fixture/unit tests: 16/16 pass.
- `skills/` install-copy fixture/unit tests: 16/16 pass after OpenClaw reinstall.
- True standalone temp-copy fixture/unit tests from `/tmp/qveris-standalone-skill-test`: 16/16 pass.
- Manifest JSON parse passed for all four root manifests and all four `skills/` copy manifests.
- Scan for `openclaw_e2e_blocker`, `references/openclaw-skillhub-e2e-check.md`, and `????` in root/install-copy manifests returned no matches.

Result: the eight reviewed issues are resolved on the skill side. Remaining hosted Skill Hub publication/remote validation is still intentionally marked pending.

## 19. 2026-07-04 live-output consistency repair pass

Goal: fix the remaining skill-side inconsistencies found by reviewing live Codex artifacts and traces.

Changes:
- Updated the shared QVeris runtime so `config.analyze(...)` receives the paid-call trace and skills can reflect skipped calls in business JSON.
- Added a shared `validateOptions` hook before live preflight/execution, used by quant screening to stop under-budgeted large-universe runs before QVeris paid calls begin.
- `qveris-news-sentiment-radar` now marks `issuer_confirmation` as `strictPreferred` and caps it to EODHD news plus Alpha Vantage news sentiment. This prevents fallback to schema-incompatible FMP SEC filings tools with Alpha Vantage parameters.
- Added a news regression test proving issuer confirmation does not fall back to `financialmodelingprep.stable.secfilingscompanysearch.*`.
- `qveris-portfolio-risk-monitor` now includes `news_catalyst` in per-holding coverage and computes `coverage_level=complete` only when holdings, portfolio metrics, and global `missing_data` are all complete.
- `qveris-sector-rotation-map` now surfaces skipped `etf_performance` source calls in `missing_outputs` / `missing_data` even when proxy price history succeeds.
- Renamed sector `flow_or_revision_confirmation` live role to `news_catalyst_confirmation` because the actual verified route uses Alpha Vantage/EODHD news, not direct fund-flow or earnings-revision data.
- Updated sector `SKILL.md`, `qveris.skill.json`, `references/qveris-tool-map.md`, and the normal fixture to avoid overstating news/sentiment context as direct flow/revision confirmation.
- `qveris-quant-factor-screen` now hard-rejects live runs when `--max-paid-calls` is below `ticker_count * 5 required factor roles`. A 50-stock live screen therefore requires at least 250 paid calls before execution starts.
- Synced root changes to `skills/` install copies, Windows Codex skill copies, and OpenClaw profile `qveris-skill-e2e-20260703`.

Validation:
- Root skill fixture/unit tests: 19/19 pass.
- `skills/` install-copy fixture/unit tests: 19/19 pass after OpenClaw reinstall.
- True standalone temp-copy fixture/unit tests from `/tmp/qveris-standalone-skill-test`: 19/19 pass.
- Root and `skills/` manifest JSON parse: pass.
- OpenClaw security audit: `0 critical`, `0 warn`, `1 info`.

Result: live-output consistency gaps are fixed on the skill side. News avoids incompatible paid fallback, portfolio no longer reports complete coverage with missing data, sector JSON reflects skipped ETF-performance sources and uses honest catalyst-context naming, and quant blocks under-budgeted large screens before paid execution.
