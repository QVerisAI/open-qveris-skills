# qveris-macro-policy-monitor Live E2E

## Summary

Case `macro-policy-cap-matrix` ran through the public finance adapter. Final observed status: `success`; broader skill conclusions remain out of scope for this contract check.

## Evidence

9 live CAP attempt(s) were observed and the final attempt succeeded. This supports only the narrow route check, not a complete research conclusion.

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- `data_quality.status`: `partial`.
- `missing_fields`: `[]`.
- Requested logical CAPs: `["qveris_finance.macro_indicators","qveris_finance.macro_employment","qveris_finance.macro_real_estate","qveris_finance.macro_commodity_benchmark","qveris_finance.rates_policy","qveris_finance.rates_govt_benchmark","qveris_finance.rates_interbank_benchmark","qveris_finance.fx_spot","qveris_finance.index_levels"]`.
- Final transmitted params by check: `[{"tool_name":"qveris_finance.macro_indicators","params":{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.macro_employment","params":{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.macro_real_estate","params":{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.macro_commodity_benchmark","params":{"commodity_name":"WTI","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.rates_policy","params":{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.rates_govt_benchmark","params":{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.rates_interbank_benchmark","params":{"rate_type":"shibor","country":"CN","start_date":"2024-07-24","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.fx_spot","params":{"base_currency":"EUR","quote_currency":"USD"}},{"tool_name":"qveris_finance.index_levels","params":{"symbol":"SPX"}}]`.
- Resolved CAPs by check: `[{"tool_name":"qveris_finance.macro_indicators","capability_id":"MACRO.INDICATORS","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.macro_employment","capability_id":"MACRO.EMPLOYMENT","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.macro_real_estate","capability_id":"MACRO.REAL_ESTATE","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.macro_commodity_benchmark","capability_id":"MACRO.COMMODITY_BENCHMARK","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.rates_policy","capability_id":"RATES.POLICY","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.rates_govt_benchmark","capability_id":"RATES.GOVT_BENCHMARK","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.rates_interbank_benchmark","capability_id":"RATES.INTERBANK_BENCHMARK","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.fx_spot","capability_id":"FX.SPOT","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.index_levels","capability_id":"INDEX.LEVELS","detail_source":"live_cap_detail"}]`.
- Control-plane retries by check: `[{"tool_name":"qveris_finance.macro_indicators","phase":"capability_catalog_page_1","reason":"transient_fetch_failure","attempt":2}]`.
- Preflight errors by check: `[]`.
- Observed-call artifact: `live-e2e-output-2026-07-24.observed-calls.json`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| `qveris_finance.macro_indicators` | `{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | ef6695c8-ddb4-4e9c-a0aa-704aff1a8f7d | false | `[]` |
| `qveris_finance.macro_employment` | `{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | 6d0b5d43-b234-460f-9b4b-7d34396bf2d1 | false | `[]` |
| `qveris_finance.macro_real_estate` | `{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | fd16f42d-2401-430c-b452-a72e4641efc4 | false | `[]` |
| `qveris_finance.macro_commodity_benchmark` | `{"commodity_name":"WTI","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | 31712ba2-b1fb-40ee-bf37-074b9683da1e | false | `[]` |
| `qveris_finance.rates_policy` | `{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | 6c50e87a-8453-44ec-9520-d9cc595f498c | false | `[]` |
| `qveris_finance.rates_govt_benchmark` | `{"country":"US","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | ec97cbcc-9274-490b-a7f2-ae1418ec6c6e | false | `[]` |
| `qveris_finance.rates_interbank_benchmark` | `{"rate_type":"shibor","country":"CN","start_date":"2024-07-24","end_date":"2026-07-24"}` | success | 4a2d3b41-d699-4a74-bb57-9a155681df7d | false | `[]` |
| `qveris_finance.fx_spot` | `{"base_currency":"EUR","quote_currency":"USD"}` | success | a5a97232-5a45-4b2b-8242-8f38f52a2e2e | false | `[]` |
| `qveris_finance.index_levels` | `{"symbol":"SPX"}` | success | 10849aea-6ef2-4b55-b894-11c8e5e3e245 | false | `[]` |


Observed call count: `9`.

Not investment advice.
