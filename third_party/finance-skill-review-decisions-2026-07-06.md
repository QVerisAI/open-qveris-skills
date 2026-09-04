# 金融 Skill 评审决策记录

日期：2026-07-06
来源：金融同学对候选 skill 的业务价值评估
用途：记录哪些候选进入“可以引入”，哪些先做“试点”，供产品、工程、法务、合规继续跟进。

## 1. 可以引入

| 编号 | 仓库 | GitHub URL | License | 引入方向 | 主要注意事项 |
|---:|---|---|---|---|---|
| 15 | LLMQuant Skills | https://github.com/LLMQuant/skills | MIT | `qveris-market-intelligence`、`qveris-macro-monitor`、`qveris-equities-research`、`qveris-credit-monitor` | 覆盖面广，先选 1-2 个子方向落地；options/derivatives 需单独合规审查 |
| 17 | Bigdata Financial Research Analyst | https://github.com/Bigdata-com/skills-financial-research-analyst | NOASSERTION | `qveris-financial-research-analyst`、`qveris-dcf-model`、`qveris-peer-comparables`、`qveris-earnings-quality`、`qveris-reverse-dcf` | License/法务复核前不引入代码；先参考模型模块和输出结构 |
| 22 | Money Atlas | https://github.com/ElmatadorZ/MoneyAtlas-ClaudeSkill-Agent | NOASSERTION | macro、portfolio、risk、sentiment 多 agent 金融分析框架 | License/法务复核前不引入代码；只抽取 agent 分工和报告结构 |

## 2. 试点

| 编号 | 仓库 | GitHub URL | License | 试点方向 | 主要注意事项 |
|---:|---|---|---|---|---|
| 18 | Finance Alerts Skill | https://github.com/jmkim-ntels/finance-alerts-skill | Unknown | `qveris-market-alerts`、`qveris-kr-market-alerts` | 先确认 KR market 覆盖价值和 license；告警阈值不能包装成交易信号 |
| 19 | National Team Position | https://github.com/Xiaoyuan-Liu/national-team-position | MIT | `qveris-a-share-national-team-position` | 国家队/中央汇金持仓趋势只能作为估算因子，不能表述为官方事实 |
| 20 | Valuation Calculator | https://github.com/arbiger/valuation-calculator | NOASSERTION | `qveris-valuation-calculator` | 只吸收公式和输入输出字段；估值结果避免被误解为目标价 |
| 21 | Financial Red Flag Auditor | https://github.com/noahnan-max/financial-red-flag-auditor-skill | MIT | `qveris-financial-red-flag-auditor`、`qveris-10k-red-flag-digest` | 红旗指标必须有证据引用；优先并入 10-K/年报排雷 skill |
| 23 | GMGN Skills | https://github.com/GMGNAI/gmgn-skills | MIT | `qveris-crypto-token-market`、`qveris-crypto-portfolio`、`qveris-token-tracking` | 仅在产品确认 crypto/token coverage 后试点；禁止 wallet/swap/交易权限 |
| 24 | Stock Analysis | https://github.com/moinsen-dev/stock-analysis | Unknown；仓库已 archived | `qveris-stock-analysis`、`qveris-hot-scanner`、`qveris-rumor-scanner`、`qveris-portfolio-watchlist` | license unknown 且 archived；rumor scanner 必须重建证据标注和未确认信息处理规则 |

## 3. 下一步建议

1. 对 15、17、22 建立引入候选 issue/scaffold。
2. 对 18、19、20、21、23、24 建立试点任务，只验证金融价值和 QVeris 数据替换可行性。
3. 对 `NOASSERTION`、`Unknown`、已归档仓库先做 license/legal gate。
4. 所有候选默认不引入交易执行、买卖建议、目标价承诺、wallet/swap、登录态抓取能力。
