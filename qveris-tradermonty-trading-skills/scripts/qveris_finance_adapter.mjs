import { createHash } from "node:crypto";

import { sanitizeProviderRouteMetadata } from "./qveris_sanitize.mjs";

export const ADAPTATION_SCHEMA_VERSION = "qveris.finance-parameter-adaptation.v1";

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
      provider_success: response?.success === true,
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
    symbol: ["ticker", "security_code"],
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
    ?? text.match(/missing required(?: tool)? input\s+["']?([a-zA-Z0-9_]+)/i)?.[1];
  if (missing && definitions.has(missing) && parameters[missing] === undefined) {
    const value = explicitOrEquivalentValue(missing, parameters, context);
    if (value !== undefined) {
      const converted = convertLosslessly(value, definitions.get(missing));
      if (converted.ok) return { ...parameters, [missing]: converted.value };
    }
  }
  const enumMatch = text.match(/(?:invalid|unsupported)\s+([a-zA-Z0-9_]+).*?(?:one of|allowed(?: values)?)[^a-zA-Z0-9]+([^\n;]+)/i);
  if (enumMatch && definitions.has(enumMatch[1])) {
    const name = enumMatch[1];
    const choices = enumChoices(definitions.get(name), enumMatch[2]);
    const requested = context[name] ?? context.parameters?.[name] ?? parameters[name];
    const equivalent = choices.find((choice) => String(choice).toLowerCase() === String(requested).toLowerCase());
    if (equivalent !== undefined && equivalent !== parameters[name]) return { ...parameters, [name]: equivalent };
    if (choices.length === 1 && choices[0] !== parameters[name]) return { ...parameters, [name]: choices[0] };
  }
  return null;
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
  if (response?.success !== true) {
    return {
      ready: false,
      semantic_failure: false,
      reason_code: response?.execution_outcome?.reason_code ?? response?.result?.error_type ?? "provider_business_error",
      rejection_reason: errorText(response).slice(0, 400) || "provider success was not true",
    };
  }
  if (!executionId(response)) return rejection("missing_execution_id", "success=true response has no execution ID");
  if (!usable(data)) return rejection("empty_result", "success=true response has no usable data");
  const missingFields = missingRequiredOutputFields(detail, data);
  if (missingFields.length > 0) return rejection("missing_required_output_fields", `missing required output fields: ${missingFields.join(", ")}`);
  const semantics = semanticAssessment({ capabilityId, parameters, context, data });
  if (!semantics.ok) return { ready: false, semantic_failure: true, reason_code: semantics.reason_code, rejection_reason: semantics.reason };
  return { ready: true, semantic_failure: false, reason_code: "accepted", rejection_reason: null };
}

function rejection(reasonCode, reason) {
  return { ready: false, semantic_failure: false, reason_code: reasonCode, rejection_reason: reason };
}

function semanticAssessment({ capabilityId, parameters, context, data }) {
  const expectedSymbol = context.symbol ?? context.expected_symbol ?? parameters.symbol ?? parameters.ticker;
  const returnedSymbols = collectValues(data, new Set(["symbol", "ticker", "code", "security_code"]))
    .filter((value) => typeof value === "string");
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
  if (expectedSymbol && returnedSymbols.length > 0 && !returnedSymbols.some((value) => symbolsEquivalent(value, expectedSymbol))) {
    return { ok: false, reason_code: "semantic_entity_mismatch", reason: `returned entity does not match ${expectedSymbol}` };
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
    const dates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"])).map(dateValue).filter(Number.isFinite);
    if (Number.isFinite(cutoffTime) && dates.some((value) => value > cutoffTime + 24 * 60 * 60 * 1000 - 1)) {
      return { ok: false, reason_code: "semantic_future_data", reason: "returned data is later than the declared cutoff" };
    }
  }
  const latestTradingDate = context.latest_trading_date;
  if ((context.require_fresh === true || capabilityId === "MKT.L1.RT") && latestTradingDate) {
    const expected = dateValue(latestTradingDate);
    const dates = collectValues(data, new Set(["date", "trade_date", "datetime", "timestamp"])).map(dateValue).filter(Number.isFinite);
    const newest = dates.length > 0 ? Math.max(...dates) : NaN;
    const maximumAgeDays = Number(context.maximum_age_days ?? 7);
    if (!Number.isFinite(newest) || expected - newest > maximumAgeDays * 86_400_000) {
      return { ok: false, reason_code: "semantic_stale_data", reason: "real-time data is stale or missing a usable timestamp" };
    }
  }
  return { ok: true };
}

function missingRequiredOutputFields(detail, data) {
  const keys = allKeys(data);
  return (Array.isArray(detail?.field_spec?.required) ? detail.field_spec.required : [])
    .map((field) => typeof field === "string" ? field : field?.name)
    .filter(Boolean)
    .filter((field) => !fieldSatisfied(field, keys));
}

function fieldSatisfied(field, keys) {
  const normalized = String(field).toLowerCase();
  if (keys.has(normalized)) return true;
  const group = FIELD_ALIAS_GROUPS.find((values) => values.includes(normalized));
  return Boolean(group?.some((value) => keys.has(value)));
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
  if (["ANNUAL", "YEAR", "YEARLY", "FY"].includes(expected)) return /^(?:FY)?\d{4}$/.test(actual) || ["ANNUAL", "YEAR", "YEARLY", "FY"].includes(actual);
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

function allKeys(value, output = new Set()) {
  if (Array.isArray(value)) for (const child of value) allKeys(child, output);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      output.add(key.toLowerCase());
      allKeys(child, output);
    }
  }
  return output;
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
