# QVeris Data Routing

Use this reference when deciding which QVeris capabilities to discover for supply-chain bottleneck research.

## Capability Queries

Use English tool-type queries:

- `stock quote real-time API`
- `financial statement API`
- `company profile fundamentals API`
- `SEC filings API`
- `earnings transcript API`
- `A-share company announcement API`
- `Hong Kong stock exchange filings API`
- `company news API`
- `industry research report API`
- `social sentiment API`
- `patent search API`

Do not use factual questions as discovery queries.

## Minimum Call Sets

Single-company challenge:

- quote or market data;
- company profile;
- financial statements;
- filings or announcements;
- news or trade signal.

Theme scan:

- market universe or sector list where available;
- company profiles for candidates;
- financial statements for top candidates;
- filings, announcements, or transcripts for top candidates;
- news, report, or social signal for timing and market narrative.

## Evidence Labels

- Strong: filings, exchange announcements, official transcripts, annual/interim/quarterly reports, official orders, regulatory or project records.
- Medium: reputable media, trade publications, industry association data, company product pages, specialist analysis with visible assumptions.
- Weak: social posts, forums, unattributed channel checks, screenshots, or price action without fundamental evidence.
- Needs checking: important claim not yet verified by QVeris calls.

## Cost Control

Always inspect `billing_rule` before paid calls. For broad scans, propose a staged plan:

1. free Discover and Inspect;
2. small paid sample on 3-5 companies;
3. expand only after user approval.
