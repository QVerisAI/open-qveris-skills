# Retry And Budget Policy

The shared adapter owns capability discovery, cap-detail reads, public parameter filtering/coercion, symbol normalization, timeout behavior, recursive metadata sanitization, and observed-call recording.

- Retry one transient `fetch failed` or equivalent transport failure when budget remains.
- A data capability may have at most two observed attempts.
- Every retry consumes `max_calls` and has `fallback_used=true` in its observed Trace row.
- Reserve budget for later anchor calls before allowing an earlier retry.
- Parameter/schema failures may retry only with a smaller cap-detail-approved parameter set; never invent a required value.
- Empty, stale, mismatched, or semantically invalid payloads are rejected evidence, not a reason to call raw providers.
- Catalog/detail failures do not create data Trace rows. If preflight cannot complete, record a preflight error and claim no call.

Complete-content retrieval is not a second CAP call. For an opted-in finance workflow, the adapter may fetch a QVeris cache object only from `https://oss.qveris.cloud`, with redirects disabled and a 10 MiB ceiling. It retries one fetch failure and records retrieval attempts in the sanitized response. A failed retrieval leaves the payload truncated and therefore semantically unavailable.
