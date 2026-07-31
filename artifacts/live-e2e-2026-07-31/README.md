# Direct finance live E2E — 2026-07-31

This run exercised the three direct finance Skills against the configured QVeris API. It used live discovery, schema inspection, preflight budgeting, execution, response sanitization, and `observed_calls.v1` sidecars. The API key is not stored in these artifacts.

Prices, discovery results, and provider responses are point-in-time observations and may change. Total observed execution cost was **32.31 credits**, below the 120-credit run limit.

## Results

| Skill | Case | Result | Observed data | Cost |
|---|---|---|---|---:|
| `qveris-a-share-data-direct` | 600519.SH adjusted bars, 2026-06-01 through 2026-07-30 | accepted | 43 dated rows with explicit `adjClose`; 1279.32 to 1361.76 (+6.4440%) | 24.20 |
| `qveris-a-share-factor-screen-direct` | 600519.SH, 300750.SZ, and 002594.SZ batch bars over the same window | rejected after transport | 3 groups / 129 rows; request used `cps=2`, but returned rows exposed only `close`, so the strict adjusted-close gate rejected ranking | 5.11 |
| `qveris-alphaear-market-intelligence-direct` | TSLA quote | accepted | price 308.85, change +3.5298%, source timestamp 2026-07-30 20:00:00Z | 1.00 |
| `qveris-alphaear-market-intelligence-direct` | TSLA FY2025 income statement | accepted | USD; revenue 94.827B, operating income 4.355B, net income 3.794B | 2.00 |

## Live findings locked into regression tests

1. Node `fetch` did not inherit the WSL HTTP proxy unless environment-proxy support was enabled. The CLI now relaunches with Node's supported proxy flag when a proxy is configured.
2. A discovered provider required Shanghai symbols with `.SS`; the adapter previously canonicalized them back to `.SH`. Provider schema now controls this suffix adaptation.
3. One live adjusted-bars response used camelCase `adjClose`; the normalizer now accepts that documented equivalent.
4. The batch-bars schema used `codes`, `startdate`, `enddate`, and `cps`; canonical multi-symbol/date/adjustment parameters now map deterministically to those discovered names.
5. The batch-bars response used `time` for its date field; the normalizer now recognizes it.
6. Discovery sidecars previously dropped the returned `search_id`; it is now preserved in the observed call and trace.

## Budget observation

The batch call returned 129 logical rows but billed 3,870 quantity units because the default `stock_all` field set multiplied billable cells. This run remained inexpensive under the current rate, but future preflight estimates must bind the requested indicator set as well as the row count. The batch response remains `rejected` for factor ranking because a low cost and a successful transport do not establish adjusted-close semantics.

## Artifacts

- `a-share-data-observed_calls.json`: successful adjusted-bars discovery, inspection, and execution.
- `factor-screen-observed_calls.json`: two discovery attempts, schema inspection, batch execution, and semantic rejection annotation.
- `alphaear-observed_calls.json`: TSLA quote and FY2025 income-statement discovery, inspection, and execution.
- `network-proxy-diagnostic-observed_calls.json`: the pre-fix failed discovery probe that reproduced the missing Node proxy behavior.

These are diagnostic E2E artifacts, not stable market fixtures and not investment advice.
