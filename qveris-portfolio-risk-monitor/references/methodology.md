# Methodology and Attribution

This QVeris skill is a clean-room, QVeris-native workflow. It uses public finance-agent ideas as product inspiration only. Do not copy source repository prompts, README prose, code, images, or brand names into user outputs.

| Source | URL | License | Stars at review | Adapted pattern |
| --- | --- | --- | ---: | --- |
| virattt/ai-hedge-fund | https://github.com/virattt/ai-hedge-fund | MIT | 60,420 | Multi-lens investment agents, valuation, sentiment, fundamentals, technicals, risk manager, and portfolio manager patterns. |
| AI4Finance-Foundation/FinRL | https://github.com/AI4Finance-Foundation/FinRL | MIT | 15,482 | Train-test-trade workflow, market environment, risk controls, and strategy evaluation patterns. |
| microsoft/qlib | https://github.com/microsoft/qlib | MIT | 44,971 | Quant research pipeline, alpha seeking, factor modeling, backtesting, risk modeling, and portfolio optimization patterns. |

## QVeris Adaptation

- Replace direct API integrations with QVeris Discover, Inspect, and Call.
- Expose cost before paid execution.
- Prefer bounded windows, explicit ticker lists, and source traceability.
- Separate facts from interpretation.
- Include evidence gaps and not-investment-advice language.
