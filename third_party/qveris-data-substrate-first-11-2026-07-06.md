# 前 11 个金融候选 Skill 的 QVeris 数据底座改造方案

日期：2026-07-06
依据：`qveris_finance` CAP 工具能力清单，provider_id=`qveris_finance`，protocol=`cap`。
范围：主评估卡片中的编号 1-11。

## 1. 改造原则

前 11 个候选不直接保留原仓库的数据源依赖。所有 live / historical / structured financial data 都统一走 `qveris_finance.*` CAP 工具。

原仓库保留的价值主要是：

- 金融工作流：earnings、DCF、comps、10-K digest、portfolio risk、market overview、A 股快照等。
- 输出模板：summary card、research memo、Excel/JSON、risk card、watchlist/alert。
- 分析 rubric：beat/miss、guidance、margin、FCF、估值假设、红旗、情绪、因子、风险解释。

必须替换或重写的部分：

- EODHD、Yahoo、FMP、Alpha Vantage、Polygon、AkShare、Snowball、Sina、SEC scraping、Longbridge、FinViz、Alpaca 等直接数据访问。
- 浏览器自动化、cookie、登录态、API key 直连第三方供应商。
- 买卖点、目标价承诺、自动交易、wallet/swap、portfolio action recommendation。

## 2. 统一 QVeris Data Substrate Contract

每个改造后的 skill 应包含同一套数据层约束：

| 层 | 规则 |
|---|---|
| 标的解析 | 先用 `qveris_finance.ref_symbology`、`qveris_finance.ref_security_master`、`qveris_finance.ref_company_profile` 解析 ticker / exchange / company / CIK |
| 数据调用 | 只通过 `qveris_finance.*` CAP 工具取结构化数据；web search 只能作为非结构化补充 |
| 来源追踪 | 每个输出结论必须带 `tool_name`、`capability_id`、`as_of`、`retrieved_at`、`input_params`、`fallback_used` |
| 缺失处理 | 数据缺失时输出 `missing_fields`，禁止补估成事实 |
| 成本控制 | 每个 skill 定义 `dry_run`、`max_calls`、`max_age`、`budget_note` |
| 合规边界 | 输出研究辅助、风险解释和证据，不输出买卖指令、收益承诺或自动交易动作 |

建议统一 trace schema：

```json
{
  "qveris_trace": [
    {
      "tool_name": "qveris_finance.fundamentals_is",
      "capability_id": "FUNDAMENTALS.IS",
      "entity": "NVDA",
      "market": "US",
      "params": {"period": "quarterly", "limit": 8},
      "as_of": "2026-07-06",
      "retrieved_at": "2026-07-06T00:00:00Z",
      "fallback_used": false,
      "missing_fields": []
    }
  ]
}
```

## 3. QVeris 能力池

| 数据域 | 首选 CAP 工具 |
|---|---|
| 标的与主数据 | `qveris_finance.ref_symbology`、`qveris_finance.ref_security_master`、`qveris_finance.ref_company_profile`、`qveris_finance.ref_classification_industry`、`qveris_finance.ref_classification_theme`、`qveris_finance.ref_exchange_calendar` |
| 行情与 K 线 | `qveris_finance.mkt_l1_rt`、`qveris_finance.mkt_bars_eod`、`qveris_finance.mkt_bars_adjusted`、`qveris_finance.mkt_bars_intraday`、`qveris_finance.mkt_after_hours`、`qveris_finance.mkt_top_movers`、`qveris_finance.mkt_breadth_internals` |
| 财务与基本面 | `qveris_finance.fundamentals_is`、`qveris_finance.fundamentals_bs`、`qveris_finance.fundamentals_cf`、`qveris_finance.fundamentals_derived_ratios`、`qveris_finance.fundamentals_segment` |
| 盈利与预期 | `qveris_finance.earnings_actual_surprise`、`qveris_finance.estimates_consensus`、`qveris_finance.estimates_ratings_targets` |
| 披露与监管文件 | `qveris_finance.filings_regulatory_metadata`、`qveris_finance.filings_regulatory_raw`、`qveris_finance.filings_structured_xbrl` |
| 新闻、公告与事件 | `qveris_finance.news_fin_realtime`、`qveris_finance.news_fin_tagged`、`qveris_finance.news_dedup_cluster`、`qveris_finance.event_calendar_earnings`、`qveris_finance.event_calendar_corp`、`qveris_finance.event_calendar_ipo`、`qveris_finance.event_calendar_macro` |
| 电话会与文本 | `qveris_finance.transcripts_earnings_call`、`qveris_finance.transcripts_conference`、`qveris_finance.transcripts_media_video` |
| 研报与专家内容 | `qveris_finance.research_analyst_reports`、`qveris_finance.research_expert_calls` |
| 资金流与交易行为 | `qveris_finance.flow_market_capital`、`qveris_finance.flow_sector_capital`、`qveris_finance.flow_large_order`、`qveris_finance.flow_northbound`、`qveris_finance.flow_cross_border`、`qveris_finance.flow_dragon_tiger` |
| 持仓与所有权 | `qveris_finance.ownership_institutional`、`qveris_finance.ownership_insider_trades`、`qveris_finance.ownership_share_structure`、`qveris_finance.ownership_short_interest` |
| ETF / 基金 | `qveris_finance.etf_ref_master`、`qveris_finance.etf_holdings`、`qveris_finance.etf_holdings_history`、`qveris_finance.etf_nav_iopv`、`qveris_finance.etf_pcf`、`qveris_finance.etf_flows_aum`、`qveris_finance.fund_mutual_ref_master`、`qveris_finance.fund_mutual_nav`、`qveris_finance.fund_mutual_holdings` |
| 指数与宏观 | `qveris_finance.index_levels`、`qveris_finance.index_constituents`、`qveris_finance.index_metadata`、`qveris_finance.index_vix`、`qveris_finance.fx_spot`、`qveris_finance.macro_indicators`、`qveris_finance.macro_actual_vs_forecast`、`qveris_finance.rates_govt_benchmark`、`qveris_finance.rates_policy` |
| 技术指标与量化 | `qveris_finance.analytics_sma`、`qveris_finance.analytics_ema`、`qveris_finance.analytics_macd`、`qveris_finance.analytics_rsi`、`qveris_finance.analytics_bbands`、`qveris_finance.analytics_atr`、`qveris_finance.analytics_tech_indicators` |
| 衍生品与风险 | `qveris_finance.opt_chain`、`qveris_finance.opt_greeks_iv`、`qveris_finance.opt_ref_master`、`qveris_finance.deriv_futures_market`、`qveris_finance.risk_beta_vol` |
| 另类与情绪 | `qveris_finance.sentiment_text_signals`、`qveris_finance.alt_job_postings`、`qveris_finance.alt_patents`、`qveris_finance.alt_supply_chain`、`qveris_finance.alt_web_traffic`、`qveris_finance.alt_consumer_spend` |
| A 股专项 | `qveris_finance.mkt_cn_concept`、`qveris_finance.mkt_margin`、`qveris_finance.mkt_cn_block_trades`、`qveris_finance.mkt_cn_lock_up`、`qveris_finance.mkt_cn_ipo_sub`、`qveris_finance.mkt_cn_bonus`、`qveris_finance.flow_dragon_tiger`、`qveris_finance.flow_northbound` |

## 4. 前 11 个候选逐项改造

### 1. Anthropic Financial Services

GitHub: https://github.com/anthropics/financial-services

| 原能力 | QVeris 数据底座 |
|---|---|
| earnings analysis | `ref_*` 解析标的；`fundamentals_is/bs/cf/derived_ratios/segment`；`earnings_actual_surprise`；`estimates_consensus`；`transcripts_earnings_call`；`news_fin_tagged`；`mkt_l1_rt` |
| comps analysis | `ref_classification_industry`、`ref_classification_theme`、`fundamentals_derived_ratios`、`mkt_l1_rt`、`estimates_consensus` |
| DCF/model update | `fundamentals_is/bs/cf`、`estimates_consensus`、`rates_govt_benchmark`、`fx_spot`、`mkt_l1_rt` |
| market research | `research_analyst_reports`、`news_dedup_cluster`、`event_calendar_corp`、`ownership_institutional`、`ownership_insider_trades` |

改法：保留报告模板和 Excel/JSON 输出，删掉原 MCP/数据供应商假设，所有章节都要求 `qveris_trace`。

### 2. LangAlpha

GitHub: https://github.com/ginlix-ai/LangAlpha

| 原能力 | QVeris 数据底座 |
|---|---|
| dcf-model | `fundamentals_is/bs/cf`、`fundamentals_derived_ratios`、`estimates_consensus`、`rates_govt_benchmark`、`mkt_l1_rt` |
| earnings-analysis / preview | `event_calendar_earnings`、`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call`、`news_fin_realtime` |
| sector overview | `ref_classification_industry`、`index_constituents`、`index_levels`、`flow_sector_capital`、`mkt_breadth_internals` |

改法：保留 DCF/earnings/sector schema；把 fundamentals/macro MCP 全部替换为 QVeris capability calls。

### 3. EODHD Claude Skills

GitHub: https://github.com/EodHistoricalData/eodhd-claude-skills

| 原能力 | QVeris 数据底座 |
|---|---|
| company brief | `ref_company_profile`、`mkt_l1_rt`、`fundamentals_derived_ratios`、`news_fin_tagged` |
| earnings monitor | `event_calendar_earnings`、`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call` |
| stock screener | `ref_security_master`、`fundamentals_derived_ratios`、`mkt_bars_adjusted`、`analytics_*`、`sentiment_text_signals` |
| portfolio risk | 用户持仓 + `mkt_bars_adjusted`、`risk_beta_vol`、`index_levels`、`news_fin_tagged` |
| macro dashboard | `macro_indicators`、`macro_actual_vs_forecast`、`rates_policy`、`rates_govt_benchmark`、`fx_spot` |
| options analysis | `opt_chain`、`opt_greeks_iv`、`opt_ref_master` |

改法：删除 EODHD API key / endpoint 绑定，保留 skill taxonomy 和输出结构。

### 4. Finance Skills

GitHub: https://github.com/himself65/finance-skills

| 原能力 | QVeris 数据底座 |
|---|---|
| finance sentiment | `news_fin_tagged`、`news_dedup_cluster`、`sentiment_text_signals`、`non_fin_social_media` |
| company valuation | `fundamentals_is/bs/cf`、`fundamentals_derived_ratios`、`mkt_l1_rt`、`estimates_consensus` |
| earnings preview/recap | `event_calendar_earnings`、`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call` |
| estimate analysis | `estimates_consensus`、`estimates_ratings_targets` |
| correlation/liquidity | `mkt_bars_adjusted`、`mkt_trading_aggregate`、`risk_beta_vol` |

改法：把 yfinance/外部 API 改成 QVeris；输出统一为结构化因子 + 来源 + 置信度。

### 5. InvestSkill

GitHub: https://github.com/yennanliu/InvestSkill

| 原能力 | QVeris 数据底座 |
|---|---|
| 10-K digest | `filings_regulatory_metadata`、`filings_regulatory_raw`、`filings_structured_xbrl` |
| bear case / red flags | `filings_*`、`fundamentals_derived_ratios`、`news_fin_tagged`、`ownership_insider_trades`、`esg_controversy` |
| catalyst calendar | `event_calendar_corp`、`event_calendar_earnings`、`event_calendar_ipo`、`news_fin_realtime` |
| competitor analysis | `ref_classification_industry`、`ref_classification_theme`、`fundamentals_derived_ratios`、`research_analyst_reports` |
| DCF valuation | `fundamentals_is/bs/cf`、`estimates_consensus`、`rates_govt_benchmark`、`mkt_l1_rt` |
| earnings call analysis | `transcripts_earnings_call`、`earnings_actual_surprise`、`estimates_consensus` |

改法：作为 US stock research taxonomy 保留；数据层全部 QVeris；filing 引用必须逐条证据化。

### 6. Tech Earnings Deepdive

GitHub: https://github.com/webleon/tech-earnings-deepdive-openclaw-skill

| 原能力 | QVeris 数据底座 |
|---|---|
| tech earnings deep dive | `earnings_actual_surprise`、`fundamentals_segment`、`estimates_consensus`、`transcripts_earnings_call`、`news_fin_tagged` |
| competition / moat | `ref_classification_theme`、`research_analyst_reports`、`alt_patents`、`alt_job_postings`、`alt_supply_chain` |
| valuation / reaction | `mkt_l1_rt`、`mkt_bars_intraday`、`mkt_after_hours`、`fundamentals_derived_ratios` |

改法：保留多视角 memo，但输出改成 evidence-first；不输出 position decision。

### 7. Day1Global Skills

GitHub: https://github.com/star23/Day1Global-Skills

| 原能力 | QVeris 数据底座 |
|---|---|
| global / tech investment memo | `ref_security_master`、`mkt_l1_rt`、`fundamentals_*`、`estimates_*`、`news_fin_tagged`、`research_analyst_reports` |
| sector / geography context | `ref_country_region_map`、`ref_classification_industry`、`index_levels`、`macro_indicators`、`fx_spot` |

改法：仅作为报告模板/方法论参考，不搬代码；用 QVeris 重新定义数据输入。

### 8. Earnings Tracker

GitHub: https://github.com/Indomi/earnings-tracker

| 原能力 | QVeris 数据底座 |
|---|---|
| earnings calendar | `event_calendar_earnings` |
| post-earnings recap | `earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call`、`news_fin_realtime` |
| watchlist / industry filter | `ref_security_master`、`ref_classification_industry`、`ref_classification_theme` |
| price reaction | `mkt_l1_rt`、`mkt_bars_intraday`、`mkt_after_hours` |

改法：把 FMP/Alpha/Yahoo/Polygon/Sina/WebSearch adapters 全部换成 QVeris；保留 US/HK/CN watchlist 和 recap。

### 9. HHXG Market

GitHub: https://github.com/Niceck/hhxg-top-hhxg-python

| 原能力 | QVeris 数据底座 |
|---|---|
| A 股日报快照 | `mkt_l1_rt`、`mkt_breadth_internals`、`mkt_top_movers`、`index_levels` |
| 交易日历 | `ref_exchange_calendar` |
| 融资融券 | `mkt_margin` |
| 实时快讯 / 新闻 | `news_fin_realtime`、`news_fin_tagged` |
| 题材/概念 | `mkt_cn_concept`、`ref_classification_theme` |
| 龙虎榜 / 资金 | `flow_dragon_tiger`、`flow_northbound`、`flow_sector_capital`、`flow_large_order` |

改法：保留 JSON + markdown 输出；替换所有 A 股第三方接口为 QVeris A 股专项能力。

### 10. Tradermonty Trading Skills

GitHub: https://github.com/tradermonty/claude-trading-skills

| 原能力 | QVeris 数据底座 |
|---|---|
| portfolio risk | 用户持仓 + `mkt_bars_adjusted`、`risk_beta_vol`、`index_levels`、`ownership_institutional`、`news_fin_tagged` |
| market regime | `index_levels`、`index_vix`、`mkt_breadth_internals`、`macro_actual_vs_forecast`、`rates_govt_benchmark` |
| sector analysis | `ref_classification_industry`、`flow_sector_capital`、`mkt_top_movers`、`index_constituents` |
| data-quality checker | 对每个 QVeris payload 校验 `as_of`、`missing_fields`、`fallback_used`、`staleness` |
| earnings calendar | `event_calendar_earnings` |

改法：删除 trading/prep/action 语义，只保留风险、市场状态、行业轮动、数据质量检查。

### 11. Financial Analyst Skills

GitHub: https://github.com/Ruinius/financial-analyst-skills

| 原能力 | QVeris 数据底座 |
|---|---|
| document classification / organization | `filings_regulatory_metadata`、`filings_regulatory_raw`、`filings_structured_xbrl` |
| financial data extraction | `fundamentals_is/bs/cf`、`fundamentals_segment`、`filings_structured_xbrl` |
| financial calculations | `fundamentals_derived_ratios`、`mkt_l1_rt`、`mkt_bars_adjusted` |
| financial modeling / DCF | `fundamentals_*`、`estimates_consensus`、`rates_govt_benchmark`、`fx_spot` |
| JSON model generator | 输出 QVeris trace-backed JSON，不直接依赖本地 PDF pipeline |

改法：保留文档分析和 JSON viewer 思路；PDF/本地模型链路降级为 fallback，优先 QVeris filings + structured fundamentals。

## 5. 落地顺序

建议先从前 11 个中落 4 个 QVeris-native scaffold：

1. `qveris-earnings-analysis`
   - 来源：Anthropic、LangAlpha、EODHD、InvestSkill、Tech Earnings、Earnings Tracker。
   - 核心工具：`event_calendar_earnings`、`earnings_actual_surprise`、`estimates_consensus`、`transcripts_earnings_call`、`fundamentals_*`、`news_fin_tagged`。

2. `qveris-comps-dcf-analysis`
   - 来源：Anthropic、LangAlpha、InvestSkill、Financial Analyst。
   - 核心工具：`fundamentals_*`、`fundamentals_derived_ratios`、`estimates_consensus`、`mkt_l1_rt`、`rates_govt_benchmark`、`ref_classification_industry`。

3. `qveris-a-share-market-snapshot`
   - 来源：HHXG Market。
   - 核心工具：`mkt_l1_rt`、`mkt_breadth_internals`、`mkt_cn_concept`、`mkt_margin`、`flow_northbound`、`flow_dragon_tiger`、`news_fin_realtime`。

4. `qveris-portfolio-risk-regime`
   - 来源：EODHD、Tradermonty、Finance Skills。
   - 核心工具：`mkt_bars_adjusted`、`risk_beta_vol`、`index_levels`、`index_vix`、`macro_actual_vs_forecast`、`news_fin_tagged`。

每个 scaffold 至少包含：

- `SKILL.md`
- `schemas/output.schema.json`
- `references/qveris-tool-map.md`
- `fixtures/qveris/*.json`
- `tests/*`
- `scripts/run.*`
- `qveris_trace` 输出约束
- `dry_run` / `max_calls` / `budget_note`
- “不构成投资建议”声明
