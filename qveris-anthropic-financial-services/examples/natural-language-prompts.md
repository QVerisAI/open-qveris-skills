# Natural Language Examples

## Minimal Prompts

```text
用 qveris-anthropic-financial-services 看 NVDA 最新财报 context memo。
```

```text
用 qveris-anthropic-financial-services 做 MSFT 模型输入审计。
```

## Earnings Context Memo

```text
Use $qveris-anthropic-financial-services to write a Markdown NVDA latest earnings context memo. Use only QVeris finance evidence. Put qveris_trace in an appendix, include data_quality and missing_fields, and do not state beat/miss unless qveris_finance.earnings_actual_surprise supports it. Do not provide a target price or investment recommendation.
```

## DCF Input Audit

```text
Use $qveris-anthropic-financial-services to produce a Markdown MSFT DCF/model-update input audit. Use only QVeris fundamentals, estimates, market price, rates, and FX evidence. Put qveris_trace in an appendix, separate aligned and non-aligned periods, and do not output a target price, upside, buy/sell rating, or investment advice.
```
