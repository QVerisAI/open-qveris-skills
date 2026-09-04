import assert from "node:assert/strict";
import test from "node:test";

import {
  assessMacroExecution,
  assessMacroWorkflow,
  compareSeries,
  assessCurveProxy,
} from "../scripts/macro_policy_evidence.mjs";
import {
  buildObservedCallsArtifact,
  buildStructuredOutput,
  buildWorkflowPlan,
  runWorkflow,
} from "../scripts/macro_policy_workflow.mjs";

const NOW = "2026-07-24T08:00:00.000Z";

function response(data, executionId = "11111111-1111-4111-8111-111111111111") {
  return { success: true, execution_id: executionId, result: { data } };
}

function executionFor(request, data, status = "success") {
  const trace = {
    tool_name: request.requestedCapability,
    params: request.parameters,
    status,
    execution_id: "11111111-1111-4111-8111-111111111111",
    fallback_used: false,
    missing_fields: [],
  };
  return {
    adapter_version: "qveris_finance_adapter.v1",
    final_params: request.parameters,
    response: response(data),
    observed_calls: [{
      request_kind: "capabilities/query",
      tool_name: request.requestedCapability,
      capability_id: request.requestedCapability.slice("qveris_finance.".length).replaceAll("_", ".").toUpperCase(),
      params: request.parameters,
      response: response(data),
      response_sha256: "a".repeat(64),
      execution_id: trace.execution_id,
      observed_at: NOW,
      trace,
    }],
    qveris_trace: [trace],
    retry_events: [],
    control_plane_retry_events: [],
  };
}

test("default US plan omits semantically unsupported interbank defaults", () => {
  const plan = buildWorkflowPlan({ workflow: "macro_policy", geography: "US", asOf: NOW });
  assert.equal(plan.minimum_call_count, 2);
  assert.deepEqual(plan.calls.map((item) => item.tool_name), [
    "qveris_finance.macro_indicators",
    "qveris_finance.rates_policy",
    "qveris_finance.macro_employment",
    "qveris_finance.macro_real_estate",
    "qveris_finance.macro_commodity_benchmark",
    "qveris_finance.rates_govt_benchmark",
    "qveris_finance.fx_spot",
    "qveris_finance.index_levels",
  ]);
  assert.deepEqual(plan.calls.find((item) => item.purpose === "commodity").params, {
    commodity_name: "WTI", start_date: "2026-03-26", end_date: "2026-07-24",
  });
  assert.equal(plan.calls.some((item) => item.purpose === "interbank_rates"), false);
  assert.deepEqual(plan.calls.find((item) => item.purpose === "fx_context").params, {
    base_currency: "EUR", quote_currency: "USD",
  });
  const serialized = JSON.stringify(plan.calls);
  assert.doesNotMatch(serialized, /EVENT\.CALENDAR\.MACRO|event_calendar_macro|macro_actual_vs_forecast/i);
});

test("CN plan uses the interbank CAP only with the verified SHIBOR type", () => {
  const plan = buildWorkflowPlan({ workflow: "macro_policy", geography: "CN", asOf: NOW });
  assert.equal(plan.calls.find((item) => item.purpose === "interbank_rates").params.rate_type, "shibor");
});

test("budget limit is enforced before transport", async () => {
  let calls = 0;
  const result = await runWorkflow({
    geography: "US",
    maxCalls: 1,
    now: () => NOW,
    executeCapability: async () => { calls += 1; throw new Error("must not run"); },
  });
  assert.equal(result.status, "budget_limited");
  assert.equal(result.observed_call_count, 0);
  assert.equal(calls, 0);
});

test("a single observation remains snapshot-only", () => {
  const assessment = assessMacroExecution({
    purpose: "macro_indicators",
    params: { country: "US" },
    response: response([{ date: "2026-06-01", value: 2.7, indicator_name: "CPI", country: "US", frequency: "monthly", unit: "%" }]),
    now: NOW,
  });
  assert.equal(assessment.semantic_status, "accepted");
  assert.equal(assessment.evidence.comparison.status, "snapshot");
  assert.equal(assessment.evidence.change_claim, "unsupported");
});

test("comparison requires aligned series, unit, frequency, geography, and two dates", () => {
  const aligned = compareSeries([
    { date: "2026-05-01", value: 2.5, indicator_name: "CPI", country: "US", frequency: "monthly", unit: "%" },
    { date: "2026-06-01", value: 2.7, indicator_name: "CPI", country: "US", frequency: "monthly", unit: "%" },
  ]);
  assert.equal(aligned.status, "increased");
  const mismatched = compareSeries([
    { date: "2026-05-01", value: 2.5, indicator_name: "CPI", country: "US", frequency: "monthly", unit: "%" },
    { date: "2026-06-01", value: 2.7, indicator_name: "CPI", country: "US", frequency: "quarterly", unit: "index" },
  ]);
  assert.equal(mismatched.status, "unsupported");
});

test("curve proxy requires two tenors on the same date and basis", () => {
  assert.equal(assessCurveProxy([{ date: "2026-07-23", tenor: "10Y", value: 4.2, country: "US", currency: "USD", unit: "%" }]).status, "unsupported");
  assert.equal(assessCurveProxy([
    { date: "2026-07-23", tenor: "2Y", value: 4.0, country: "US", currency: "USD", unit: "%" },
    { date: "2026-07-23", tenor: "10Y", value: 4.2, country: "US", currency: "USD", unit: "%" },
  ]).status, "observed");
});

test("index evidence is rejected when the returned asset is not an index", () => {
  const assessment = assessMacroExecution({
    purpose: "index_context",
    params: { symbol: "SPX" },
    response: response([{ symbol: "SPX", date: "2026-07-23", value: 100, asset_type: "equity" }]),
    now: NOW,
  });
  assert.equal(assessment.semantic_status, "rejected");
  assert.ok(assessment.semantic_issues.includes("index_asset_type_mismatch"));
});

test("accepts the explicit SPX to GSPC.INDX canonical alias", () => {
  const assessment = assessMacroExecution({
    purpose: "index_context",
    params: { symbol: "SPX" },
    response: response([{ symbol: "GSPC.INDX", timestamp: "2026-07-24T04:39:00+08:00", price: 7408.3 }]),
    now: NOW,
  });
  assert.equal(assessment.semantic_status, "accepted");
});

test("interbank success is rejected when the returned benchmark is from the wrong market", () => {
  const assessment = assessMacroExecution({
    purpose: "interbank_rates",
    params: { country: "US", rate_type: "sofr" },
    response: response([{ date: "2026-07-23", value: 1.5, name: "SHIBOR 3M", interval: "3M", unit: "%", currency: "CNY" }]),
    now: NOW,
  });
  assert.equal(assessment.semantic_status, "rejected");
  assert.ok(assessment.semantic_issues.some((issue) => ["interbank_rate_type_mismatch", "interbank_rates_requested_slice_empty"].includes(issue)));
});

test("macro fallback works when broad indicators fail and a sublayer succeeds", () => {
  const assessment = assessMacroWorkflow({ executions: [
    { purpose: "macro_indicators", semantic_status: "rejected" },
    { purpose: "employment", semantic_status: "accepted", evidence: { comparison: { status: "snapshot" } } },
    { purpose: "policy_rate", semantic_status: "accepted", evidence: { comparison: { status: "snapshot" } } },
  ] });
  assert.equal(assessment.fallback_mode, "complete_with_macro_fallback");
  assert.equal(assessment.policy_transmission.status, "unsupported");
});

test("rates failure produces macro_only and forbids policy-transmission claims", () => {
  const assessment = assessMacroWorkflow({ executions: [
    { purpose: "macro_indicators", semantic_status: "accepted", evidence: { comparison: { status: "snapshot" } } },
    { purpose: "policy_rate", semantic_status: "rejected" },
    { purpose: "government_rates", semantic_status: "rejected" },
  ] });
  assert.equal(assessment.fallback_mode, "macro_only");
  assert.equal(assessment.policy_transmission.status, "unsupported");
});

test("structured output and sidecar project only runtime observed calls", async () => {
  const result = await runWorkflow({
    geography: "US",
    maxCalls: 2,
    now: () => NOW,
    executeCapability: async (request) => request.requestedCapability.endsWith("macro_indicators")
      ? executionFor(request, [{ date: "2026-06-01", value: 2.7, indicator_name: "CPI", country: "US", frequency: "monthly", unit: "%" }])
      : executionFor(request, [{ date: "2026-07-01", value: 5.25, name: "Policy Rate", country: "US", currency: "USD", unit: "%" }]),
  });
  const output = buildStructuredOutput(result);
  const artifact = buildObservedCallsArtifact(result, { caseId: "unit", recordedAt: NOW });
  assert.equal(output.skill, "qveris-macro-policy-monitor");
  assert.equal(output.observed_call_count, 2);
  assert.deepEqual(artifact.observed_calls.map((call) => call.trace), output.qveris_trace);
  assert.equal(output.analysis.policy_transmission.status, "unsupported");
});

test("download-only truncated payloads are unavailable, not evidence", () => {
  const assessment = assessMacroExecution({
    purpose: "macro_indicators",
    params: { country: "US" },
    response: { success: true, result: { full_content_file_url: "https://cache.example/signed", truncated_content: "[{\"date\":" } },
  });
  assert.equal(assessment.semantic_status, "rejected");
  assert.deepEqual(assessment.semantic_issues, ["macro_indicators_payload_truncated"]);
});
