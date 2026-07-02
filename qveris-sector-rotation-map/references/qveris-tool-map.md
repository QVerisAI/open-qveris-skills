# QVeris Tool Map

Validation date: 2026-07-02

This map records QVeris Discover / Inspect preflight results for the first productized runner. The runner refreshes Discover / Inspect before paid Calls and treats this file as a verified candidate map.

## Discovery Queries

| Data category | Query | Purpose |
| --- | --- | --- |
| Sector/ETF performance | `sector ETF price history benchmark volume API` | Proxy sector relative strength and ETF trend. |
| Sector snapshot | `market sector industry performance stock API` | Market-level sector performance table. |
| Flows/revisions/valuation | `sector performance ETF flows earnings revisions valuation API` | Add confirmation or dissenting context where available. |

## Verified Candidates

| Category | Provider | Tool ID | Parameters | Cost | Observed quality | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Sector snapshot | FMP | `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | `date`, optional `exchange`, `sector` | 24.2 credits/call | Success rate 0.879, avg 1069 ms | Primary US sector performance snapshot. |
| Available sectors | FMP | `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | none | 24.2 credits/call | Success rate 1.0, avg 1066 ms | Validate sector naming and coverage. |
| ETF list | FMP | `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | none | 24.2 credits/call | Success rate 1.0, avg 1250 ms | ETF universe discovery and proxy validation. |
| ETF performance | Twelve Data | `twelvedata.etfs.world.performance.retrieve.v1.792b716e` | optional `symbol`, `country`, `dp` | 2.37 credits/call | Current sample success 0; inspect before use | Low-cost specialist ETF route when coverage improves. |
| CN adjusted price | CN Financial Pro | `cn_financial_pro.adjusted_price.v1` | `codes`, `startdate`, `enddate`, optional `cps`, `interval` | 1 credit/result | Success rate 0.975, avg 545 ms | China sector/index proxy price history. |
| CN industry flow | Gildata | `mcp_gildata.industryrealsectorfundflow.v1` | natural-language `query` | 1 credit/call | Success rate 0.962, avg 5396 ms | China sector flow route. |

## Parameter Templates

```json
{
  "sector_performance_snapshot": {
    "date": "2026-07-02",
    "exchange": "NASDAQ"
  },
  "available_sectors": {},
  "etf_performance": {
    "symbol": "XLK",
    "dp": 2
  },
  "etf_symbol_search": {}
}
```

## Returned Fields To Normalize

- Sector name, exchange, date, and percent performance.
- ETF symbols, names, exchange, and category where available.
- ETF or sector proxy performance, volume/liquidity, and benchmark comparison.
- Flow, revision, valuation, or macro/catalyst notes when provider coverage exists.

## Fallback Strategy

- If sector snapshot fails, use ETF proxy list and quote/history calls by sector ETF.
- If ETF performance fails, call quote/history for the first proxy and mark full rotation map as partial.
- If flow/revision coverage is missing, rank by performance/momentum only and flag missing confirmation.
- For non-US markets, first validate sector proxy mapping before scoring rotation.
