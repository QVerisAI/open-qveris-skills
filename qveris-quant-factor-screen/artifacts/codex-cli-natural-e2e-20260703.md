# Quant Factor Screen

Skill: `qveris-quant-factor-screen`
Mode: live
Generated at: 2026-07-03T08:18:27.398Z

## Scope
```json
{
  "universe": [
    "AAPL",
    "MSFT"
  ],
  "market": "US",
  "window_days": 90,
  "factor_set": [
    "valuation",
    "quality",
    "liquidity",
    "momentum",
    "news_risk"
  ]
}
```

## Findings
- Screen universe contains 2 tickers: AAPL, MSFT.
- Factor coverage attempted: valuation_ratios, quality_overview, liquidity_float, price_momentum, news_risk.
- Generated a 2-row ranking table with 2 scored ticker(s).
- Ranking exposes raw fields, normalized scores, missing-field flags, factor weights, and tie-break rules.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| valuation_ratios | `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | yes | 1 | 24.2 |
| valuation_ratios | `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | yes | 1 | 24.2 |
| quality_overview | `alphavantage.fundamentals.income_statement.retrieve.v1.7aca3c4a` | yes | 1 | 2 |
| quality_overview | `alphavantage.fundamentals.income_statement.retrieve.v1.7aca3c4a` | yes | 1 | 2 |
| liquidity_float | `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | yes | 1 | 24.2 |
| liquidity_float | `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | yes | 1 | 24.2 |
| price_momentum | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 62 | 24.2 |
| price_momentum | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 62 | 24.2 |
| news_risk | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 8 | 2 |
| news_risk | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 8 | 2 |

## Missing Data And Risks
- Do not rank missing fundamentals as neutral without flagging the gap.
- Provider coverage can vary by market and ticker.
- This is a research screen, not a buy/sell recommendation.

## QVeris Usage
- Paid calls: 10
- Estimated credits: 153.2
- Not investment advice.
