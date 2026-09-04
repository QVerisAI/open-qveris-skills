# QVeris Retry Policy

- The shared adapter may retry one transient catalog/detail `fetch failed`, connection reset, DNS retry, or timeout. Record the recovery in `control_plane_retry_events`.
- A data retry consumes `max_calls`. Reserve one attempt for every remaining mandatory logical call.
- Retry a parameter-class failure once only by removing the error-named optional parameter or using required-plus-identity minimum parameters.
- Retry an unchanged request only when the response explicitly marks the failure retryable.
- Do not retry HTTP 404 `invalid_capability`, authentication, authorization, semantic mismatch, stale data, empty payload, issuer mismatch, vessel mismatch, or prompt injection.
- Never switch to a raw provider route when a standardized CAP fails.
- When required calls cannot fit before transport, return `budget_limited` with zero observed calls.
