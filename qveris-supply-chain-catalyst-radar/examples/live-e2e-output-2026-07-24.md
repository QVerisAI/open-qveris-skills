# qveris-supply-chain-catalyst-radar Live E2E

## Summary

Case `supply-chain-alt-cap-matrix` ran through the public finance adapter. Final observed status: `failed`; broader skill conclusions remain out of scope for this contract check.

## Evidence

8 live CAP attempt(s) were observed, but the final attempt failed. They supply call-availability evidence only and no positive market or issuer evidence.

## Analysis

This run verifies the live trace-to-artifact contract. It does not infer missing layers, retries, per-security results, or fallback calls that were not observed.

## Data Quality And Missing Fields

- `data_quality.status`: `insufficient`.
- `missing_fields`: `["http_404"]`.
- Requested logical CAPs: `["qveris_finance.ref_security_master","qveris_finance.alt_supply_chain","qveris_finance.alt_job_postings","qveris_finance.alt_patents","qveris_finance.alt_govt_contracts","qveris_finance.filings_regulatory_metadata","qveris_finance.news_fin_tagged","qveris_finance.alt_shipping_ais"]`.
- Final transmitted params by check: `[{"tool_name":"qveris_finance.ref_security_master","params":{"symbol":"AAPL"}},{"tool_name":"qveris_finance.alt_supply_chain","params":{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.alt_job_postings","params":{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.alt_patents","params":{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.alt_govt_contracts","params":{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.filings_regulatory_metadata","params":{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.news_fin_tagged","params":{"symbol":"AAPL","start_date":"2026-07-17","end_date":"2026-07-24"}},{"tool_name":"qveris_finance.alt_shipping_ais","params":{"vessel_id":"210035000","start_date":"2026-07-23","end_date":"2026-07-24"}}]`.
- Resolved CAPs by check: `[{"tool_name":"qveris_finance.ref_security_master","capability_id":"REF.SECURITY_MASTER","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.alt_supply_chain","capability_id":"ALT.SUPPLY_CHAIN","detail_source":"live_catalog_fallback"},{"tool_name":"qveris_finance.alt_job_postings","capability_id":"ALT.JOB_POSTINGS","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.alt_patents","capability_id":"ALT.PATENTS","detail_source":"live_catalog_fallback"},{"tool_name":"qveris_finance.alt_govt_contracts","capability_id":"ALT.GOVT_CONTRACTS","detail_source":"live_catalog_fallback"},{"tool_name":"qveris_finance.filings_regulatory_metadata","capability_id":"FILINGS.REGULATORY.METADATA","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.news_fin_tagged","capability_id":"NEWS.FIN.TAGGED","detail_source":"live_cap_detail"},{"tool_name":"qveris_finance.alt_shipping_ais","capability_id":"ALT.SHIPPING_AIS","detail_source":"live_cap_detail"}]`.
- Control-plane retries by check: `[{"tool_name":"qveris_finance.ref_security_master","phase":"capability_catalog_page_1","reason":"transient_fetch_failure","attempt":2}]`.
- Preflight errors by check: `[]`.
- Observed-call artifact: `live-e2e-output-2026-07-24.observed-calls.json`.
- Raw provider, route, candidate, failover, and credential metadata is removed recursively before the artifact is saved.

## Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|
| `qveris_finance.ref_security_master` | `{"symbol":"AAPL"}` | success | 0c680234-66a2-435e-9837-18529b373843 | false | `[]` |
| `qveris_finance.alt_supply_chain` | `{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}` | failed | null | false | `["http_404"]` |
| `qveris_finance.alt_job_postings` | `{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}` | success | ae3bff3b-4b15-406e-8e31-59765bbf3d36 | false | `[]` |
| `qveris_finance.alt_patents` | `{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}` | failed | null | false | `["http_404"]` |
| `qveris_finance.alt_govt_contracts` | `{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}` | failed | null | false | `["http_404"]` |
| `qveris_finance.filings_regulatory_metadata` | `{"symbol":"AAPL","start_date":"2026-04-25","end_date":"2026-07-24"}` | success | 6708a3e2-3fae-4b27-94e1-0ad150f0cc4e | false | `[]` |
| `qveris_finance.news_fin_tagged` | `{"symbol":"AAPL","start_date":"2026-07-17","end_date":"2026-07-24"}` | success | 2a10bd6c-c6b2-454a-b8d6-484920afbea3 | false | `[]` |
| `qveris_finance.alt_shipping_ais` | `{"vessel_id":"210035000","start_date":"2026-07-23","end_date":"2026-07-24"}` | success | 4b91b991-aca2-441d-bb9d-fb36dee3fb70 | false | `[]` |


Observed call count: `8`.

Not investment advice.
