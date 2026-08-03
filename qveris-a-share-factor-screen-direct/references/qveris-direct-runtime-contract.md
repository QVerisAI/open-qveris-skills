# Audited Direct Runtime Contract

Use this contract for direct QVeris discovery and execution. It aligns direct output semantics and audit guarantees with the finance CAP lane without changing direct into a CAP call.

## Required Runtime

When `exec` and Node.js are available, use `scripts/qveris_direct_runtime.mjs` for the HTTP tier. The script:

- resolves `QVERIS_BASE_URL`, or desktop-compatible `QVERIS_API_BASE_URL`, and permits only approved HTTPS QVeris `/api/v1` hosts;
- rejects redirects;
- adapts canonical parameters against the selected tool's observed schema;
- derives cumulative actual usage from the shared sidecar and blocks calls that exceed call, credit, row, or billable-quantity limits;
- validates every execution response atomically before it can be recorded as successful;
- recursively removes provider, route, failover, credential, and signed-URL metadata;
- writes an `observed_calls.v1` sidecar with sanitized response hashes and an exact Trace projection, using an inter-process lock to preserve concurrent writes;
- reports client, QVeris-execution, and upstream timeout layers separately.

Use native `qveris_discover` / `qveris_call` only when the audited script cannot run. Apply the same preflight and semantic gates manually. Do not label output live, fresh, or E2E without an independently verified sidecar.

## Host Contract

Set `QVERIS_BASE_URL` or the desktop variable `QVERIS_API_BASE_URL` for the active deployment. `QVERIS_BASE_URL` takes precedence. The default is `https://qveris.ai/api/v1`; approved configured hosts are `qveris.ai`, `qveris.cn`, and `api.qveris.cloud`, all with the exact `/api/v1` path. Reject HTTP, credentials in URLs, custom ports, query strings, fragments, redirects, and other hosts.

Never hardcode a deployment-specific host in a Skill workflow. Read `QVERIS_API_KEY` only from the environment.

When a standard `HTTP_PROXY`, `HTTPS_PROXY`, or `ALL_PROXY` variable is present and the active Node runtime supports `--use-env-proxy`, the CLI relaunches itself with environment-proxy support. `preflight` reports `transport.proxy_configured` and `transport.env_proxy_enabled` so transport readiness can be audited without printing proxy credentials.

## Parameter Preflight

Run preflight with the exact selected-tool schema:

```bash
node scripts/qveris_direct_runtime.mjs preflight \
  --params '{"symbol":"600519","fiscal_period":"FY"}' \
  --schema '{"required":["code","period"],"properties":{"code":{"description":"six-digit code without exchange suffix"},"period":{"enum":["0331","0630","0930","1231"]}}}' \
  --estimate '{"expectedRows":43,"expectedBillableQuantity":473,"creditsPerUnit":1,"unitsPerCredit":25}' \
  --budget '{"max_calls":8,"max_credits":20,"max_rows":250,"max_billable_quantity":500}' \
  --artifact ./observed-calls.json
```

The adapter normalizes unambiguous A-share symbols and maps `FY/Q1/Q2/Q3/Q4` to `1231/0331/0630/0930/1231`. Supply `--enum-maps` only when discovery or inspection metadata explicitly documents a provider enum. Never guess enum meaning. If canonical and provider-specific inputs resolve to the same schema field, conflicting values are rejected before any network call rather than silently overwriting one another.

## Budget Preflight

Every live request must have these controls:

- `max_calls`
- `max_credits`
- `max_rows`
- `max_billable_quantity`

Use billing metadata from discovery or inspection to estimate rows, billable quantity, and credits before execution. If a bounded dimension cannot be estimated, stop with `budget_estimate_unknown`. Never treat one HTTP request as one credit. Reuse one sidecar for the whole report: the runtime recomputes cumulative calls and actual billed usage from it and treats caller-supplied `used_*` values only as a higher external floor.

Every limit, used counter, and estimate must be finite and non-negative; call and row counts must also be integers. Nested response collections are counted by their leaf records rather than as one wrapper row.

Before a network request starts, the runtime atomically writes an expiring estimate reservation to the sidecar. Concurrent processes sharing that sidecar therefore cannot all spend the same remaining allowance. Settlement removes the reservation and appends the sanitized observed call under the same lock, using actual usage for the postflight check. A sidecar may transiently contain `budget_reservations` while a request is in flight; abandoned reservations expire after a bounded recovery interval.

For quantity-priced tools, bind the estimate to the selected indicator or field set as well as the logical row count. A broad field preset can multiply billable quantity even when the requested security count and date window are unchanged.

Do not silently raise a limit. Split the request, narrow the window, or ask the user to approve a larger budget.

## Discovery And Execution

Persist one sidecar path per report. Examples:

```bash
node scripts/qveris_direct_runtime.mjs search \
  --query 'China A-share historical adjusted daily price and volume bars API' \
  --budget '{"max_calls":8,"used_calls":0,"max_credits":20,"max_rows":250,"max_billable_quantity":500}' \
  --skill qveris-a-share-data-direct \
  --artifact ./observed-calls.json

node scripts/qveris_direct_runtime.mjs execute \
  --tool-id '<selected>' \
  --search-id '<paired-search-id>' \
  --params '{"symbol":"600519.SH","start_date":"2026-06-01","end_date":"2026-07-30"}' \
  --schema '<selected-tool-json-schema>' \
  --validation '{"kind":"adjusted_bars","expectedSymbol":"600519.SH","startDate":"2026-06-01","endDate":"2026-07-30","adjustment":"forward"}' \
  --estimate '{"expectedRows":43,"expectedBillableQuantity":473,"creditsPerUnit":1,"unitsPerCredit":25}' \
  --budget '{"max_calls":8,"max_credits":20,"max_rows":250,"max_billable_quantity":500}' \
  --skill qveris-a-share-data-direct \
  --artifact ./observed-calls.json
```

`execute` requires `--validation`. Supported validators are `adjusted_bars`, `adjusted_bar_groups`, `quote`, and `records`. A transport response without a successful validator is recorded as `rejected`, never `success`. The legacy `annotate` command can only downgrade a row to `failed` or `rejected`; it cannot upgrade evidence to success.

For quotes, use both an absolute `maxAgeMs` and, when the market is known, `marketSession` with an IANA time zone, local open time, and an explicit holiday list. This permits the latest close across a weekend before the next session opens while rejecting it once a newer session is expected.

If execution returns `truncated_content` without `result.data`, record `response_data_missing`; never parse a partial JSON string as evidence. Retry with a larger, bounded `--max-response-size` only when the inspected response shape, expected byte size, and remaining call/credit/quantity budgets justify it.

For a reproducible bounded live run covering all three direct Skills:

```bash
make run-finance-direct-live-e2e
```

Use `--only case-id-a,case-id-b` with the underlying script to rerun failed cases without repeating successful paid cases. Selective reruns still scan every `*-observed_calls.json` ledger already present in the output directory, so prior cases remain part of the cumulative budget. The command exits nonzero unless every selected case reaches semantic `success`; `rejected` is never a passing E2E result. Historical-bar cases require at least 20 valid observations per requested security.

Trace rows must equal the sidecar's `qveris_trace` projection exactly.

## Adjusted Bars And Exact Windows

Use `normalizeAdjustedBars` from the runtime before computing returns, volatility, momentum, or indicators.

- Prefer a returned `adj_close`, `adjusted_close`, `adjClose`, `adjustedClose`, or another documented equivalent.
- If only `close` plus `adjustment_factor` exists, convert only with a formula explicitly documented by the selected tool and covered by a regression test.
- Otherwise reject with `adjustment_basis_unclear`.
- For “last N trading days,” return exactly N sorted, deduplicated observations or reject with `insufficient_observations`.
- Record `adjustment_basis`, actual window bounds, and observation count in the claim ledger.

## Timeout Diagnostics

Report the measured elapsed time and the configured limit for the layer that actually timed out:

- `client`
- `qveris_execution`
- `upstream`
- `unknown`

Do not repeat an upstream “120s” message as the client duration when the client observed a different elapsed time.

## Production Gate

Direct output is production-eligible only when:

1. parameter preflight succeeds;
2. cost preflight succeeds;
3. identity, window, period, unit, and adjustment semantics pass;
4. every observed request is in the sanitized sidecar;
5. report Trace matches the sidecar row-for-row;
6. rejected or failed payloads are excluded from Evidence.
