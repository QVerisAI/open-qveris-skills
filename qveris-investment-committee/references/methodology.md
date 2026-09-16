# Methodology and Attribution

This QVeris skill is a clean-room, QVeris-native workflow. It uses public finance-agent ideas as product inspiration only. Do not copy source repository prompts, README prose, code, images, or brand names into user outputs.

| Source | URL | License | Stars at review | Adapted pattern |
| --- | --- | --- | ---: | --- |
| virattt/ai-hedge-fund | https://github.com/virattt/ai-hedge-fund | MIT | 60,420 | Multi-lens investment agents, valuation, sentiment, fundamentals, technicals, risk manager, and portfolio manager patterns. |
| AI4Finance-Foundation/FinRobot | https://github.com/AI4Finance-Foundation/FinRobot | Apache-2.0 | 7,344 | Equity research automation, report generation, multi-agent financial analysis, and risk assessment patterns. |
| cooragent/ClarityFinance | https://github.com/cooragent/ClarityFinance | Apache-2.0 | 58 | Claude-skill style financial workflow, planning-with-files, multi-market coverage, and screening/dashboard patterns. |

## QVeris Adaptation

- Replace direct API integrations with QVeris Discover, Inspect, and Call.
- Expose cost before paid execution.
- Prefer bounded windows, explicit ticker lists, and source traceability.
- Separate facts from interpretation.
- Include evidence gaps and not-investment-advice language.
