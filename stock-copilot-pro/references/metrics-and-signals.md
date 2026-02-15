# Metrics and Signals

## Quick Technical Thresholds

- RSI > 70: overbought risk
- RSI < 30: oversold rebound zone
- RSI 45-55: neutral momentum area

- MACD above signal: bullish momentum bias
- MACD below signal: bearish momentum bias
- Near-zero MACD with flat slope: weak trend

## Fundamental Snapshot Focus

- Valuation: `PERatio`, `ForwardPE`, `PriceToSalesRatioTTM`, `PriceToBookRatio`
- Profitability: `ProfitMargin`, `OperatingMarginTTM`, `ReturnOnEquityTTM`
- Growth: `QuarterlyRevenueGrowthYOY`, `QuarterlyEarningsGrowthYOY`
- Balance sheet context: debt/liquidity fields if available

## Sentiment Interpretation

- Use both article-level and ticker-level sentiment where available
- Treat sentiment as short-horizon context, not standalone thesis
- If sentiment conflicts with price trend, lower confidence and flag explicitly

## Confidence Heuristic

- High: 3+ domains available and consistent, data freshness acceptable
- Medium: 2-3 domains available or minor conflicts/gaps
- Low: severe missing fields, stale data, or conflicting core signals

