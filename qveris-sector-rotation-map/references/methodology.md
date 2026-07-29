# Methodology and Attribution

This QVeris skill is a clean-room, QVeris-native workflow. It does not copy third-party README prose, prompts, code, images, or branding. It uses public finance-agent and quant-research ideas as methodology inspiration only.

| Source | URL | License | Adapted pattern |
| --- | --- | --- | --- |
| virattt/ai-hedge-fund | https://github.com/virattt/ai-hedge-fund | MIT | Multi-lens investment agents, valuation, sentiment, fundamentals, technicals, and risk-manager patterns. |
| AI4Finance-Foundation/FinRobot | https://github.com/AI4Finance-Foundation/FinRobot | Apache-2.0 | Equity research automation, financial report generation, and risk assessment patterns. |
| microsoft/qlib | https://github.com/microsoft/qlib | MIT | Quant research pipeline, alpha seeking, factor modeling, backtesting, and portfolio optimization patterns. |
| AI4Finance-Foundation/FinGPT | https://github.com/AI4Finance-Foundation/FinGPT | MIT | Financial news, social sentiment, retrieval-augmented text analysis, and forecasting input patterns. |
| AI4Finance-Foundation/FinRL | https://github.com/AI4Finance-Foundation/FinRL | MIT | Market environment, strategy evaluation, risk controls, and train-test-trade workflow patterns. |
| cooragent/ClarityFinance | https://github.com/cooragent/ClarityFinance | Apache-2.0 | Claude-skill style finance workflow, planning-with-files, multi-market coverage, and dashboard patterns. |

## QVeris Adaptation

- Replace direct data/API calls with QVeris Discover, Inspect, and Call.
- Expose estimated cost before paid execution.
- Prefer bounded ticker lists, explicit windows, and source traceability.
- Separate facts from interpretation.
- Include evidence gaps and not-investment-advice language.
