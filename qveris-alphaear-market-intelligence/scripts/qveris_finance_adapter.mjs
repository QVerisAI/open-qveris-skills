import { createHash } from "node:crypto";

import { sanitizeProviderRouteMetadata } from "./qveris_sanitize.mjs";

export const ADAPTATION_SCHEMA_VERSION = "qveris.finance-parameter-adaptation.v1";
export const CAPABILITY_FALLBACK_SCHEMA_VERSION = "qveris.finance-capability-fallback.v1";

const MAX_ATTEMPTS = 3;
const SEMANTIC_PARAMETER_NAMES = new Set([
  "symbol", "ticker", "underlying", "underlying_symbol", "parent_symbol", "query",
  "market", "country", "exchange", "date", "start_date", "end_date", "as_of_date",
  "period", "fiscal_year", "fiscal_quarter", "interval", "adjustment", "adjusted",
  "mode", "direction", "channel", "sector", "industry",
]);
const FIELD_ALIAS_GROUPS = [
  ["symbol", "ticker", "code", "security_code"],
  ["date", "trade_date", "datetime", "timestamp"],
  ["pe", "pe_ttm", "pe_ratio", "trailing_pe"],
  ["pb", "pb_ratio", "price_to_book"],
  ["theme", "theme_name", "concept", "concept_name"],
];

export async function resolveFinanceCapability({
  capability,
  transport,
  timeoutMs = 30_000,
}) {
  requireTransport(transport, ["listCapabilities", "getCapability"]);
  const raw = String(capability ?? "").trim();
  if (!raw) throw adapterError("capability_required", "Finance capability is required.");
  const wanted = normalizeCapabilityName(raw);
  const registry = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await transport.listCapabilities({ domain: "finance", page, pageSize: 100, timeoutMs });
    const items = capabilityItems(response);
    registry.push(...items);
    const rawTotal = response?.total ?? response?.count;
    const total = Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : null;
    if (items.length === 0 || (total !== null ? registry.length >= total : items.length < 100)) break;
  }
  const matches = registry.filter((item) => normalizeCapabilityName(item?.capability_id) === wanted);
  if (matches.length === 0) {
    throw adapterError("capability_unavailable", `Capability '${raw}' is not present in the live finance registry.`);
  }
  const distinctIds = [...new Set(matches.map((item) => String(item.capability_id).trim().toUpperCase()))];
  if (distinctIds.length !== 1) {
    throw adapterError("capability_ambiguous", `Capability '${raw}' matches multiple live finance capabilities.`);
  }
  const capabilityId = distinctIds[0];
  const detail = await transport.getCapability({ capabilityId, timeoutMs });
  return {
    capability_id: capabilityId,
    canonical_name: canonicalFinanceName(capabilityId),
    detail,
    detail_hash: sha256(stableCapabilityDetail(detail)),
  };
}

export function adaptFinanceParameters({ detail, parameters = {}, context = {} }) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw adapterError("invalid_parameters", "Finance parameters must be a JSON object.");
  }
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw adapterError("invalid_context", "Finance adaptation context must be a JSON object.");
  }
  const definitions = parameterDefinitions(detail);
  const definitionByName = new Map(definitions.map((definition) => [definition.name, definition]));
  const derivableRequired = new Set(definitions.filter((definition) => definition.required === true).map((definition) => definition.name));
  for (const group of oneOfRequired(detail)) for (const name of group) derivableRequired.add(name);
  const output = {};
  const dropped = [];
  const conversionErrors = [];

  for (const [name, value] of Object.entries(parameters)) {
    if (name === "capability_id" || !definitionByName.has(name)) {
      dropped.push(name);
      continue;
    }
    const converted = convertLosslessly(value, definitionByName.get(name));
    if (converted.ok) output[name] = converted.value;
    else conversionErrors.push({ name, reason: converted.reason });
  }

  for (const definition of definitions) {
    if (output[definition.name] !== undefined) continue;
    if (!derivableRequired.has(definition.name)) continue;
    const derived = explicitOrEquivalentValue(definition.name, parameters, context);
    if (derived === undefined) continue;
    const converted = convertLosslessly(derived, definition);
    if (converted.ok) output[definition.name] = converted.value;
    else conversionErrors.push({ name: definition.name, reason: converted.reason });
  }

  const missingRequired = definitions
    .filter((definition) => definition.required === true && output[definition.name] === undefined)
    .map((definition) => definition.name);
  for (const group of oneOfRequired(detail)) {
    if (!group.some((name) => output[name] !== undefined)) {
      missingRequired.push(`one_of:${group.join("|")}`);
    }
  }
  return {
    parameters: output,
    dropped_parameters: dropped,
    conversion_errors: conversionErrors,
    missing_required: [...new Set(missingRequired)],
  };
}

export async function executeFinanceCapability({
  capability,
  parameters = {},
  context = {},
  transport,
  strategy = "best",
  searchId,
  timeoutMs = 60_000,
}) {
  requireTransport(transport, ["listCapabilities", "getCapability", "queryCapability"]);
  let resolved;
  try {
    resolved = await resolveFinanceCapability({ capability, transport, timeoutMs: Math.min(timeoutMs, 30_000) });
  } catch (error) {
    return sanitizeProviderRouteMetadata({
      success: false,
      error: error?.message ?? String(error),
      reason_code: error?.code ?? "capability_resolution_failed",
      adaptation: emptyAudit(capability, error?.code ?? "capability_resolution_failed"),
      observed_calls: [],
      qveris_trace: [],
      final_params: null,
    });
  }

  const adapted = adaptFinanceParameters({ detail: resolved.detail, parameters, context });
  const audit = {
    schema_version: ADAPTATION_SCHEMA_VERSION,
    canonical_name: resolved.canonical_name,
    capability_id: resolved.capability_id,
    detail_hash: resolved.detail_hash,
    dropped_parameters: adapted.dropped_parameters,
    conversion_errors: adapted.conversion_errors,
    attempts: [],
    selected_attempt: null,
    final_status: "not_started",
    rejection_reason: null,
  };
  if (adapted.missing_required.length > 0 || adapted.conversion_errors.length > 0) {
    audit.final_status = "rejected";
    audit.rejection_reason = adapted.missing_required.length > 0
      ? `missing required parameters: ${adapted.missing_required.join(", ")}`
      : "one or more parameters could not be converted losslessly";
    return sanitizeProviderRouteMetadata({
      success: false,
      reason_code: adapted.missing_required.length > 0 ? "missing_required_parameters" : "parameter_type_mismatch",
      error: audit.rejection_reason,
      canonical_name: resolved.canonical_name,
      capability_id: resolved.capability_id,
      adaptation: audit,
      resolution: resolutionAudit(capability, resolved),
      observed_calls: [],
      qveris_trace: [],
      final_params: null,
    });
  }

  const candidates = [adapted.parameters];
  const minimal = minimalParameters(resolved.detail, adapted.parameters);
  if (!sameJson(minimal, adapted.parameters)) candidates.push(minimal);
  for (const equivalent of equivalentSymbolParameters(adapted.parameters)) candidates.push(equivalent);

  let selectedResponse = null;
  let selectedIndex = null;
  let lastResponse = null;
  let lastParameters = null;
  let stop = false;
  const observedCalls = [];
  for (let candidateIndex = 0; candidateIndex < candidates.length && audit.attempts.length < MAX_ATTEMPTS && !stop; candidateIndex += 1) {
    let candidate = candidates[candidateIndex];
    if (!candidate || audit.attempts.some((attempt) => sameJson(attempt.parameters, candidate))) continue;
    if (lastResponse) {
      const guided = errorGuidedParameters({
        detail: resolved.detail,
        parameters: lastParameters,
        response: lastResponse,
        context,
      });
      if (guided && !audit.attempts.some((attempt) => sameJson(attempt.parameters, guided))) {
        candidate = guided;
        candidates.splice(candidateIndex + 1, 0, ...equivalentSymbolParameters(guided));
      }
    }
    let response;
    try {
      response = await transport.queryCapability({
        capabilityId: resolved.capability_id,
        parameters: candidate,
        strategy,
        searchId,
        timeoutMs,
      });
      response = await hydrateFullContentResponse({ response, transport, timeoutMs });
    } catch (error) {
      response = {
        success: false,
        error_message: error?.name === "AbortError" ? "timeout" : (error?.message ?? String(error)),
        execution_outcome: { reason_code: error?.name === "AbortError" ? "timeout" : "transport_error" },
      };
    }
    const assessment = assessResult({
      detail: resolved.detail,
      capabilityId: resolved.capability_id,
      parameters: candidate,
      context,
      response,
    });
    const attemptNumber = audit.attempts.length + 1;
    const observedAt = new Date().toISOString();
    const cleanAttemptResponse = sanitizeProviderRouteMetadata(response);
    const attemptRecord = {
      attempt: attemptNumber,
      parameters: candidate,
      parameters_hash: sha256(candidate),
      execution_id: executionId(response),
      success: assessment.ready,
      envelope_success: response?.success === true,
      contract_clean: assessment.ready && response?.success === true,
      result_status: assessment.ready ? "accepted" : "rejected",
      reason_code: assessment.reason_code,
      rejection_reason: assessment.ready ? null : assessment.rejection_reason,
      observed_at: observedAt,
      response_hash: sha256(cleanAttemptResponse),
    };
    audit.attempts.push(attemptRecord);
    observedCalls.push({
      tool_name: resolved.canonical_name,
      request_kind: "capabilities/query",
      capability_id: resolved.capability_id,
      params: candidate,
      status: assessment.ready ? "success" : "failed",
      execution_id: attemptRecord.execution_id,
      fallback_used: attemptNumber > 1,
      missing_fields: assessment.ready ? [] : [assessment.reason_code],
      observed_at: observedAt,
      response_sha256: attemptRecord.response_hash,
      response: cleanAttemptResponse,
    });
    lastResponse = response;
    lastParameters = candidate;
    selectedResponse = response;
    selectedIndex = audit.attempts.length;
    if (!assessment.ready && !assessment.semantic_failure && candidateIndex + 1 >= candidates.length) {
      const guided = errorGuidedParameters({
        detail: resolved.detail,
        parameters: candidate,
        response,
        context,
      });
      if (guided && !audit.attempts.some((attempt) => sameJson(attempt.parameters, guided))) {
        candidates.push(guided, ...equivalentSymbolParameters(guided));
      }
    }
    if (assessment.ready) {
      stop = true;
    } else if (assessment.semantic_failure) {
      stop = true;
    } else if (!hasParameterClue(response) && equivalentSymbolParameters(candidate).length === 0 && sameJson(minimal, candidate)) {
      stop = true;
    }
  }

  const acceptedIndex = audit.attempts.findIndex((attempt) => attempt.success);
  audit.selected_attempt = acceptedIndex >= 0 ? acceptedIndex + 1 : selectedIndex;
  audit.final_status = acceptedIndex >= 0 ? "accepted" : "rejected";
  audit.rejection_reason = acceptedIndex >= 0 ? null : audit.attempts.at(-1)?.rejection_reason ?? "no valid result";
  const cleanResponse = sanitizeProviderRouteMetadata(selectedResponse ?? { success: false });
  const selectedAttempt = audit.selected_attempt ? audit.attempts[audit.selected_attempt - 1] : null;
  return sanitizeProviderRouteMetadata({
    ...cleanResponse,
    success: acceptedIndex >= 0,
    canonical_name: resolved.canonical_name,
    capability_id: resolved.capability_id,
    ...(acceptedIndex >= 0 ? {} : { reason_code: audit.attempts.at(-1)?.reason_code ?? "capability_query_failed" }),
    adaptation: audit,
    resolution: resolutionAudit(capability, resolved),
    parameter_audit: {
      dropped_parameters: adapted.dropped_parameters,
      conversion_errors: adapted.conversion_errors,
    },
    final_params: selectedAttempt?.parameters ?? null,
    observed_calls: observedCalls,
    qveris_trace: observedCalls.map(({ tool_name, params, status, execution_id, fallback_used, missing_fields }) => ({
      tool_name,
      params,
      status,
      execution_id,
      fallback_used,
      missing_fields,
    })),
  });
}

export async function executeFinanceCapabilityChain({
  requests,
  transport,
  strategy = "best",
  searchId,
  timeoutMs = 60_000,
  maxCapabilities = 3,
}) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw adapterError("fallback_chain_required", "Finance fallback chain requires at least one explicit CAP request.");
  }
  const limit = Math.min(MAX_ATTEMPTS, Number(maxCapabilities));
  if (!Number.isInteger(limit) || limit < 1 || requests.length > limit) {
    throw adapterError("fallback_chain_limit", `Finance fallback chain may contain at most ${MAX_ATTEMPTS} CAP requests.`);
  }
  const evidenceStatuses = new Set(["complete", "partial", "proxy_only"]);
  const normalized = requests.map((request, index) => {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      throw adapterError("invalid_fallback_request", `Fallback request ${index + 1} must be an object.`);
    }
    const capability = String(request.capability ?? "").trim();
    if (!/^qveris_finance\.[a-z0-9_]+$/i.test(capability)) {
      throw adapterError("invalid_fallback_capability", `Fallback request ${index + 1} must use qveris_finance.*.`);
    }
    const evidenceStatus = request.evidence_status ?? (index === 0 ? "complete" : "partial");
    if (!evidenceStatuses.has(evidenceStatus)) {
      throw adapterError("invalid_fallback_evidence_status", `Fallback request ${index + 1} has an invalid evidence_status.`);
    }
    return {
      capability,
      parameters: request.parameters ?? {},
      context: request.context ?? {},
      evidence_status: evidenceStatus,
      degradation_reason: request.degradation_reason ?? null,
      allow_after_semantic_failure: request.allow_after_semantic_failure === true,
    };
  });
  const distinct = new Set(normalized.map((request) => normalizeCapabilityName(request.capability)));
  if (distinct.size !== normalized.length) {
    throw adapterError("duplicate_fallback_capability", "Finance fallback chain cannot repeat a capability.");
  }

  const attempts = [];
  const observedCalls = [];
  let selectedResult = null;
  let selectedIndex = null;
  let lastResult = null;
  for (let index = 0; index < normalized.length; index += 1) {
    const request = normalized[index];
    const result = await executeFinanceCapability({
      capability: request.capability,
      parameters: request.parameters,
      context: request.context,
      transport,
      strategy,
      searchId,
      timeoutMs,
    });
    lastResult = result;
    const calls = Array.isArray(result.observed_calls) ? result.observed_calls : [];
    for (const call of calls) observedCalls.push({ ...call, fallback_used: index > 0 || call.fallback_used === true });
    attempts.push({
      capability_index: index + 1,
      requested_capability: request.capability,
      canonical_name: result.canonical_name ?? null,
      capability_id: result.capability_id ?? null,
      evidence_status: request.evidence_status,
      degradation_reason: request.degradation_reason,
      success: result.success === true,
      reason_code: result.reason_code ?? result.adaptation?.attempts?.at(-1)?.reason_code ?? null,
      execution_ids: calls.map((call) => call.execution_id).filter(Boolean),
      response_hash: sha256(result),
    });
    if (result.success === true) {
      selectedResult = result;
      selectedIndex = index;
      break;
    }
    if (semanticReason(result) && !request.allow_after_semantic_failure) break;
  }

  const selectedRequest = selectedIndex === null ? null : normalized[selectedIndex];
  const fallbackAudit = {
    schema_version: CAPABILITY_FALLBACK_SCHEMA_VERSION,
    requested_capability: normalized[0].capability,
    selected_capability: selectedResult?.canonical_name ?? null,
    selected_capability_index: selectedIndex === null ? null : selectedIndex + 1,
    evidence_status: selectedRequest?.evidence_status ?? "insufficient",
    degradation_reason: selectedRequest?.degradation_reason ?? null,
    attempts,
    final_status: selectedResult ? "accepted" : "rejected",
  };
  const base = selectedResult ?? lastResult ?? { success: false, reason_code: "fallback_chain_failed" };
  return sanitizeProviderRouteMetadata({
    ...base,
    success: selectedResult !== null,
    ...(selectedResult ? {} : { reason_code: base.reason_code ?? "fallback_chain_failed" }),
    evidence_status: fallbackAudit.evidence_status,
    fallback_audit: fallbackAudit,
    observed_calls: observedCalls,
    qveris_trace: observedCalls.map(({ tool_name, params, status, execution_id, fallback_used, missing_fields }) => ({
      tool_name,
      params,
      status,
      execution_id,
      fallback_used,
      missing_fields,
    })),
  });
}

export function symbolsEquivalent(left, right) {
  const a = normalizeSymbol(left);
  const b = normalizeSymbol(right);
  if (a === b) return true;
  const aMatch = a.match(/^(\d{6})(?:\.(SH|SZ))?$/);
  const bMatch = b.match(/^(\d{6})(?:\.(SH|SZ))?$/);
  if (!aMatch || !bMatch || aMatch[1] !== bMatch[1]) return false;
  return !aMatch[2] || !bMatch[2] || aMatch[2] === bMatch[2];
}

function normalizeCapabilityName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^qveris[._-]?finance[._-]?/, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalFinanceName(capabilityId) {
  return `qveris_finance.${String(capabilityId).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function capabilityItems(response) {
  if (Array.isArray(response)) return response;
  for (const key of ["results", "capabilities", "items", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
}

function parameterDefinitions(detail) {
  return (Array.isArray(detail?.params) ? detail.params : [])
    .filter((definition) => definition && typeof definition.name === "string" && definition.name.length > 0);
}

function oneOfRequired(detail) {
  return (Array.isArray(detail?.one_of_required) ? detail.one_of_required : [])
    .filter((group) => Array.isArray(group) && group.every((name) => typeof name === "string"));
}

function explicitOrEquivalentValue(name, parameters, context) {
  if (context[name] !== undefined) return context[name];
  if (context.parameters?.[name] !== undefined) return context.parameters[name];
  const equivalents = {
    symbol: ["ticker", "security_code", "underlying", "underlying_symbol"],
    ticker: ["symbol", "security_code"],
    date: ["as_of_date"],
    end_date: ["as_of_date"],
  };
  for (const candidate of equivalents[name] ?? []) {
    if (parameters[candidate] !== undefined) return parameters[candidate];
    if (context[candidate] !== undefined) return context[candidate];
    if (context.parameters?.[candidate] !== undefined) return context.parameters[candidate];
  }
  if (name === "market") {
    const symbol = parameters.symbol ?? parameters.ticker ?? context.symbol ?? context.ticker;
    if (typeof symbol === "string" && /\.(SH|SS|SZ)$/i.test(symbol)) return "CN";
  }
  return undefined;
}

function convertLosslessly(value, definition) {
  const type = String(definition?.type ?? "").toLowerCase();
  if (value === null || value === undefined) return { ok: false, reason: "null_or_undefined" };
  if (["string", "date", "datetime"].includes(type)) {
    if (["string", "number", "boolean"].includes(typeof value)) return { ok: true, value: String(value) };
    return { ok: false, reason: `cannot convert ${typeof value} to ${type}` };
  }
  if (type === "integer") {
    if (Number.isInteger(value)) return { ok: true, value };
    if (typeof value === "string" && /^[-+]?\d+$/.test(value.trim())) return { ok: true, value: Number(value) };
    return { ok: false, reason: "not an exact integer" };
  }
  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return { ok: true, value };
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return { ok: true, value: Number(value) };
    return { ok: false, reason: "not a finite number" };
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return { ok: true, value };
    if (value === "true" || value === "false") return { ok: true, value: value === "true" };
    return { ok: false, reason: "not a lossless boolean" };
  }
  if (type === "array") return Array.isArray(value) ? { ok: true, value } : { ok: false, reason: "not an array" };
  if (type === "object") return value && typeof value === "object" && !Array.isArray(value)
    ? { ok: true, value }
    : { ok: false, reason: "not an object" };
  return { ok: true, value };
}

function minimalParameters(detail, parameters) {
  const required = new Set(parameterDefinitions(detail).filter((definition) => definition.required === true).map((definition) => definition.name));
  for (const group of oneOfRequired(detail)) {
    const present = group.find((name) => parameters[name] !== undefined);
    if (present) required.add(present);
  }
  const output = {};
  for (const [name, value] of Object.entries(parameters)) {
    if (required.has(name) || SEMANTIC_PARAMETER_NAMES.has(name)) output[name] = value;
  }
  return output;
}

function errorGuidedParameters({ detail, parameters, response, context }) {
  const text = errorText(response);
  const definitions = new Map(parameterDefinitions(detail).map((definition) => [definition.name, definition]));
  const missing = text.match(/missing_required_tool_input\s*[:=]\s*([a-zA-Z0-9_]+)/i)?.[1]
    ?? text.match(/missing required(?: tool)? (?:input|parameter)\s*[:=]?\s*["']?([a-zA-Z0-9_]+)/i)?.[1];
  if (
    String(detail?.capability_id ?? "").toUpperCase() === "FLOW.DRAGON_TIGER"
    && String(missing ?? "").toLowerCase() === "edate"
    && definitions.has("date")
    && parameters.date === undefined
    && parameters.end_date !== undefined
  ) {
    const converted = convertLosslessly(parameters.end_date, definitions.get("date"));
    if (converted.ok) return { ...parameters, date: converted.value };
  }
  if (missing && definitions.has(missing) && parameters[missing] === undefined) {
    const value = explicitOrEquivalentValue(missing, parameters, context)
      ?? safeMissingValue(missing, definitions.get(missing), parameters);
    if (value !== undefined) {
      const converted = convertLosslessly(value, definitions.get(missing));
      if (converted.ok) return { ...parameters, [missing]: converted.value };
    }
  }
  const enumMatch = text.match(/(?:invalid|unsupported)\s+([a-zA-Z0-9_]+).*?(?:must\s+be\s+one\s+of|one\s+of|allowed(?:\s+values)?)[^a-zA-Z0-9]+([^\n;]+)/i);
  if (enumMatch && definitions.has(enumMatch[1])) {
    const name = enumMatch[1];
    const choices = enumChoices(definitions.get(name), enumMatch[2]);
    const requested = context[name] ?? context.parameters?.[name] ?? parameters[name];
    const equivalent = choices.find((choice) => String(choice).toLowerCase() === String(requested).toLowerCase());
    if (equivalent !== undefined && equivalent !== parameters[name]) return { ...parameters, [name]: equivalent };
    const semantic = safeEnumRepair(name, choices, parameters, context);
    if (semantic !== undefined && semantic !== parameters[name]) return { ...parameters, [name]: semantic };
    if (choices.length === 1 && choices[0] !== parameters[name]) return { ...parameters, [name]: choices[0] };
  }
  return null;
}

function safeMissingValue(name, definition, parameters) {
  const choices = enumChoices(definition);
  if (name === "granularity" && parameters.date !== undefined) {
    return choices.find((choice) => String(choice).toLowerCase() === "daily");
  }
  return undefined;
}

function safeEnumRepair(name, choices, parameters, context) {
  if (name !== "period") return undefined;
  if (!isExplicitAshareRequest(parameters, context)) return undefined;
  const normalized = new Map(choices.map((choice) => [String(choice).toUpperCase(), choice]));
  const quarterEndChoices = new Set(choices.flatMap((choice) => String(choice).match(/\b(?:0331|0630|0930|1231)\b/g) ?? []));
  const periodCode = String(context.fiscal_period ?? context.parameters?.fiscal_period ?? "").toUpperCase();
  const requested = String(context.period ?? context.parameters?.period ?? parameters.period ?? "").toLowerCase();
  const fiscalMap = { Q1: "0331", Q2: "0630", Q3: "0930", Q4: "1231", FY: "1231" };
  const target = fiscalMap[periodCode] ?? (requested === "annual" ? "1231" : undefined);
  if (!target) return undefined;
  if (quarterEndChoices.has(target)) return target;
  return normalized.get(target);
}

function isExplicitAshareRequest(parameters, context) {
  const market = parameters.market ?? context.market ?? context.parameters?.market;
  if (market !== undefined && marketEquivalent(market, "CN")) return true;
  const symbol = parameters.symbol ?? parameters.ticker ?? context.symbol ?? context.ticker;
  return typeof symbol === "string" && /^\d{6}\.(?:SH|SS|SZ)$/i.test(symbol.trim());
}

function enumChoices(definition, hinted) {
  const schema = definition?.enum ?? definition?.allowed_values ?? definition?.values ?? definition?.options;
  if (Array.isArray(schema) && schema.length > 0) return schema;
  return String(hinted ?? "")
    .replace(/[\[\]"']/g, "")
    .split(/[,，|]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function equivalentSymbolParameters(parameters) {
  const key = ["symbol", "ticker", "underlying", "underlying_symbol", "parent_symbol"]
    .find((name) => typeof parameters[name] === "string");
  if (!key) return [];
  const variants = equivalentSymbolVariants(parameters[key]);
  return variants.map((symbol) => ({ ...parameters, [key]: symbol }));
}

function equivalentSymbolVariants(value) {
  const symbol = String(value).trim().toUpperCase();
  let match = symbol.match(/^(\d{6})\.(SH|SS|SZ)$/);
  if (match) {
    const [code, exchange] = [match[1], match[2]];
    if (exchange === "SH") return [`${code}.SS`, code];
    if (exchange === "SS") return [`${code}.SH`, code];
    return [code];
  }
  match = symbol.match(/^(\d{6})$/);
  if (!match) return [];
  const code = match[1];
  if (/^[569]/.test(code)) return [`${code}.SH`, `${code}.SS`];
  if (/^[023]/.test(code)) return [`${code}.SZ`];
  return [];
}

function assessResult({ detail, capabilityId, parameters, context, response }) {
  const data = responseData(response);
  const statusCode = Number(response?.status_code ?? response?.result?.status_code);
  if (Number.isFinite(statusCode) && statusCode >= 400) {
    return {
      ready: false,
      semantic_failure: false,
      reason_code: response?.execution_outcome?.reason_code ?? response?.result?.error_type ?? "provider_business_error",
      rejection_reason: errorText(response).slice(0, 400) || `provider returned HTTP ${statusCode}`,
    };
  }
  if (!executionId(response)) return rejection("missing_execution_id", "response has no execution ID");
  if (!usable(data)) {
    return rejection(
      response?.execution_outcome?.reason_code ?? response?.result?.error_type ?? "empty_result",
      errorText(response).slice(0, 400) || "response has no usable data",
    );
  }
  const missingFields = missingRequiredOutputFields(detail, data);
  if (missingFields.length > 0) return rejection("missing_required_output_fields", `missing required output fields: ${missingFields.join(", ")}`);
  const semantics = semanticAssessment({ capabilityId, parameters, context, data });
  if (!semantics.ok) return { ready: false, semantic_failure: true, reason_code: semantics.reason_code, rejection_reason: semantics.reason };
  return {
    ready: true,
    semantic_failure: false,
    reason_code: response?.success === true ? "accepted" : "accepted_data_first",
    rejection_reason: null,
  };
}

function rejection(reasonCode, reason) {
  return { ready: false, semantic_failure: false, reason_code: reasonCode, rejection_reason: reason };
}

function semanticAssessment({ capabilityId, parameters, context, data }) {
  const expectedSymbol = context.symbol ?? context.expected_symbol ?? parameters.symbol ?? parameters.ticker;
  const returnedSymbols = collectValues(data, new Set(["symbol", "ticker", "code", "security_code"]))
    .filter((value) => typeof value === "string" || typeof value === "number")
    .map(String);
  const expectedNames = [context.expected_name, context.company_name, context.issuer_name]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalizeIdentity);
  const returnedNames = collectValues(data, new Set(["name", "company_name", "issuer_name", "security_name"]))
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalizeIdentity);
  const expectedMarket = String(context.market ?? context.expected_market ?? parameters.market ?? "").toUpperCase();
  if (expectedMarket) {
    const markets = collectValues(data, new Set(["market", "market_code", "country"])).map((value) => String(value).toUpperCase());
    if (markets.length > 0 && markets.every((value) => !marketEquivalent(value, expectedMarket))) {
      return { ok: false, reason_code: "semantic_market_mismatch", reason: `returned market does not match ${expectedMarket}` };
    }
    if (expectedMarket === "CN" && capabilityId === "MKT.TOP_MOVERS" && returnedSymbols.length > 0 && returnedSymbols.every((value) => !isAShareSymbol(value))) {
      return { ok: false, reason_code: "semantic_market_mismatch", reason: "CN request returned no A-share symbols" };
    }
  }
  if (expectedSymbol) {
    if (returnedSymbols.length > 0 && !returnedSymbols.some((value) => symbolsEquivalent(value, expectedSymbol))) {
      return { ok: false, reason_code: "semantic_entity_mismatch", reason: `returned entity does not match ${expectedSymbol}` };
    }
    if (returnedSymbols.length === 0 && !expectedNames.some((expected) => returnedNames.includes(expected))) {
      return { ok: false, reason_code: "semantic_entity_missing", reason: `returned data contains no verifiable identity for ${expectedSymbol}` };
    }
  }
  if (capabilityId === "FLOW.SECTOR.CAPITAL" && parameters.sector !== undefined) {
    const expectedSector = normalizeIdentity(parameters.sector);
    const returnedSectors = collectValues(data, new Set(["sector", "sector_name", "industry", "industry_name", "theme", "theme_name", "concept", "concept_name", "name"]))
      .filter((value) => typeof value === "string")
      .map(normalizeIdentity)
      .filter(Boolean);
    if (returnedSectors.length > 0 && !returnedSectors.some((value) => value === expectedSector)) {
      return { ok: false, reason_code: "semantic_entity_mismatch", reason: `returned sector does not match ${parameters.sector}` };
    }
  }
  const expectedPeriod = context.period ?? context.expected_period ?? parameters.period;
  const periods = collectValues(data, new Set(["period", "fiscal_period", "fiscal_year", "reporting_period"]));
  if (expectedPeriod !== undefined && periods.length > 0 && periods.every((value) => !periodEquivalent(value, expectedPeriod))) {
    return { ok: false, reason_code: "semantic_period_mismatch", reason: `returned period does not match ${expectedPeriod}` };
  }
  const expectedFiscalYear = context.fiscal_year ?? context.expected_fiscal_year ?? parameters.fiscal_year;
  if (expectedFiscalYear !== undefined && periods.length > 0 && periods.every((value) => !String(value).includes(String(expectedFiscalYear)))) {
    return { ok: false, reason_code: "semantic_period_mismatch", reason: `returned fiscal period does not contain ${expectedFiscalYear}` };
  }
  const expectedBasis = context.statement_basis ?? context.period_basis ?? parameters.statement_basis ?? parameters.period_basis;
  if (expectedBasis !== undefined) {
    const bases = collectValues(data, new Set(["statement_basis", "period_basis", "basis", "accumulation_basis"]));
    if (bases.length > 0 && bases.every((value) => normalizeBasis(value) !== normalizeBasis(expectedBasis))) {
      return { ok: false, reason_code: "semantic_period_basis_mismatch", reason: `returned statement basis does not match ${expectedBasis}` };
    }
  }
  const requestedStart = context.start_date ?? parameters.start_date;
  const requestedEnd = context.end_date ?? parameters.end_date;
  if (requestedStart || requestedEnd) {
    const startTime = requestedStart ? dateValue(requestedStart) : -Infinity;
    const endTime = requestedEnd ? dateValue(requestedEnd) + 86_400_000 - 1 : Infinity;
    const windowDates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"])).map(dateValue).filter(Number.isFinite);
    if (windowDates.some((value) => value < startTime || value > endTime)) {
      return { ok: false, reason_code: "semantic_date_window_mismatch", reason: "returned data falls outside the requested date window" };
    }
  }
  const cutoff = context.cut_off ?? context.cutoff ?? context.as_of_date;
  if (cutoff) {
    const cutoffTime = dateValue(cutoff);
    const futureEventEnd = (/^EVENT\.CALENDAR\./.test(capabilityId) || capabilityId === "MKT.CN.LOCK_UP")
      ? dateValue(context.future_event_end_date)
      : NaN;
    const allowedEnd = Number.isFinite(futureEventEnd)
      ? Math.max(cutoffTime, futureEventEnd) + 24 * 60 * 60 * 1000 - 1
      : cutoffTime + 24 * 60 * 60 * 1000 - 1;
    const dates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"])).map(dateValue).filter(Number.isFinite);
    if (Number.isFinite(cutoffTime) && dates.some((value) => value > allowedEnd)) {
      return { ok: false, reason_code: "semantic_future_data", reason: "returned data is later than the declared cutoff" };
    }
  }
  const latestTradingDate = context.latest_trading_date ?? context.cut_off ?? context.cutoff ?? context.as_of_date;
  if ((context.require_fresh === true || capabilityId === "MKT.L1.RT") && latestTradingDate) {
    const expected = dateValue(latestTradingDate);
    const dates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"])).map(dateValue).filter(Number.isFinite);
    const newest = dates.length > 0 ? Math.max(...dates) : NaN;
    const maximumAgeDays = Number(context.maximum_age_days ?? 7);
    if (!Number.isFinite(newest) || expected - newest > maximumAgeDays * 86_400_000) {
      return { ok: false, reason_code: "semantic_stale_data", reason: "real-time data is stale or missing a usable timestamp" };
    }
  }
  if (["FLOW.CROSS_BORDER", "FLOW.NORTHBOUND", "FLOW.SECTOR.CAPITAL"].includes(capabilityId)) {
    const flowValues = collectValues(data, new Set([
      "net_flow", "net_amount", "net_inflow", "inflow", "outflow", "buy_amount", "sell_amount",
      "northbound_net", "southbound_net", "sh_net_flow", "sz_net_flow",
    ])).map(Number).filter(Number.isFinite);
    if (flowValues.length >= 2 && flowValues.every((value) => value === 0)) {
      return { ok: false, reason_code: "semantic_degenerate_flow", reason: "flow output is structurally present but all observed flow values are zero" };
    }
  }
  if (capabilityId === "SENTIMENT.TEXT_SIGNALS") {
    const signals = collectValues(data, new Set([
      "signal", "text_cue", "sentiment", "sentiment_score", "score", "label", "sentiment_label", "direction", "magnitude",
    ])).filter(usable);
    if (signals.length === 0) {
      return { ok: false, reason_code: "semantic_sentiment_signal_empty", reason: "sentiment response contains coverage but no usable sentiment signal" };
    }
  }
  if (capabilityId === "FLOW.LARGE_ORDER") {
    const dates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"]));
    const exchangeTimeZone = context.exchange_timezone ?? context.time_zone ?? "Asia/Shanghai";
    const declaredTradingDates = context.trading_dates ?? context.exchange_trading_dates;
    if (Array.isArray(declaredTradingDates) && declaredTradingDates.length > 0) {
      const tradingDateSet = new Set(declaredTradingDates.map((value) => exchangeCalendarDate(value, exchangeTimeZone)).filter(Boolean));
      const returnedCalendarDates = dates.map((value) => exchangeCalendarDate(value, exchangeTimeZone));
      if (returnedCalendarDates.some((value) => !value || !tradingDateSet.has(value))) {
        return { ok: false, reason_code: "semantic_non_trading_date", reason: "daily A-share flow response date is absent from the frozen exchange calendar" };
      }
    }
    if (dates.length > 0 && dates.some((value) => isWeekendDate(value, exchangeTimeZone))) {
      return { ok: false, reason_code: "semantic_non_trading_date", reason: "daily A-share flow response contains a weekend date" };
    }
  }
  return { ok: true };
}

function missingRequiredOutputFields(detail, data) {
  return (Array.isArray(detail?.field_spec?.required) ? detail.field_spec.required : [])
    .map((field) => typeof field === "string" ? field : field?.name)
    .filter(Boolean)
    .filter((field) => !fieldSatisfied(field, data));
}

function fieldSatisfied(field, data) {
  const normalized = String(field).toLowerCase();
  const group = FIELD_ALIAS_GROUPS.find((values) => values.includes(normalized));
  const names = new Set(group ?? [normalized]);
  return collectValues(data, names).some(usable);
}

async function hydrateFullContentResponse({ response, transport, timeoutMs }) {
  const fullContentUrl = response?.full_content_file_url ?? response?.result?.full_content_file_url;
  if (!fullContentUrl) return response;
  let parsed;
  try {
    const url = new URL(String(fullContentUrl));
    if (url.protocol !== "https:") throw new Error("full content URL must use HTTPS");
    if (typeof transport?.fetchFullContent !== "function") throw new Error("transport does not implement fetchFullContent");
    parsed = await transport.fetchFullContent({ url: url.toString(), timeoutMs });
  } catch (error) {
    return {
      ...withoutFullContentUrl(response),
      success: false,
      result: { ...(response?.result ?? {}), data: null },
      execution_outcome: { reason_code: "full_content_fetch_failed" },
      error_message: `full content fetch failed: ${error?.message ?? String(error)}`,
      full_content_audit: { present: true, fetched: false },
    };
  }
  const fetchedData = responseData(parsed) ?? parsed?.data ?? parsed;
  const fetchedResult = parsed?.result && typeof parsed.result === "object" && !Array.isArray(parsed.result)
    ? parsed.result
    : { data: fetchedData };
  return {
    ...withoutFullContentUrl(response),
    ...(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? withoutFullContentUrl(parsed) : {}),
    execution_id: executionId(parsed) ?? executionId(response),
    result: { ...(response?.result ?? {}), ...fetchedResult, data: fetchedData },
    full_content_audit: { present: true, fetched: true, content_hash: sha256(sanitizeProviderRouteMetadata(parsed)) },
  };
}

function withoutFullContentUrl(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { full_content_file_url: _fullContentFileUrl, full_content_url: _fullContentUrl, signed_url: _signedUrl, ...rest } = value;
  return rest;
}

function responseData(response) {
  return response?.result?.data ?? response?.data ?? null;
}

function executionId(response) {
  const value = response?.execution_id ?? response?.result?.execution_id;
  return typeof value === "string" && value.trim() ? value : null;
}

function errorText(response) {
  const values = [
    response?.message,
    response?.error_message,
    response?.error,
    response?.result?.message,
    response?.result?.error,
    response?.result?.error_message,
    response?.execution_outcome?.reason_code,
  ].filter((value) => value !== undefined && value !== null);
  return values.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" | ");
}

function hasParameterClue(response) {
  return /missing_required_tool_input|missing required|invalid\s+[a-z0-9_]+.*(?:one of|allowed)|symbol format/i.test(errorText(response));
}

function normalizeSymbol(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\.SS$/, ".SH");
}

function isAShareSymbol(value) {
  return /^\d{6}(?:\.(?:SH|SS|SZ))?$/i.test(String(value).trim());
}

function marketEquivalent(left, right) {
  const aliases = { CHINA: "CN", A: "CN", ASHARE: "CN", "A-SHARE": "CN", SSE: "CN", SZSE: "CN" };
  return (aliases[left] ?? left) === (aliases[right] ?? right);
}

function periodEquivalent(left, right) {
  const actual = String(left ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const expected = String(right ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (actual === expected) return true;
  if (["ANNUAL", "YEAR", "YEARLY", "FY"].includes(expected)) {
    return /^(?:FY)?\d{4}$/.test(actual)
      || /^\d{4}1231$/.test(actual)
      || ["ANNUAL", "YEAR", "YEARLY", "FY"].includes(actual);
  }
  const expectedYear = expected.match(/^(?:FY)?(\d{4})$/)?.[1];
  const actualYear = actual.match(/^(?:FY)?(\d{4})$/)?.[1];
  return Boolean(expectedYear && actualYear && expectedYear === actualYear);
}

function normalizeBasis(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
  if (["cumulative", "ytd", "累计", "年初至今"].includes(normalized)) return "cumulative";
  if (["singlequarter", "quarteronly", "单季", "单季度"].includes(normalized)) return "single_quarter";
  return normalized;
}

function usable(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0 && value.some(usable);
  if (typeof value === "object") return Object.entries(value).some(([key, child]) => !key.startsWith("_") && usable(child));
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function collectValues(value, names, output = []) {
  if (Array.isArray(value)) for (const child of value) collectValues(child, names, output);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (names.has(key.toLowerCase())) output.push(child);
      collectValues(child, names, output);
    }
  }
  return output;
}

function normalizeIdentity(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function isWeekendDate(value, timeZone) {
  const calendarDate = exchangeCalendarDate(value, timeZone);
  if (!calendarDate) return false;
  const day = new Date(`${calendarDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function exchangeCalendarDate(value, timeZone = "Asia/Shanghai") {
  const text = String(value ?? "").trim();
  const leadingDate = text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (leadingDate && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return leadingDate;
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function dateValue(value) {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function stableCapabilityDetail(detail) {
  const sanitized = sanitizeProviderRouteMetadata(detail ?? {});
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
  const { remaining_credits: _remainingCredits, ...stable } = sanitized;
  return stable;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function requireTransport(transport, methods) {
  if (!transport || methods.some((method) => typeof transport[method] !== "function")) {
    throw adapterError("invalid_transport", `Finance adapter transport must implement: ${methods.join(", ")}.`);
  }
}

function semanticReason(result) {
  const reason = String(result?.reason_code ?? result?.adaptation?.attempts?.at(-1)?.reason_code ?? "").toLowerCase();
  return /semantic|wrong_(?:entity|market)|entity_mismatch|market_mismatch|date_window|period_mismatch|future_data|stale_data/.test(reason);
}

function adapterError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function emptyAudit(capability, reason) {
  return {
    schema_version: ADAPTATION_SCHEMA_VERSION,
    canonical_name: String(capability ?? ""),
    capability_id: null,
    detail_hash: null,
    attempts: [],
    selected_attempt: null,
    final_status: "rejected",
    rejection_reason: reason,
  };
}

function resolutionAudit(requestedCapability, resolved) {
  return {
    requested_capability: String(requestedCapability ?? ""),
    canonical_name: resolved.canonical_name,
    capability_id: resolved.capability_id,
    detail_hash: resolved.detail_hash,
  };
}
