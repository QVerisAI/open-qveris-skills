## Summary

运行控制：`dry_run=false`，`max_age=P1D`，未设置硬 `max_calls`，预算按保守调用执行。范围按 2026-06-08 至 2026-07-08；QVeris 可验证日线实际覆盖到 2026-07-07，共 21 个交易日。

总体状态：`partial`。身份、主数据、行业、EOD 历史和公司事件可用；实时行情返回 2025-06-16 时间戳，判定为 stale；新闻返回结果与 600519.SH/贵州茅台不匹配，未作为证据；情绪和公司画像 CAP 503 后按规则停止。

## Evidence

| Claim | QVeris capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| 600519.SH 为贵州茅台 A 股，上交所，CNY/CN | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN` | `complete` | 无 |
| 行业上下文为食品饮料/白酒 | `qveris_finance.ref_classification_industry` | `symbol=600519.SH`, `market=CN` | `complete` | 无 |
| 最近 30 天 EOD 历史为 21 个交易日，最后一根为 2026-07-07 | `qveris_finance.mkt_bars_eod`, `qveris_finance.mkt_bars_adjusted` | `start_date=2026-06-08`, `end_date=2026-07-08` | `complete` | 用 EOD 代替 stale L1 |
| 窗口内公司事件：2026-06-12 分红，除权/派息 2026-06-26 | `qveris_finance.event_calendar_corp` | 同窗口 | `partial` | 过滤 out-of-window 行 |
| 新闻/情绪未形成可用个股证据 | `qveris_finance.news_fin_tagged`, `qveris_finance.sentiment_text_signals` | 同窗口 | `insufficient` | 无 |

## Market Data Read

身份读取：`600519.SH` 匹配贵州茅台，ISIN `CNE0000018R8`，上交所，证券主数据行业为 `Beverages - Wineries & Distilleries`；申万分类为 `食品饮料 / 白酒II / 白酒III`。

历史行情读取：2026-06-08 至 2026-07-07，收盘价从 `1262.98` 到 `1188.80`，区间收益约 `-5.87%`。窗口最高价 `1295.00`，最低价 `1151.01`，高低区间约 `12.51%`。最新可验证 EOD 为 2026-07-07：开 `1200.00`，高 `1202.00`，低 `1188.11`，收 `1188.80`，成交量 `2,736,500`。

技术上下文均由 QVeris 日线计算：5 日均线 `1197.23`，10 日均线 `1195.50`，20 日均线 `1225.17`；最新收盘低于 20 日均线。窗口日收益年化波动率约 `23.64%`；14 日 RSI 约 `38.54`。MACD 标准 26 日 EMA 需要至少 26 根观测，本窗口仅 21 根，因此未计算完整 MACD。窗口平均成交量约 `4,357,837`，最大成交量在 2026-06-29，为 `6,687,812`。

事件读取：公司事件 CAP 在窗口内可验证记录为 `2026-06-12 dividend`，标题为 `1派28.0242元(含税)`，股权登记日 `2026-06-25`，除权/派息日 `2026-06-26`。财报日历返回的是窗口外历史财报记录，未作为窗口内事件证据。

新闻读取：`news_fin_tagged` 对 `600519.SH` 和 `贵州茅台` 的结果未能通过 issuer relevance 校验，返回内容多为泛市场或其他实体；`sentiment_text_signals` 连续 503。因此本报告不提取个股新闻结论或情绪分数。

## Data Quality And Missing Fields

`data_quality.status`: `partial`

`missing_fields`:
- `fresh_l1_quote`: `stale_same-day_evidence`，L1 时间戳为 2025-06-16，不能代表 2026-07-08 附近行情。
- `news_issuer_relevant_rows`: `entity_mix / weak_relevance`，新闻结果未明确匹配 600519.SH 或贵州茅台。
- `text_sentiment`: `failed`，`qveris_finance.sentiment_text_signals` 两次 503。
- `company_profile`: `failed`，`qveris_finance.ref_company_profile` 两次 503。
- `full_macd`: `insufficient_observations`，30 天窗口仅 21 根交易日，低于 26 日 EMA 标准输入。
- `earnings_events_in_window`: `out_of_window_event`，财报日历返回记录不在 2026-06-08 至 2026-07-08 窗口内。
- `lock_up`, `large_order_flow`: `capability_unavailable`，当前运行中 CAP alias 返回 invalid capability。

`suppressed_fields`: 未输出目标价、评级、买卖建议、仓位、交易触发、上/下行空间或执行计划。

## Trace Appendix

```json
[
  {"capability":"qveris_finance.ref_symbology","execution_id":"5c3bedb1-c7a6-4a34-b7cc-82c0e8497fc6","status":"complete","valid_result_count":1},
  {"capability":"qveris_finance.ref_security_master","execution_id":"2f550e6a-c10e-4ba0-b839-813f35d67d81","status":"complete","valid_result_count":1},
  {"capability":"qveris_finance.mkt_l1_rt","execution_id":"42cf6f80-f5d1-4a23-b38b-0fd7463d0c51","status":"rejected","reason":"stale_timestamp_2025-06-16"},
  {"capability":"qveris_finance.mkt_bars_eod","execution_id":"151e9194-6dee-4c32-b963-50cda3400156","status":"complete","valid_result_count":21},
  {"capability":"qveris_finance.mkt_bars_adjusted","execution_id":"5653acfa-27b8-4a8d-b5a3-a09b24d49289","status":"complete","valid_result_count":21},
  {"capability":"qveris_finance.ref_classification_industry","execution_id":"0fe2c573-52da-4f02-89a4-3fc50dfd825e","status":"complete","valid_result_count":1},
  {"capability":"qveris_finance.event_calendar_corp","execution_id":"27192a5e-8080-477c-a0e9-6e8c04f71a95","status":"partial","valid_in_window_count":1,"rejected_reason":"out_of_window_rows_filtered"},
  {"capability":"qveris_finance.event_calendar_earnings","execution_id":"fc239c10-15a3-45c4-9e72-4d7f884d8e49","status":"rejected","reason":"out_of_window_event"},
  {"capability":"qveris_finance.news_fin_tagged","execution_id":"6d7aec7c-d487-4ef1-9822-4d4f45a0666b","status":"rejected","reason":"entity_mix"},
  {"capability":"qveris_finance.news_fin_tagged","execution_id":"3ba7fd67-f8e3-4004-9ca2-4ac656c81ad5","status":"rejected","reason":"weak_relevance"},
  {"capability":"qveris_finance.sentiment_text_signals","execution_id":"1a5f6959-714d-4104-ae1a-6caa239b77a0","status":"failed","reason":"503_all_candidates_failed"},
  {"capability":"qveris_finance.sentiment_text_signals","execution_id":"3b6a149a-cce9-4829-b406-b2025b3dde1b","status":"failed","reason":"503_all_candidates_failed_retry"},
  {"capability":"qveris_finance.ref_company_profile","execution_id":"57a237b4-ecac-467a-bc01-9fab3e90f312","status":"failed","reason":"503_all_candidates_failed"},
  {"capability":"qveris_finance.ref_company_profile","execution_id":"e49f948f-565d-4b67-a565-f84e020f55e3","status":"failed","reason":"503_all_candidates_failed_retry"}
]
```

Not investment advice.
