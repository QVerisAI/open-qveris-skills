# Macro Data Quality Rules

## Observation Gate

Accept a row only when it contains a parseable observation timestamp and finite numeric value. Require a series/indicator name for broad macro indicators. If returned country/region metadata conflicts with the request, reject the layer. Treat release date and revision status as missing unless explicitly returned.

Default maximum ages, measured against the requested `as_of`, are:

- macro series: `P400D`;
- policy and benchmark rates: `P120D`;
- FX and index context: `P7D`.

Historical analysis may set `as_of` to the historical cutoff. Do not compare historical rows with today's freshness clock.

## Comparison Gate

A descriptive comparison needs two distinct dates for the same:

1. series or benchmark name;
2. geography;
3. frequency/interval;
4. unit;
5. measurement basis where supplied.

One row is `snapshot`. Multiple incompatible rows are `unsupported`. An aligned pair may be `increased`, `decreased`, or `unchanged`; those words describe the number only. `Improved`, `deteriorated`, `accelerated`, and `decelerated` require domain semantics not supplied by this generic workflow and remain unsupported.

## Curve Gate

A government-rate curve proxy needs two different tenors on one date with matching country, currency, unit, and benchmark basis. It is a partial proxy, not a complete yield curve. Do not infer slope when tenor strings cannot be ordered reliably.

## Policy And Cross-Asset Gate

Accepted policy, rate, FX, commodity, and index observations can be displayed side by side. Temporal proximity or directional co-movement does not identify policy transmission, surprise, or causality. The workflow therefore emits `policy_transmission.status=unsupported` by default.

## Fallback States

- `complete`: accepted broad macro plus at least one accepted rates layer.
- `complete_with_macro_fallback`: broad indicators unavailable, but a macro sublayer and rates layer are accepted.
- `macro_only`: at least one macro layer, no rates layer.
- `rates_only`: at least one rates layer, no macro layer.
- `limited`: neither group accepted; market context does not promote the result.
- `budget_limited`: minimum anchors did not fit, with zero data calls.

Download-only/truncated payloads are unavailable until retrieved through the shared adapter's approved complete-content path and revalidated. That path is restricted to HTTPS `oss.qveris.cloud`, refuses redirects, caps content at 10 MiB, retries one fetch failure, hashes the retrieved bytes, removes the signed URL, and locally reapplies country, series, benchmark, and date filters because the upstream result may be broader than requested. If retrieval or the requested slice fails, reject the layer. Never interpret the visible prefix.
