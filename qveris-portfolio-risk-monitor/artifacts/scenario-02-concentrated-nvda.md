# Portfolio Risk Monitor

Skill: `qveris-portfolio-risk-monitor`
Mode: live
Generated at: 2026-07-03T05:59:10.838Z

## Scope
```json
{
  "holdings": [
    {
      "symbol": "NVDA",
      "weight": 60
    },
    {
      "symbol": "AMD",
      "weight": 20
    },
    {
      "symbol": "CASH",
      "weight": 20
    }
  ],
  "market": "US",
  "benchmark": "QQQ",
  "window_days": 30,
  "from": "2026-06-03",
  "to": "2026-07-03"
}
```

## Findings
- Largest non-cash holding is NVDA at 60%.
- Portfolio concentration HHI is 0.440; values above 0.25 deserve concentration review.
- Collected 3 QVeris call attempts across market, profile, historical, and news/catalyst roles.
- Risk interpretation should separate measurable exposure from narrative catalyst risk.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| quote_snapshot | `finnhub_io_api.stock.quote` | no | 1 | 1 |
| historical_prices | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 21 | 24.2 |
| profile_sector | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | yes | 1 | 24.2 |

## Missing Data And Risks
- Weights must be normalized before comparing portfolios.
- Historical volatility and drawdown depend on lookback window and provider coverage.
- News/catalyst risk can be stale or incomplete without filings and earnings-calendar checks.

## QVeris Usage
- Paid calls: 3
- Estimated credits: 49.4
- Not investment advice.
