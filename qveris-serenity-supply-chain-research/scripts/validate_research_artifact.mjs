#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

import { validateSerenityResearch } from "./serenity_validity.mjs";

export const ARTIFACT_VERSION = "qveris.serenity-research-output.v1";
const TRACE_FIELDS = ["tool_name", "params", "status", "execution_id", "fallback_used", "missing_fields"];
const TRACE_STATUSES = new Set(["success", "failed", "rejected"]);
const OUTPUT_STATUSES = new Set(["accepted", "degraded", "rejected", "initial_pass", "budget_limited", "blocked"]);
const WORKFLOW_STAGES = new Set(["planned", "evidence_acquired", "validated", "complete"]);
const EVIDENCE_STATUSES = new Set(["observed", "calculated", "estimated", "not_applicable", "missing"]);
const DATA_QUALITY_BY_STATUS = {
  accepted: "complete",
  degraded: "partial",
  rejected: "rejected",
  initial_pass: "initial_pass",
  budget_limited: "budget_limited",
  blocked: "blocked",
};
const SCORE_FACTORS = [
  "demand_pressure", "system_coupling", "scarcity_mechanism", "supplier_concentration",
  "expansion_difficulty", "evidence_quality", "valuation_context", "event_visibility",
];
const ROUTING_KEY = /(^|[-_])(provider|route|routing|candidate|candidates|failover|credential|api[-_]?key|source[-_]?tool[-_]?id|tool[-_]?id|cap[-_]?tool[-_]?id)($|[-_])/i;
const SECRET_TEXT = /\b(?:sk|sk-cn)-[A-Za-z0-9_-]{16,}\b|authorization\s*:\s*bearer\s+\S+|["'](?:api[_-]?key|access[_-]?token|cookie|password)["']\s*:\s*["'][^"'\s]{8,}["']/i;
const SIGNED_URL = /[?&](?:x-amz-signature|signature|access_token|token|api_key)=/i;

export function validateSerenityArtifact(output, observedSidecar, webSidecar) {
  const errors = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return { valid: false, errors: ["output must be an object"], computed_validity: null };
  }
  if (output.schema_version !== ARTIFACT_VERSION) errors.push(`schema_version must be ${ARTIFACT_VERSION}`);
  if (!OUTPUT_STATUSES.has(output.status)) errors.push("status is invalid");
  if (!WORKFLOW_STAGES.has(output.workflow_stage)) errors.push("workflow_stage is invalid");
  if (output.disclaimer !== "Not investment advice.") errors.push("disclaimer must be exactly 'Not investment advice.'");
  if (!Number.isFinite(Date.parse(output.as_of ?? ""))) errors.push("as_of must be an ISO timestamp");
  if (!sameSet(output.required_factors, SCORE_FACTORS)) errors.push("required_factors must be the exact fixed scorecard factor set");
  validateCutoff(output, errors);
  validateControlsAndPlan(output, errors);
  validatePayloadText(output, "output", errors);
  validateArtifactSafety(observedSidecar, "observed-call sidecar", errors);
  validateArtifactSafety(webSidecar, "Web sidecar", errors);
  validateDryRunSidecars(output, observedSidecar, webSidecar, errors);

  const trace = validateTrace(output, observedSidecar, errors);
  validateEvidenceExecutions(output.evidence, trace, errors);
  validateWebSidecar(output.evidence, webSidecar, errors);

  const candidates = Array.isArray(output.candidates) ? output.candidates : [];
  const layers = Array.isArray(output.layers) ? output.layers : [];
  const publishCandidateRanking = candidates.some((item) => item && typeof item === "object" && ("rank" in item || "score" in item || "final_score" in item));
  const publishLayerRanking = layers.some((item) => item && typeof item === "object" && ("rank" in item || "score" in item || "priority_score" in item));
  const computed = validateSerenityResearch({
    as_of: output.as_of,
    required_factors: output.required_factors,
    evidence: Array.isArray(output.evidence) ? output.evidence : [],
    layers,
    candidates,
    publish_candidate_ranking: publishCandidateRanking,
    publish_layer_ranking: publishLayerRanking,
  });
  compareValidity(output.validity, computed, errors);
  validatePublishedLayerRanking(layers, computed, errors);
  validateStatusMapping(output, computed, publishCandidateRanking, publishLayerRanking, errors);
  return { valid: errors.length === 0, errors, computed_validity: computed };
}

function validateDryRunSidecars(output, observedSidecar, webSidecar, errors) {
  if (output?.controls?.dry_run !== true) return;
  if (Array.isArray(observedSidecar?.observed_calls) && observedSidecar.observed_calls.length > 0) {
    errors.push("dry_run=true forbids observed CAP calls in sidecars");
  }
  if (Array.isArray(webSidecar?.web_sources) && webSidecar.web_sources.length > 0) {
    errors.push("dry_run=true forbids Web operations in sidecars");
  }
}

function validateStatusMapping(output, computed, publishCandidateRanking, publishLayerRanking, errors) {
  const dataQuality = output.data_quality;
  if (!dataQuality || typeof dataQuality !== "object" || Array.isArray(dataQuality)) {
    errors.push("data_quality must be an object");
    return;
  }
  const expected = DATA_QUALITY_BY_STATUS[output.status];
  if (expected && dataQuality.status !== expected) errors.push(`status=${output.status} requires data_quality.status=${expected}`);
  if (!Array.isArray(dataQuality.missing_fields)) {
    errors.push("data_quality.missing_fields must be an array");
    return;
  }
  const missing = dataQuality.missing_fields.filter((item) => String(item).trim()).length;
  const acceptedEvidence = (Array.isArray(output.evidence) ? output.evidence : []).filter((item) => item?.status === "accepted").length;
  if (output.workflow_stage === "complete" && output.status !== "accepted") errors.push("workflow_stage=complete requires status=accepted");
  if (output.status === "accepted" && computed.status !== "accepted") errors.push("status=accepted is more permissive than computed validity");
  if (output.status === "accepted" && output.workflow_stage !== "complete") errors.push("status=accepted requires workflow_stage=complete");
  if (output.status === "accepted" && missing > 0) errors.push("status=accepted requires no missing data-quality fields");
  if (output.status === "degraded" && (acceptedEvidence === 0 || missing === 0)) {
    errors.push("status=degraded requires useful accepted evidence and disclosed missing fields");
  }
  if (output.status === "initial_pass" && missing === 0) errors.push("status=initial_pass requires disclosed incomplete discovery or coverage");
  if (output.status === "initial_pass" && output.workflow_stage === "complete") errors.push("status=initial_pass cannot be complete");
  if (output.status === "blocked" && !String(dataQuality.blocking_reason ?? "").trim()) errors.push("status=blocked requires data_quality.blocking_reason");
  if (computed.status === "rejected" && output.status !== "rejected") errors.push("computed semantic rejection requires status=rejected");
  if (["initial_pass", "budget_limited", "blocked", "rejected"].includes(output.status) && (publishCandidateRanking || publishLayerRanking)) {
    errors.push(`${output.status} output cannot publish rankings or scores`);
  }
  if (output.status === "rejected" && computed.status !== "rejected") errors.push("status=rejected requires computed validity rejection");
}

function validatePublishedLayerRanking(layers, computed, errors) {
  const published = layers.filter((item) => item && typeof item === "object"
    && ("rank" in item || "score" in item || "priority_score" in item));
  if (published.length === 0) return;
  if (published.some((item) => "score" in item)) errors.push("published layers must use priority_score, not an ambiguous score field");
  const expected = computed.layer_ranking ?? [];
  if (published.length !== expected.length) {
    errors.push("published layer ranking must include every accepted layer in the computed ranking");
    return;
  }
  const byId = new Map(published.map((item) => [item.layer_id, item]));
  for (const row of expected) {
    const item = byId.get(row.layer_id);
    if (!item || item.rank !== row.rank || item.priority_score !== row.priority_score) {
      errors.push(`published layer ranking does not match computed result for ${row.layer_id}`);
    }
  }
}

function validateCutoff(output, errors) {
  const cutoff = output.cutoff;
  if (!cutoff || typeof cutoff !== "object" || Array.isArray(cutoff)) {
    errors.push("cutoff must be an object");
    return;
  }
  const t0 = Date.parse(cutoff.T0 ?? "");
  const requested = Date.parse(cutoff.CUT_OFF ?? "");
  const effective = Date.parse(cutoff.effective_cutoff ?? "");
  if (![t0, requested, effective].every(Number.isFinite)) {
    errors.push("cutoff T0, CUT_OFF, and effective_cutoff must be ISO timestamps");
    return;
  }
  if (effective !== Math.min(t0, requested)) errors.push("cutoff.effective_cutoff must equal min(T0,CUT_OFF)");
  if (Date.parse(output.as_of ?? "") !== effective) errors.push("as_of must equal cutoff.effective_cutoff");
}

function validateControlsAndPlan(output, errors) {
  const controls = output.controls;
  if (!controls || typeof controls !== "object" || Array.isArray(controls)) {
    errors.push("controls must be an object");
    return;
  }
  for (const name of ["dry_run", "max_calls", "max_web_operations", "max_age", "budget_note", "source_mode", "workflow"]) {
    if (!(name in controls)) errors.push(`controls.${name} is required`);
  }
  if (!Number.isInteger(controls.max_calls) || controls.max_calls < 0) errors.push("controls.max_calls must be a non-negative integer");
  if (!Number.isInteger(controls.max_web_operations) || controls.max_web_operations < 0) errors.push("controls.max_web_operations must be a non-negative integer");
  const webTrace = Array.isArray(output.web_trace) ? output.web_trace : [];
  if (!Array.isArray(output.web_trace)) errors.push("web_trace must be an array");
  if (Number.isInteger(controls.max_web_operations) && webTrace.length > controls.max_web_operations) errors.push("Web operations exceed controls.max_web_operations");
  if (Number.isInteger(controls.max_calls) && Number(output.observed_call_count) > controls.max_calls) errors.push("observed calls exceed controls.max_calls");

  for (const name of ["planned_universe", "evidence_matrix", "planned_calls"]) {
    if (!Array.isArray(output[name])) errors.push(`${name} must be an array`);
  }
  for (const [index, row] of (Array.isArray(output.planned_universe) ? output.planned_universe : []).entries()) {
    if (!String(row?.lead ?? "").trim() || !["discovered_lead", "user_supplied_unverified", "planned_identity_check"].includes(row?.status)) errors.push(`planned_universe[${index}] is invalid`);
  }
  const requiredMissingFields = [];
  for (const [index, row] of (Array.isArray(output.evidence_matrix) ? output.evidence_matrix : []).entries()) {
    if (!String(row?.field ?? "").trim() || typeof row?.required !== "boolean") {
      errors.push(`evidence_matrix[${index}] is invalid`);
      continue;
    }
    if (row.status != null && !EVIDENCE_STATUSES.has(row.status)) errors.push(`evidence_matrix[${index}].status is invalid`);
    if (row.required === true && row.status === "missing") requiredMissingFields.push(String(row.field).trim());
  }
  for (const [index, row] of (Array.isArray(output.planned_calls) ? output.planned_calls : []).entries()) {
    if (!/^qveris_finance\.[a-z0-9_]+$/.test(String(row?.tool_name ?? "")) || !String(row?.purpose ?? "").trim()
      || typeof row?.required !== "boolean" || !Number.isInteger(row?.call_estimate) || row.call_estimate < 0
      || !String(row?.batch_assumption ?? "").trim()) errors.push(`planned_calls[${index}] is invalid`);
  }
  const requiredCallEstimate = (Array.isArray(output.planned_calls) ? output.planned_calls : [])
    .filter((row) => row?.required === true && Number.isInteger(row?.call_estimate))
    .reduce((total, row) => total + row.call_estimate, 0);
  if (Number.isInteger(controls.max_calls)) {
    const planExceedsBudget = requiredCallEstimate > controls.max_calls;
    const observedBudgetExhausted = Number.isInteger(output.observed_call_count)
      && output.observed_call_count === controls.max_calls && requiredMissingFields.length > 0;
    if (planExceedsBudget && !["budget_limited", "blocked"].includes(output.status)) {
      errors.push("worst-case required planned attempts exceed controls.max_calls without budget_limited status");
    }
    if (observedBudgetExhausted && !["budget_limited", "blocked"].includes(output.status)) {
      errors.push("exhausted observed attempts with required missing evidence requires budget_limited status");
    }
    if (output.status === "budget_limited" && !(planExceedsBudget || observedBudgetExhausted)) {
      errors.push("budget_limited requires either worst-case required planned attempts above controls.max_calls or exhausted observed attempts with required missing evidence");
    }
  }
  if (controls.dry_run === true) {
    if (output.workflow_stage !== "planned") errors.push("dry_run=true requires workflow_stage=planned");
    if (output.observed_call_count !== 0 || (Array.isArray(output.qveris_trace) && output.qveris_trace.length > 0)) errors.push("dry_run=true forbids finance attempts and Trace rows");
    if ((Array.isArray(output.evidence) && output.evidence.length > 0) || webTrace.length > 0) errors.push("dry_run=true forbids accepted evidence and Web operations");
    if (!["initial_pass", "budget_limited", "blocked"].includes(output.status)) errors.push("dry_run=true requires an uncompleted top-level status");
  }
}

function validateTrace(output, sidecar, errors) {
  const rows = Array.isArray(output.qveris_trace) ? output.qveris_trace : [];
  if (!Array.isArray(output.qveris_trace)) errors.push("qveris_trace must be an array");
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`qveris_trace[${index}] must be an object`);
      continue;
    }
    if (!isDeepStrictEqual(Object.keys(row).sort(), [...TRACE_FIELDS].sort())) errors.push(`qveris_trace[${index}] must contain exactly six trace fields`);
    if (!/^qveris_finance\.[a-z0-9_]+$/.test(String(row.tool_name ?? ""))) errors.push(`qveris_trace[${index}].tool_name is invalid`);
    if (!TRACE_STATUSES.has(row.status)) errors.push(`qveris_trace[${index}].status is invalid`);
    if (!row.params || typeof row.params !== "object" || Array.isArray(row.params)) errors.push(`qveris_trace[${index}].params must be an object`);
    else if ([...walkKeys(row.params)].some((key) => ROUTING_KEY.test(key))) errors.push(`qveris_trace[${index}].params leaks routing metadata`);
    if (typeof row.fallback_used !== "boolean") errors.push(`qveris_trace[${index}].fallback_used must be boolean`);
    if (!Array.isArray(row.missing_fields)) errors.push(`qveris_trace[${index}].missing_fields must be an array`);
  }
  if (output.observed_call_count !== rows.length) errors.push("observed_call_count must equal qveris_trace length");
  if (rows.length === 0) {
    if (sidecar && Array.isArray(sidecar.observed_calls) && sidecar.observed_calls.length > 0) errors.push("empty qveris_trace cannot have observed calls");
    return rows;
  }
  if (!sidecar || sidecar.artifact_version !== "observed_calls.v1" || !Array.isArray(sidecar.observed_calls)) {
    errors.push("non-empty qveris_trace requires observed_calls.v1");
    return rows;
  }
  const projected = sidecar.observed_calls.map((call, index) => {
    if (!call || typeof call !== "object") {
      errors.push(`observed_calls[${index}] must be an object`);
      return null;
    }
    if (call.request_kind !== "capabilities/query") errors.push(`observed_calls[${index}].request_kind must be capabilities/query`);
    if (!String(call.capability_id ?? "").trim()) errors.push(`observed_calls[${index}].capability_id is required`);
    if (call.response?.capability_id != null && call.response.capability_id !== call.capability_id) errors.push(`observed_calls[${index}] response capability mismatch`);
    return call.trace && typeof call.trace === "object"
      ? call.trace
      : Object.fromEntries(TRACE_FIELDS.map((field) => [field, call[field]]));
  });
  if (!isDeepStrictEqual(projected, rows)) errors.push("qveris_trace must match observed_calls.v1 row-for-row");
  return rows;
}

function validateEvidenceExecutions(evidenceValue, trace, errors) {
  const evidence = Array.isArray(evidenceValue) ? evidenceValue : [];
  if (!Array.isArray(evidenceValue)) errors.push("evidence must be an array");
  const successful = new Map(trace.filter((row) => row?.status === "success").map((row) => [row.execution_id, row.tool_name]));
  for (const [index, item] of evidence.entries()) {
    if (item?.source_type !== "qveris_finance" || item?.status !== "accepted") continue;
    if (!successful.has(item.execution_id)) errors.push(`evidence[${index}] execution_id is absent from successful Trace`);
    else if (successful.get(item.execution_id) !== item.tool_name) errors.push(`evidence[${index}] tool_name does not match Trace`);
  }
}

function validateWebSidecar(evidenceValue, sidecar, errors) {
  const accepted = (Array.isArray(evidenceValue) ? evidenceValue : []).filter((item) => item?.source_type === "web" && item?.status === "accepted");
  if (accepted.length === 0) return;
  if (!sidecar || sidecar.artifact_version !== "web_sources.v1" || !Array.isArray(sidecar.web_sources)) {
    errors.push("accepted Web evidence requires web_sources.v1");
    return;
  }
  const required = [
    "evidence_id", "status", "query", "final_url", "title", "publisher_owner", "evidence_owner", "published_at",
    "accessed_at", "body_sha256", "issuer_or_topic_match", "window_match", "independence_result",
  ];
  const byId = new Map();
  for (const [index, row] of sidecar.web_sources.entries()) {
    if (!row || typeof row !== "object") {
      errors.push(`web_sources[${index}] must be an object`);
      continue;
    }
    for (const field of required) if (!(field in row)) errors.push(`web_sources[${index}].${field} is required`);
    if (row.status === "accepted" && row.evidence_id) {
      if (byId.has(row.evidence_id)) errors.push(`web_sources[${index}] duplicates ${row.evidence_id}`);
      byId.set(row.evidence_id, row);
    }
  }
  const matchFields = required.filter((field) => field !== "status");
  for (const item of accepted) {
    const row = byId.get(item.evidence_id);
    if (!row) {
      errors.push(`accepted Web evidence ${item.evidence_id} is absent from web_sources.v1`);
      continue;
    }
    if (matchFields.some((field) => !isDeepStrictEqual(row[field], item[field]))) errors.push(`Web evidence ${item.evidence_id} does not match web_sources.v1`);
  }
}

function compareValidity(claimed, computed, errors) {
  if (!claimed || typeof claimed !== "object") {
    errors.push("validity must be an object");
    return;
  }
  if (claimed.schema_version !== computed.schema_version) errors.push("validity schema version mismatch");
  if (claimed.candidate_ranking_allowed === true && computed.candidate_ranking_allowed !== true) errors.push("candidate ranking is not supported by computed validity");
  if (claimed.layer_ranking_allowed === true && computed.layer_ranking_allowed !== true) errors.push("layer ranking is not supported by computed validity");
  if (!isDeepStrictEqual(claimed.layer_ranking, computed.layer_ranking)) errors.push("layer ranking does not match computed validity");
  if (claimed.comparable_candidate_count !== computed.comparable_candidate_count) errors.push("comparable candidate count mismatch");
  if (claimed.status === "accepted" && computed.status !== "accepted") errors.push("claimed validity is more permissive than computed validity");
}

function validateArtifactSafety(value, label, errors) {
  if (value == null) return;
  validatePayloadText(value, label, errors);
  const leaked = [...new Set([...walkKeys(value)].filter((key) => ROUTING_KEY.test(key)))].sort();
  if (leaked.length > 0) errors.push(`${label} leaks routing metadata keys: ${leaked.join(", ")}`);
}

function validatePayloadText(value, label, errors) {
  const text = JSON.stringify(value);
  if (SECRET_TEXT.test(text)) errors.push(`${label} contains credential-like material`);
  if (SIGNED_URL.test(text)) errors.push(`${label} contains a signed or credential-bearing URL`);
}

function* walkKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* walkKeys(item);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      yield key;
      yield* walkKeys(child);
    }
  }
}

function sameSet(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && new Set(actual).size === actual.length
    && expected.every((item) => actual.includes(item));
}

function parseCli(argv) {
  if (argv.length === 0 || argv[0].startsWith("--")) throw new Error("usage: validate_research_artifact.mjs <output.json> [--observed-calls file] [--web-sources file]");
  const result = { output: argv[0], observed: null, web: null };
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`${flag} requires a path`);
    if (flag === "--observed-calls") result.observed = value;
    else if (flag === "--web-sources") result.web = value;
    else throw new Error(`unknown option ${flag}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const paths = parseCli(process.argv.slice(2));
    const load = (path) => path ? JSON.parse(readFileSync(path, "utf8")) : null;
    const result = validateSerenityArtifact(load(paths.output), load(paths.observed), load(paths.web));
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
