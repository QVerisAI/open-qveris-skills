# qveris-crypto-market-radar Live E2E

## Summary

Case `crypto-base-cap-matrix` ran through the public finance adapter. Final observed status: `failed`; broader skill conclusions remain out of scope for this contract check.

## Evidence

6 live CAP attempt(s) were observed, but the final attempt failed. They supply call-availability evidence only and no positive market or issuer evidence.

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- `data_quality.status`: `insufficient`.
- `missing_fields`: `["http_404"]`.
- Requested logical CAPs: `["qveris_finance.crypto_ref_master","qveris_finance.crypto_spot_rt","qveris_finance.crypto_bars_history","qveris_finance.crypto_market_rankings","qveris_finance.crypto_fgi","qveris_finance.crypto_whale"]`.
- Final transmitted params by check: `[{"tool_name":"qveris_finance.crypto_ref_master","params":{"symbol":"BTC"}},{"tool_name":"qveris_finance.crypto_spot_rt","params":{"symbol":"BTC"}},{"tool_name":"qveris_finance.crypto_bars_history","params":{"symbol":"BTC","interval":"1d","start_date":"2026-07-23","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.crypto_market_rankings","params":{"mode":"market_cap","limit":20,"quote_currency":"USD","market":"GLOBAL"}},{"tool_name":"qveris_finance.crypto_fgi","params":{"date":"2026-07-24"}},{"tool_name":"qveris_finance.crypto_whale","params":{"address":"0x52908400098527886E0F7030069857D2E4169EE7","network":"ETH","start_date":"2026-07-23","end_date":"2026-07-24"}}]`.
- Resolved CAPs by check: `[{"tool_name":"qveris_finance.crypto_ref_master","capability_id":"CRYPTO.REF_MASTER","detail_source":"live_catalog_fallback"},{"tool_name":"qveris_finance.crypto_spot_rt","capability_id":"CRYPTO.SPOT.RT","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_bars_history","capability_id":"CRYPTO.BARS.HISTORY","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_market_rankings","capability_id":"CRYPTO.MARKET_RANKINGS","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_fgi","capability_id":"CRYPTO.FGI","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.crypto_whale","capability_id":"CRYPTO.WHALE","detail_source":"live_catalog_fallback"}]`.
- Control-plane retries by check: `[{"tool_name":"qveris_finance.crypto_ref_master","phase":"capability_catalog_page_1","reason":"transient_fetch_failure","attempt":2}]`.
- Preflight errors by check: `[]`.
- Observed-call artifact: `live-e2e-output-2026-07-24.observed-calls.json`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| `qveris_finance.crypto_ref_master` | `{"symbol":"BTC"}` | failed | null | false | `["http_404"]` |
| `qveris_finance.crypto_spot_rt` | `{"symbol":"BTC"}` | success | fbc743cd-281b-4461-932f-de39186e132a | false | `[]` |
| `qveris_finance.crypto_bars_history` | `{"symbol":"BTC","interval":"1d","start_date":"2026-07-23","end_date":"2026-07-24"}` | success | 0b895f88-1d28-4ed8-8f2f-3e6660b44339 | false | `[]` |
| `qveris_finance.crypto_market_rankings` | `{"mode":"market_cap","limit":20,"quote_currency":"USD","market":"GLOBAL"}` | success | 0df52423-b673-4f26-8d5b-5b838c2968bd | false | `[]` |
| `qveris_finance.crypto_fgi` | `{"date":"2026-07-24"}` | success | 59a8133d-9614-4d9d-9b40-6b3d593a6c2f | false | `[]` |
| `qveris_finance.crypto_whale` | `{"address":"0x52908400098527886E0F7030069857D2E4169EE7","network":"ETH","start_date":"2026-07-23","end_date":"2026-07-24"}` | failed | null | false | `["http_404"]` |


Observed call count: `6`.

Not investment advice.
