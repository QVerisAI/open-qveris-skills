# Portfolio Risk Monitor

Skill: `qveris-portfolio-risk-monitor`
Mode: dry-run
Generated at: 2026-07-02T09:33:22.026Z

## Scope
```json
{
  "holdings": [
    {
      "symbol": "AAPL",
      "weight": 25
    },
    {
      "symbol": "NVDA",
      "weight": 25
    },
    {
      "symbol": "MSFT",
      "weight": 20
    },
    {
      "symbol": "TSLA",
      "weight": 15
    },
    {
      "symbol": "CASH",
      "weight": 15
    }
  ],
  "market": "US",
  "benchmark": "SPY",
  "window_days": 30,
  "from": "2026-06-02",
  "to": "2026-07-02"
}
```

## Findings
- Largest non-cash holding is AAPL at 25%.
- Portfolio concentration HHI is 0.210; values above 0.25 deserve concentration review.
- Collected 0 QVeris call attempts across market, profile, historical, and news/catalyst roles.
- Risk interpretation should separate measurable exposure from narrative catalyst risk.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |

## Missing Data And Risks
- Weights must be normalized before comparing portfolios.
- Historical volatility and drawdown depend on lookback window and provider coverage.
- News/catalyst risk can be stale or incomplete without filings and earnings-calendar checks.

## QVeris Usage
- Paid calls: 0
- Estimated credits: 0
- Not investment advice.
