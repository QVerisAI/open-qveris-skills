## Summary

Controls: `dry_run=false`, `max_age=P1D`, no hard `max_calls`, QVeris-only, no web search.
Coverage status: `partial`，核心证券识别、日线行情、行业分类、股本结构、资产负债表、企业事件和大单资金流可用；新闻、实时 L1、公司 profile、利润表/现金流、北向、龙虎榜、概念热度和未来解禁存在缺失或被拒绝。

600519.SH 已解析为贵州茅台 A 股，CN/SHH，币种 CNY，行业为食品饮料/白酒。近 21 个交易日调整后收盘从 1262.98 到 1188.80，区间收益约 -5.87%，日均成交量约 435.8 万股。2026-07-07 大单口径中，超大单+大单净额为 -13,785.17；2026-06-08 至 2026-07-07 区间合计为 -345,145.56。单位按 QVeris 返回字段原样保留。

## Evidence

| Claim | QVeris capability | Parameters | Status | Fallback |
|---|---|---|---|---|
| 证券身份为贵州茅台 A 股，CN/SHH/CNY | `qveris_finance.ref_symbology`, `qveris_finance.ref_security_master` | `symbol=600519.SH`, `market=CN` | complete | none |
| 行业为食品饮料/白酒 | `qveris_finance.ref_classification_industry` | `symbol=600519.SH`, `market=CN` | complete | none |
| 近 21 个交易日行情可计算 | `qveris_finance.mkt_bars_adjusted` | `2026-06-08` to `2026-07-08` | complete | none |
| 实时 L1 不可作为当前证据 | `qveris_finance.mkt_l1_rt` | `symbol=600519.SH`, `market=CN` | rejected: stale timestamp `2025-06-16` | adjusted bars |
| Q1 2026 资产负债表可用 | `qveris_finance.fundamentals_bs` | `symbol=600519.SH`, `market=CN` | complete | none |
| 股本结构可用 | `qveris_finance.ownership_share_structure` | `symbol=600519.SH`, `market=CN` | complete | none |
| 近 21 个交易日大单资金流可用 | `qveris_finance.flow_large_order` | `2026-06-08` to `2026-07-08` | complete | none |
| 企业事件可用：2026 年现金分红事件 | `qveris_finance.event_calendar_corp` | `2026-06-08` to `2026-12-31` | partial: payload also含历史事件 | filtered to matching issuer/window |
| 新闻不可用作发行人证据 | `qveris_finance.news_fin_tagged` | `2026-06-08` to `2026-07-08` | rejected: overbroad/entity mismatch | none |

## Analysis

市场数据：调整后日线显示，600519.SH 在 2026-06-08 至 2026-07-07 的 21 个交易日内，收盘价从 1262.98 降至 1188.80，区间收益约 -5.87%。区间内最高日内价为 1295.00，最低日内价为 1151.01；最近可用收盘价为 2026-07-07 的 1188.80。L1 实时报价返回成功但时间戳为 2025-06-16，低于 `max_age=P1D`，未作为当前行情证据。

公司/行业：证券主数据返回 Kweichow Moutai Co., Ltd.，ISIN `CNE0000018R8`，交易所 `SHH`，货币 CNY。安全主数据行业为 `Beverages - Wineries & Distilleries`；A 股行业分类返回申万食品饮料、白酒Ⅱ、白酒Ⅲ。公司 profile CAP 两次 503，未使用。

资产负债表：QVeris 返回 2026Q1，期末 2026-03-31，报告币种 CNY。总资产 3199.19 亿元，总负债 387.83 亿元，股东权益 2708.94 亿元，现金及等价物 487.87 亿元，总债务 169.60 亿元，净债务 -318.27 亿元。利润表和现金流对 CN 市场不可用或不支持，因此不做三表联动或盈利质量判断。

事件：公司事件日历返回 2026-06-12 分红事件，除权日、派息日均为 2026-06-26，股权登记日为 2026-06-25，标题为 `1派28.0242元(含税)`。A 股 `MKT.CN.BONUS` 返回股东增持/不减持类计划记录，其中 2025-12-30 公告的增持计划状态为完成，计划期间至 2026-02-28；该项作为历史股东行为上下文，不作为当前交易信号。

资金流/解禁/特色 A 股字段：`FLOW.LARGE_ORDER` 返回 21 个交易日逐日数据。2026-07-07 超大单净额 -16,398.75，大单净额 2,613.58，中单净额 13,813.24，小单净额 -28.07；超大单+大单合计为 -13,785.17。区间累计超大单 -151,570.91，大单 -193,574.65，合计 -345,145.56。股本结构日期为 2026-05-27，总股本 1,250,081,601 股，流通股 1,250,081,601 股，受限股 0。解禁 CAP 返回的日期为 2026-05-28 和 2025-08-30，不在请求的未来窗口内，已拒绝为当前/未来解禁证据。

## Data Quality And Missing Fields

`data_quality.status`: `partial`

`missing_fields` / warnings:

| Field | Status | Reason |
|---|---|---|
| 实时行情 | rejected | `stale_proxy`: L1 timestamp 为 `2025-06-16` |
| 公司 profile | failed | `all_candidates_failed`, 503，两次调用均失败 |
| 利润表 | missing | `unsupported_market`: CN 不支持 |
| 现金流量表 | missing | `unsupported_market`: CN 不支持 |
| 新闻/情绪 | rejected | `overbroad_news` / `entity_mix`，返回 SMPL、PLTR、宏观等非贵州茅台新闻 |
| 北向资金 | failed | 首次参数缺 `date`，修正后 503 |
| 龙虎榜 | failed | 503 |
| 概念热度 | failed | 503 |
| 主题分类 | partial/rejected | 返回过长且重复，`theme_name` 为空，未作为核心主题证据 |
| 未来解禁 | rejected | payload 日期不在 `2026-07-08` 至 `2027-07-08` 窗口 |
| 研究报告/目标价/评级 | suppressed | skill 规则禁止输出评级、目标价、买卖措辞 |

## Trace Appendix

| Label | Capability | Execution / Result | Validation |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `REF.SYMBOLOGY` | success, `600519.SS`, CN, SHH, CNY | accepted |
| `qveris_finance.ref_security_master` | `REF.SECURITY_MASTER` | success, `600519.SH`, sector/industry present | accepted |
| `qveris_finance.ref_company_profile` | `REF.COMPANY_PROFILE` | 503 twice | missing |
| `qveris_finance.mkt_l1_rt` | `MKT.L1.RT` | success, timestamp `2025-06-16` | rejected stale |
| `qveris_finance.mkt_bars_adjusted` | `MKT.BARS.ADJUSTED` | success, 21 rows, `2026-06-08` to `2026-07-07` | accepted |
| `qveris_finance.ref_classification_industry` | `REF.CLASSIFICATION.INDUSTRY` | success, 食品饮料/白酒Ⅱ/白酒Ⅲ | accepted |
| `qveris_finance.news_fin_tagged` | `NEWS.FIN.TAGGED` | success transport, 8 rows | rejected entity mismatch |
| `qveris_finance.event_calendar_corp` | `EVENT.CALENDAR.CORP` | success, dividend history | accepted after issuer/window filter |
| `qveris_finance.fundamentals_bs` | `FUNDAMENTALS.BS` | success, 2026Q1 | accepted |
| `qveris_finance.fundamentals_is` | `FUNDAMENTALS.IS` | 422 unsupported CN market | missing |
| `qveris_finance.fundamentals_cf` | `FUNDAMENTALS.CF` | 422 unsupported CN market | missing |
| `qveris_finance.flow_large_order` | `FLOW.LARGE_ORDER` | success, 21 rows | accepted |
| `qveris_finance.ownership_share_structure` | `OWNERSHIP.SHARE_STRUCTURE` | success, date `2026-05-27` | accepted |
| `qveris_finance.mkt_cn_lock_up` | `MKT.CN.LOCK_UP` | success transport, rows outside requested future window | rejected window mismatch |
| `qveris_finance.flow_northbound` | `FLOW.NORTHBOUND` | 400 missing date, then 503 with `date=2026-07-07` | missing |
| `qveris_finance.flow_dragon_tiger` | `FLOW.DRAGON_TIGER` | 503 | missing |
| `qveris_finance.mkt_cn_concept` | `MKT.CN.CONCEPT` | 503 | missing |
| `qveris_finance.mkt_cn_bonus` | `MKT.CN.BONUS` | success, shareholder plan records | accepted as historical event context only |
| `qveris_finance.ref_classification_theme` | `REF.CLASSIFICATION.THEME` | success but truncated/repetitive; blank `theme_name` | not core evidence |

Not investment advice.
