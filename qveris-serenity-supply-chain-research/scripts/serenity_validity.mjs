#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const VALIDITY_VERSION = "qveris.serenity-research-validity.v1";

const COVERAGE = new Set(["complete_comparable", "partial_not_ranked", "proxy_only", "insufficient"]);
const SHA256_RE = /^[0-9a-f]{64}$/i;
const IDENTITY_TOOLS = new Set([
  "qveris_finance.ref_symbology",
  "qveris_finance.ref_security_master",
  "qveris_finance.ref_company_profile",
]);
const LAYER_WEIGHTS = {
  constrained_function_criticality: 35,
  scarcity_mechanism_strength: 30,
  substitution_difficulty: 20,
  evidence_quality: 15,
};

export function validateSerenityResearch(input = {}) {
  const violations = [];
  const asOfMs = Date.parse(input.as_of ?? "");
  if (!Number.isFinite(asOfMs)) violations.push(issue("as_of_invalid", "as_of must be an ISO timestamp"));
  const requiredFactors = normalizeFactorNames(input.required_factors, violations);
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const evidenceById = new Map();
  for (const [index, item] of evidence.entries()) {
    if (!item || typeof item !== "object") {
      violations.push(issue("evidence_invalid", `evidence[${index}] must be an object`));
      continue;
    }
    const id = String(item.evidence_id ?? "").trim();
    if (!id || evidenceById.has(id)) {
      violations.push(issue("evidence_id_invalid", `evidence[${index}] id is missing or duplicated`));
      continue;
    }
    const reasons = validateEvidence(item, asOfMs);
    evidenceById.set(id, { ...item, accepted: reasons.length === 0 });
    for (const reason of reasons) violations.push({ ...reason, evidence_id: id });
  }

  const layerDecisions = (Array.isArray(input.layers) ? input.layers : []).map((layer, index) => {
    const gaps = [];
    const id = String(layer?.layer_id ?? `layer-${index}`);
    const refs = validRefs(layer?.evidence_ids, evidenceById, gaps, `${id}.evidence_ids`);
    if (!String(layer?.constrained_function ?? "").trim()) gaps.push(issue("constrained_function_missing", "constrained function is required"));
    const mechanisms = Array.isArray(layer?.scarcity_mechanisms)
      ? layer.scarcity_mechanisms.filter((value) => String(value).trim()) : [];
    if (mechanisms.length === 0) gaps.push(issue("scarcity_mechanism_missing", "at least one scarcity mechanism is required"));
    const owners = new Set(refs.map((ref) => evidenceOwner(evidenceById.get(ref))).filter(Boolean));
    if (owners.size < 2) gaps.push(issue("layer_evidence_not_independent", "layer requires two independent evidence owners"));
    const layerRefSet = new Set(refs);
    const criteria = layer?.criteria && typeof layer.criteria === "object" ? layer.criteria : {};
    let priorityScore = 0;
    for (const [criterion, weight] of Object.entries(LAYER_WEIGHTS)) {
      const record = criteria[criterion];
      if (!record || typeof record !== "object") {
        gaps.push(issue("layer_criterion_missing", `${criterion} is missing`, { criterion }));
        continue;
      }
      const rating = Number(record.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) gaps.push(issue("layer_criterion_rating_invalid", `${criterion} rating must be 0..5`, { criterion }));
      const criterionRefs = validRefs(record.evidence_ids, evidenceById, gaps, `${id}.${criterion}.evidence_ids`);
      if (criterionRefs.some((ref) => !layerRefSet.has(ref))) {
        gaps.push(issue("layer_criterion_ref_outside_layer", `${criterion} references evidence outside the layer evidence set`, { criterion }));
      }
      if (Number.isFinite(rating) && rating >= 0 && rating <= 5 && criterionRefs.length > 0) priorityScore += rating / 5 * weight;
    }
    const exactCriteria = Object.keys(criteria).sort();
    if (JSON.stringify(exactCriteria) !== JSON.stringify(Object.keys(LAYER_WEIGHTS).sort())) gaps.push(issue("layer_criterion_set_mismatch", "layer criteria must use the exact fixed set"));
    return { layer_id: id, status: gaps.length === 0 ? "accepted" : "degraded", evidence_ids: refs, priority_score: Math.round(priorityScore * 100) / 100, gaps };
  });

  const candidateDecisions = (Array.isArray(input.candidates) ? input.candidates : []).map((candidate, index) => {
    const symbol = String(candidate?.symbol ?? `candidate-${index}`).toUpperCase();
    const gaps = [];
    if (!COVERAGE.has(candidate?.coverage_tier)) gaps.push(issue("coverage_tier_invalid", "coverage tier is invalid"));
    if (!String(candidate?.market ?? "").trim()) gaps.push(issue("market_missing", "market is required"));
    if (!validDate(candidate?.window_start) || !validDate(candidate?.window_end)) gaps.push(issue("window_invalid", "common window is required"));
    if (!String(candidate?.fiscal_period ?? "").trim()) gaps.push(issue("fiscal_period_missing", "fiscal period is required"));
    if (!String(candidate?.measurement_basis ?? "").trim()) gaps.push(issue("measurement_basis_missing", "measurement basis is required"));
    if (!String(candidate?.currency_convention ?? "").trim()) gaps.push(issue("currency_convention_missing", "currency convention is required"));
    const identityRefs = validRefs(candidate?.identity_evidence_ids, evidenceById, gaps, `${symbol}.identity_evidence_ids`, symbol);
    if (!identityRefs.some((ref) => {
      const item = evidenceById.get(ref);
      return item?.source_type === "qveris_finance" && IDENTITY_TOOLS.has(item?.tool_name);
    })) gaps.push(issue("identity_cap_evidence_missing", "candidate needs accepted identity CAP evidence"));
    const factors = candidate?.factors && typeof candidate.factors === "object" ? candidate.factors : {};
    for (const factor of requiredFactors) {
      const record = factors[factor];
      if (!record || typeof record !== "object") {
        gaps.push(issue("factor_missing", `${factor} is missing`, { factor }));
        continue;
      }
      const rating = Number(record.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) gaps.push(issue("factor_rating_invalid", `${factor} rating must be 0..5`, { factor }));
      const factorRefs = validRefs(record.evidence_ids, evidenceById, gaps, `${symbol}.${factor}.evidence_ids`, symbol);
      if (!factorRefs.some((ref) => evidenceMatchesComparison(evidenceById.get(ref), candidate))) {
        gaps.push(issue("factor_comparison_basis_unproven", `${factor} lacks evidence aligned to the candidate comparison basis`, { factor }));
      }
    }
    if (!Array.isArray(candidate?.counterevidence_ids) || candidate.counterevidence_ids.length === 0) {
      gaps.push(issue("counterevidence_missing", "counterevidence_ids is required"));
    } else {
      validRefs(candidate.counterevidence_ids, evidenceById, gaps, `${symbol}.counterevidence_ids`, symbol);
    }
    const denominators = Array.isArray(candidate?.denominator_checks) ? candidate.denominator_checks : [];
    if (denominators.length === 0) gaps.push(issue("denominator_checks_missing", "at least one comparable denominator check is required"));
    const denominatorMetrics = [];
    for (const [denominatorIndex, record] of denominators.entries()) {
      const metric = String(record?.metric ?? "").trim();
      if (!metric) gaps.push(issue("denominator_metric_missing", `denominator_checks[${denominatorIndex}].metric is required`));
      else denominatorMetrics.push(metric);
      const value = Number(record?.value);
      if (!Number.isFinite(value) || value <= 0) gaps.push(issue("denominator_nonpositive", `${metric || "denominator"} must be finite and greater than zero`));
      const denominatorRefs = validRefs(record?.evidence_ids, evidenceById, gaps, `${symbol}.denominator_checks[${denominatorIndex}].evidence_ids`, symbol);
      if (!denominatorRefs.some((ref) => evidenceMatchesComparison(evidenceById.get(ref), candidate))) {
        gaps.push(issue("denominator_comparison_basis_unproven", `${metric || "denominator"} lacks aligned comparison evidence`));
      }
    }
    const complete = gaps.length === 0 && candidate.coverage_tier === "complete_comparable";
    return {
      symbol,
      requested_coverage_tier: candidate?.coverage_tier ?? null,
      effective_coverage_tier: complete ? "complete_comparable" : candidate?.coverage_tier === "insufficient" ? "insufficient" : "partial_not_ranked",
      score_allowed: complete,
      gaps,
      comparison: {
        window_start: candidate?.window_start ?? null,
        window_end: candidate?.window_end ?? null,
        fiscal_period: candidate?.fiscal_period ?? null,
        measurement_basis: candidate?.measurement_basis ?? null,
        currency_convention: candidate?.currency_convention ?? null,
        factor_set: Object.keys(factors).sort(),
        denominator_metric_set: [...new Set(denominatorMetrics)].sort(),
      },
    };
  });

  const complete = candidateDecisions.filter((row) => row.score_allowed);
  const comparisonKeys = complete.map((row) => JSON.stringify(row.comparison));
  const commonComparison = comparisonKeys.length > 0 && new Set(comparisonKeys).size === 1;
  const candidateRankingAllowed = complete.length >= 3 && commonComparison && requiredFactors.length > 0;
  if (complete.length > 0 && !commonComparison) violations.push(issue("comparison_basis_mismatch", "complete candidates do not share one comparison basis"));
  if (input.publish_candidate_ranking === true && !candidateRankingAllowed) {
    violations.push(issue("ranking_unsupported", "candidate ranking requires at least three fully comparable candidates"));
  }
  const acceptedLayers = layerDecisions.filter((row) => row.status === "accepted");
  const layerRankingAllowed = acceptedLayers.length >= 2;
  const layerRanking = [...acceptedLayers]
    .sort((left, right) => right.priority_score - left.priority_score || left.layer_id.localeCompare(right.layer_id))
    .map((row, index) => ({ rank: index + 1, layer_id: row.layer_id, priority_score: row.priority_score }));
  if (input.publish_layer_ranking === true && !layerRankingAllowed) {
    violations.push(issue("layer_ranking_unsupported", "layer ranking requires at least two independently supported layers"));
  }
  const hardFailure = violations.some((row) => [
    "as_of_invalid", "ranking_unsupported", "layer_ranking_unsupported", "comparison_basis_mismatch",
  ].includes(row.code));
  const localDegradation = layerDecisions.some((row) => row.status !== "accepted")
    || candidateDecisions.some((row) => row.score_allowed !== true);
  return {
    schema_version: VALIDITY_VERSION,
    status: hardFailure ? "rejected" : violations.length > 0 || localDegradation ? "degraded" : "accepted",
    layer_ranking_allowed: layerRankingAllowed,
    layer_ranking: layerRankingAllowed ? layerRanking : [],
    candidate_ranking_allowed: candidateRankingAllowed,
    comparable_candidate_count: complete.length,
    required_factors: requiredFactors,
    layer_decisions: layerDecisions,
    candidate_decisions: candidateDecisions,
    violations,
  };
}

function validateEvidence(item, asOfMs) {
  const result = [];
  if (item.status !== "accepted") result.push(issue("evidence_not_accepted", "evidence status must be accepted"));
  if (!String(item.entity_or_topic ?? "").trim()) result.push(issue("evidence_scope_missing", "entity_or_topic is required"));
  if (!String(item.evidence_owner ?? "").trim()) result.push(issue("evidence_owner_missing", "evidence_owner is required"));
  const timestamp = item.as_of ?? item.published_at ?? item.observed_at;
  const time = Date.parse(timestamp ?? "");
  if (!Number.isFinite(time)) result.push(issue("evidence_date_missing", "evidence needs a valid date"));
  else if (Number.isFinite(asOfMs) && time > asOfMs) result.push(issue("semantic_future_data", "evidence is after as_of"));
  if (item.source_type === "qveris_finance") {
    if (!/^qveris_finance\.[a-z0-9_]+$/.test(String(item.tool_name ?? ""))) result.push(issue("tool_name_invalid", "CAP evidence needs qveris_finance.* tool_name"));
    if (!String(item.symbol ?? "").trim()) result.push(issue("semantic_entity_missing", "CAP evidence needs symbol proof"));
  } else if (item.source_type === "web") {
    if (!String(item.final_url ?? "").startsWith("https://")) result.push(issue("web_url_invalid", "Web evidence needs final HTTPS URL"));
    if (!String(item.query ?? "").trim()) result.push(issue("web_query_missing", "Web evidence needs the discovery query"));
    if (!String(item.title ?? "").trim()) result.push(issue("web_title_missing", "Web evidence needs a title"));
    if (!String(item.publisher_owner ?? "").trim()) result.push(issue("publisher_owner_missing", "Web evidence needs publisher owner"));
    if (String(item.evidence_owner ?? "").trim() !== String(item.publisher_owner ?? "").trim()) result.push(issue("web_owner_mismatch", "Web evidence_owner must equal publisher_owner"));
    if (!String(item.independence_result ?? "").trim()) result.push(issue("independence_result_missing", "Web evidence needs an independence result"));
    if (!Number.isFinite(Date.parse(item.accessed_at ?? ""))) result.push(issue("web_access_time_missing", "Web evidence needs a valid accessed_at"));
    if (!SHA256_RE.test(String(item.body_sha256 ?? ""))) result.push(issue("body_hash_invalid", "Web evidence needs body SHA-256"));
    if (item.issuer_or_topic_match !== true || item.window_match !== true) result.push(issue("web_relevance_rejected", "Web evidence must match topic and window"));
  } else {
    result.push(issue("source_type_invalid", "source_type must be qveris_finance or web"));
  }
  return result;
}

function validRefs(values, evidenceById, gaps, label, expectedSymbol) {
  if (!Array.isArray(values) || values.length === 0) {
    gaps.push(issue("evidence_refs_missing", `${label} must be non-empty`));
    return [];
  }
  const accepted = [];
  for (const raw of values) {
    const id = String(raw);
    const evidence = evidenceById.get(id);
    if (!evidence || !evidence.accepted) {
      gaps.push(issue("evidence_ref_rejected", `${label} references missing/rejected ${id}`));
      continue;
    }
    if (expectedSymbol && evidence.symbol && normalizeSymbol(evidence.symbol) !== normalizeSymbol(expectedSymbol)) {
      gaps.push(issue("semantic_entity_mismatch", `${label} references another security`));
      continue;
    }
    accepted.push(id);
  }
  return [...new Set(accepted)];
}

function evidenceOwner(item) {
  return String(item?.evidence_owner ?? "").trim() || null;
}

function evidenceMatchesComparison(item, candidate) {
  if (!item) return false;
  return String(item.window_start ?? "") === String(candidate?.window_start ?? "")
    && String(item.window_end ?? "") === String(candidate?.window_end ?? "")
    && String(item.fiscal_period ?? "") === String(candidate?.fiscal_period ?? "")
    && String(item.measurement_basis ?? "") === String(candidate?.measurement_basis ?? "")
    && String(item.currency_convention ?? "") === String(candidate?.currency_convention ?? "");
}

function normalizeFactorNames(value, violations) {
  if (!Array.isArray(value) || value.length === 0) {
    violations.push(issue("required_factors_missing", "required_factors must be non-empty"));
    return [];
  }
  const names = value.map((item) => String(item).trim()).filter(Boolean);
  if (new Set(names).size !== names.length) violations.push(issue("required_factors_duplicate", "required_factors must be unique"));
  return [...new Set(names)];
}

function validDate(value) {
  return Number.isFinite(Date.parse(String(value ?? "")));
}

function normalizeSymbol(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\.SS$/, ".SH");
}

function issue(code, message, extra = {}) {
  return { code, message, ...extra };
}

function parseCli(argv) {
  const index = argv.indexOf("--input-json");
  if (index < 0 || index + 1 >= argv.length) throw new Error("usage: serenity_validity.mjs --input-json '<json>'");
  return JSON.parse(argv[index + 1]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(validateSerenityResearch(parseCli(process.argv.slice(2))), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
