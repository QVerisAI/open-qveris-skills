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
| ETF performance | Twelve Data | `twelvedata.etfs.world.performance.retrieve.v1.792b716e` | optional `symbol`, `country`, `dp` | 2.37 credits/call | Current sample success 0; fallback on empty enabled | Low-cost specialist ETF route when coverage improves. |
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

- Sector name, exchange, date, and percent performance. FMP sector snapshot uses `averageChange` for the snapshot performance value.
- ETF symbols, names, exchange, and category where available.
- ETF or sector proxy performance, volume/liquidity, and benchmark comparison.
- Flow, revision, valuation, or macro/catalyst notes when provider coverage exists.

## Fallback Strategy

- If sector snapshot fails, use ETF proxy list and quote/history calls by sector ETF where discovered.
- If ETF performance fails, call quote/history for the first proxy and mark full rotation map as partial.
- If flow/revision coverage is missing, rank by performance/momentum only and flag missing confirmation.
- For non-US markets, first validate sector proxy mapping before scoring rotation.
- Compute snapshot-derived `rotation_quadrants`, `momentum_scores`, and `relative_strength_scores` when sector performance rows are available. Keep ETF price history, benchmark-relative history, and flow/revision confirmation marked missing until those routes return usable payloads.

## Live Scenario Verification Update - 2026-07-03

Additional live scenarios were run for risk-on/risk-off sectors and cyclicals versus defensives. Total incremental cost was 6 paid calls and 145.2 credits.

| Scenario | Successful routes | Failed or skipped routes | Cost |
| --- | --- | --- | --- |
| Risk-on/risk-off | FMP sector snapshot, FMP available sectors, FMP ETF list | ETF performance skipped due no inspected tool candidate | 3 calls / 72.6 credits |
| Cyclicals/defensives | FMP sector snapshot, FMP available sectors, FMP ETF list | ETF performance skipped due no inspected tool candidate | 3 calls / 72.6 credits |

Observed fallback policy:

- FMP sector snapshot, available sectors, and ETF list are the verified minimum viable US-sector route.
- Snapshot-derived relative strength, momentum score, and rotation quadrant are now allowed when FMP sector performance rows are present. These are labelled as snapshot scores, not ETF history scores.
- If ETF performance remains unavailable, use the sector snapshot as a partial map and mark ETF price history, benchmark-relative history, and flow/revision confirmation as missing.
- Production hardening should still add a verified quote/history route for sector ETF proxies before broad release.

## Skill-side Hardening Update - 2026-07-03

- Structured output now includes snapshot-derived `rotation_quadrants`, `momentum_scores`, and `relative_strength_scores`.
- `phase_labels_ready` is true only when at least one sector proxy is scored from returned snapshot data.
- ETF performance is now searched in the flows/revisions category and uses empty-payload fallback tracing rather than being silently skipped.

## Hardening Live Verification - 2026-07-03

Artifact set: `artifacts/hardening-live-20260703.*`

| Route | Tool | Result |
| --- | --- | --- |
| Sector snapshot | `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | Success; `averageChange` parsed into snapshot momentum and relative-strength scores. |
| Available sectors | `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | Success. |
| ETF performance | `twelvedata.etfs.world.performance.retrieve.v1.792b716e` | Provider unsuccessful; keep ETF price history missing. |
| ETF symbol search | `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | Success. |

Final live artifact cost: 4 paid calls / 74.97 credits. A one-off debug call also verified the raw FMP snapshot shape and cost 24.2 credits (`execution_id=7f2fcdde-340d-46df-bedb-5d8fa46d1396`).

Output status: `phase_labels_ready=true`; `rotation_quadrants`, `momentum_scores`, and `relative_strength_scores` are populated from FMP snapshot data. Remaining missing outputs are `etf_price_history`, `benchmark_relative_history`, and `flow_or_revision_confirmation`.

## Skill-side Repair Update - 2026-07-03

- Added repeated `proxy_price_history` calls for each sector ETF and a separate `benchmark_price_history` call for the benchmark.
- `benchmark_relative_history` is now populated when proxy and benchmark histories return usable closes; snapshot-only labels remain available as a lower-confidence fallback.
- Added `flow_or_revision_confirmation`, preferring Alpha Vantage news sentiment or EODHD news as a catalyst/confirmation fallback when direct flow or revision routes are unavailable.
- Default live guardrail is now 15 paid calls / 360 credits for the eight-sector US ETF map plus benchmark and confirmation routes.

## Repair Live Verification - 2026-07-03

Artifact set: `artifacts/repair-live-20260703-v2.*`

- Cost: 7 paid calls / 147.2 credits for the XLK/XLE plus SPY scenario.
- Result: `phase_labels_ready=true`, `benchmark_relative_history` populated from proxy and benchmark closes, flow/revision confirmation populated, and no `missing_outputs` or `missing_data`.
- Implementation note: ETF historical prices now use a dedicated `sector_price_history` discovery category so the FMP historical-price route is not missed by the broader sector-performance search.
