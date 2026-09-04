# Natural Language Examples

## Minimal Prompts

```text
用 qveris-finance-skills 做 TSLA 最近 7 天 sentiment 和 valuation note。
```

```text
用 qveris-finance-skills 看 AAPL 最近财报、流动性和 beta。
```

## Sentiment And Valuation Factor Note

```text
Use $qveris-finance-skills to produce a Markdown TSLA last-7-days sentiment and valuation factor note. Use only QVeris finance evidence. If qveris_finance.sentiment_text_signals is unavailable, use news context only qualitatively. Put qveris_trace in an appendix, include data_quality and missing_fields, and do not forecast returns or give a buy/sell/target price.
```

## Earnings, Liquidity, And Correlation Snapshot

```text
Use $qveris-finance-skills to produce a Markdown AAPL earnings recap plus liquidity and correlation factor snapshot. Use only QVeris finance evidence. If surprise, transcript, ratios, breadth, beta, or benchmark data are unavailable, output partial factors with missing_fields and data_quality. Put qveris_trace in an appendix and do not give investment advice or a target price.
```
