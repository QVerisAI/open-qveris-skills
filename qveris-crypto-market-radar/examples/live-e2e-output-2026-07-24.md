# qveris-crypto-market-radar Live E2E

## Summary

Case `crypto-base-cap-matrix` ran through the public finance adapter. Final observed status: `failed`; broader skill conclusions remain out of scope for this contract check.

## Evidence

4 live CAP attempt(s) were observed, but the final attempt failed. They supply call-availability evidence only and no positive market or issuer evidence.

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- `data_quality.status`: `insufficient`.
- `missing_fields`: `["adapter_preflight_failed","required_parameters_missing"]`.
- Requested logical CAPs: `["qveris_finance.crypto_ref_master","qveris_finance.crypto_spot_rt","qveris_finance.crypto_bars_history","qveris_finance.crypto_market_rankings","qveris_finance.crypto_fgi","qveris_finance.crypto_whale"]`.
- Final transmitted params by check: `[{"tool_name":"qveris_finance.crypto_ref_master","params":{}},{"tool_name":"qveris_finance.crypto_spot_rt","params":{"symbol":"BTC"}},{"tool_name":"qveris_finance.crypto_bars_history","params":{"symbol":"BTC","interval":"1d"}},{"tool_name":"qveris_finance.crypto_market_rankings","params":{}},{"tool_name":"qveris_finance.crypto_fgi","params":{}},{"tool_name":"qveris_finance.crypto_whale","params":{}}]`.
- Resolved CAPs by check: `[{"tool_name":"qveris_finance.crypto_ref_master","capability_id":null,"detail_source":null},{"tool_name":"qveris_finance.crypto_spot_rt","capability_id":"CRYPTO.SPOT.RT","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_bars_history","capability_id":"CRYPTO.BARS.HISTORY","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_market_rankings","capability_id":"CRYPTO.MARKET_RANKINGS","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_fgi","capability_id":"CRYPTO.FGI","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_whale","capability_id":null,"detail_source":null}]`.
- Preflight errors by check: `[{"tool_name":"qveris_finance.crypto_ref_master","code":"adapter_preflight_failed","message":"fetch failed"},{"tool_name":"qveris_finance.crypto_whale","code":"required_parameters_missing","message":"Missing required CAP parameters: address, network. Accepted live cap-detail parameters: address:string (required), network:string (required), symbol:string, date:date, start_date:date, end_date:date. Supply the missing values explicitly; the adapter will not invent them."}]`.
- Observed-call artifact: `live-e2e-output-2026-07-24.observed-calls.json`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| `qveris_finance.crypto_spot_rt` | `{"symbol":"BTC"}` | success | 813fc03a-e652-45ec-aa25-fc570db9ad5e | false | `[]` |
| `qveris_finance.crypto_bars_history` | `{"symbol":"BTC","interval":"1d"}` | success | 800264ae-84da-451b-bce7-0505b254f6c1 | false | `[]` |
| `qveris_finance.crypto_market_rankings` | `{}` | success | 2c07a2b2-915a-4faf-859b-9e9fbcfbc8e9 | false | `[]` |
| `qveris_finance.crypto_fgi` | `{}` | success | 86f9590c-5e05-4e86-9d22-5b6de27f89b2 | false | `[]` |


Observed call count: `4`.

Not investment advice.
