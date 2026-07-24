# QVeris Tool Map

Resolve every logical name through the live finance catalog and cap-detail. Do not keep a static canonical-ID map in executable code.

| Evidence layer | Logical CAP | Public parameters | Acceptance floor |
|---|---|---|---|
| Issuer identity | `qveris_finance.ref_security_master` | `symbol` | Matching symbol, equity-like asset type, name, exchange |
| Supply-chain relationships | `qveris_finance.alt_supply_chain` | `symbol`, `start_date`, `end_date` | Matching issuer, in-window date, explicit supplier/customer/partner/counterparty relationship |
| Hiring | `qveris_finance.alt_job_postings` | `symbol`, `start_date`, `end_date` | Matching issuer, date, job title; location when displayed |
| Patents | `qveris_finance.alt_patents` | `symbol`, `start_date`, `end_date` | Matching issuer, date, patent/application/title/document identity |
| Government contracts | `qveris_finance.alt_govt_contracts` | `symbol`, `start_date`, `end_date` | Matching issuer, date, contract/award/title/value identity |
| Vessel observation | `qveris_finance.alt_shipping_ais` | `vessel_id`, `start_date`, `end_date` | Matching vessel ID, timestamp, valid latitude/longitude |
| Filing corroboration | `qveris_finance.filings_regulatory_metadata` | `symbol`, `start_date`, `end_date` | Matching issuer, filing date, form/accession/URL |
| News corroboration | `qveris_finance.news_fin_tagged` | `symbol`, `start_date`, `end_date` | Matching issuer, publication time, headline, URL/source |

`ALT.SHIPPING_AIS` does not accept an issuer ticker. A successful vessel lookup is never issuer evidence until an independently accepted relationship record links the exact vessel ID.

At the 2026-07-24 implementation check, live cap-detail was available for jobs and AIS. Government contracts, patents, and supply-chain relationships used exact live-catalog fallback because their detail endpoint returned 404. The shared adapter must still re-read the current runtime contract every run and report `capability_unavailable` if query execution is not supported.
