# Sector Rotation Map

Skill: `qveris-sector-rotation-map`
Mode: dry-run
Generated at: 2026-07-02T09:33:51.922Z

## Scope
```json
{
  "sector_proxies": [
    "XLK",
    "XLF",
    "XLV",
    "XLE",
    "XLI",
    "XLY",
    "XLP",
    "XLU"
  ],
  "benchmark": "SPY",
  "market": "US",
  "window_days": 30,
  "from": "2026-06-02",
  "to": "2026-07-02"
}
```

## Findings
- Rotation proxy set contains 8 sectors or ETFs.
- Collected 0 raw records or nested payload rows across selected sector/market sources.
- Initial deterministic signals are relative strength, momentum, volatility, drawdown, liquidity, and catalyst context.
- Phase labels should be treated as research labels until verified against benchmark-relative history.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |

## Missing Data And Risks
- Sector ETF proxies may not match local-market sector indices.
- Flow, earnings-revision, and valuation coverage can be provider-dependent.
- Rotation labels are not trading instructions.

## QVeris Usage
- Paid calls: 0
- Estimated credits: 0
- Not investment advice.
