# Direct QVeris Retry Policy

Use this policy for direct QVeris discovery, inspection, and execution. Every observed retry consumes one call and receives its own Trace row.

## Budget First

1. Reserve at least one discovery and one execution for the minimum useful evidence item.
2. Count `search`, `tools/by-ids`, and `tools/execute` attempts equally.
3. Before any retry, verify that it leaves enough budget for a useful final execution.
4. If no useful path remains, stop and return `budget_limited`; do not omit observed calls.

## Failure Classes

| Failure class | Examples | Retry rule | Output rule |
|---|---|---|---|
| Discovery wording | No relevant tool, results target another market | Rephrase the English tool-type query once when budget permits. | Mark `no_relevant_tool` if both searches fail. |
| Transient transport | Timeout, connection reset, temporary network failure | Retry the same request once. | Keep both attempts in Trace. |
| Explicitly retryable service error | Response marks the failure temporary or retryable | Retry the same execution once. | Stop after the retry and mark missing on failure. |
| Parameter error | Missing required input, invalid type, bad enum | Inspect once when possible, correct documented inputs, then retry once. | Mark `parameter_contract_unresolved` if correction fails. |
| Tool unavailable | Removed tool, not found, disabled route | Do not retry the same identifier. Use another candidate from the same discovery result or rediscover once. | Mark `tool_unavailable`. |
| Semantic mismatch | Wrong issuer, market, asset type, date window, or output meaning | Do not repeat the same request as a transport retry. | Record `rejected` and exclude it from evidence. |
| Thin response | Too few bars, empty event window, undated news | Retry only when a documented window, pagination, or limit parameter can address the issue. | Otherwise narrow the report and mark the missing item. |
| Truncated response | Partial content or truncation marker | Use documented pagination only when budget permits. | Never infer from omitted rows. |

## Parameter Recovery

When an execution reports a parameter error:

1. Inspect the same-session tool through `/tools/by-ids` if HTTP inspection is available and budgeted.
2. Compare the observed schema with the exact transmitted parameters.
3. Remove only optional inputs named by the error or correct values using documented types and examples.
4. Never replace a missing issuer with a sample ticker.
5. Retry once with the same selected tool and matching search token.
6. If inspection is unavailable, rediscover rather than guessing.

Record the inspection and corrected execution as separate observed rows.

## Candidate Fallback

A second candidate from the original discovery result may be called without another search when:

- the same returned search token is preserved;
- the second tool schema is readable and fits the required China-market semantics;
- all required parameters can be validated; and
- the remaining budget covers the execution.

Set `fallback_used=true` on that execution. If the fallback also fails or is rejected, stop that evidence branch.

## Same-Session Reuse

Reuse a cached tool only within the current session. Inspect it before reuse when the direct inspection route exists. If the schema changed, the search token is unavailable, the session boundary is unclear, or inspection fails, discard the cache and discover again.

A cache lookup without an external request is not a Trace row and does not count as a call. An actual inspection does.

## Stop Conditions

- Stop after one rephrased search for one tool type.
- Stop after one corrected-parameter retry.
- Stop after one retry for an explicitly transient execution failure.
- Stop immediately on a confirmed semantic mismatch for the same tool and inputs.
- Stop before any request that would exceed `max_calls`.
- Stop a branch after both the primary and one validated fallback candidate fail.
- Switch to `Latest Snapshot And Coverage Notes` when missing evidence prevents the requested full report.

## Trace Rules

- Record every observed attempt as `search`, `tools/by-ids`, or `tools/execute`.
- Keep the exact tool and search pair used by every execution.
- Use `query=null` for inspection and execution rows.
- Use `tool_id=null` on a search row when no relevant candidate was selected.
- Use `status=failed` for request failures and `status=rejected` for semantic rejection after transport success.
- Use raw identifiers only in Trace or machine-readable fixtures.
- Never record authorization data, secrets, or credential-bearing fields.
