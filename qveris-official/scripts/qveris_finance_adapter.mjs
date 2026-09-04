import { createHash } from "node:crypto";

import { sanitizeProviderRouteMetadata } from "./qveris_sanitize.mjs";

const ADAPTER_VERSION = "qveris_finance_adapter.v1";
const MAX_CATALOG_PAGES = 20;
const IDENTITY_PARAM_NAMES = new Set([
  "symbol",
  "symbols",
  "ticker",
  "tickers",
  "security_id",
  "security_ids",
  "issuer",
  "issuer_id",
  "isin",
  "cusip",
  "sedol",
  "instrument_id",
  "asset_id",
  "address",
  "addresses",
  "wallet_address",
  "contract_address",
  "contract_addresses",
  "token_address",
  "chain",
  "network",
  "blockchain",
  "pair",
  "pairs",
  "base",
  "base_asset",
  "quote",
  "quote_asset",
  "exchange",
  "code",
  "codes",
]);

export class FinanceAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FinanceAdapterError";
    this.code = code;
    this.details = details;
  }
}

function capabilityToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^qveris_finance[.:/_-]*/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function capabilityRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  for (const key of ["results", "capabilities", "items"]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.data && typeof payload.data === "object") {
    return capabilityRows(payload.data);
  }
  return [];
}

function payloadTotal(payload) {
  for (const candidate of [payload?.total, payload?.data?.total, payload?.pagination?.total]) {
    if (Number.isFinite(Number(candidate))) {
      return Number(candidate);
    }
  }
  return null;
}

function unwrapCapability(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.capability_id) {
    return payload;
  }
  for (const key of ["capability", "result", "data"]) {
    const value = payload[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const unwrapped = unwrapCapability(value);
      if (unwrapped) {
        return unwrapped;
      }
    }
  }
  return null;
}

function uniqueCapabilities(capabilities) {
  const byId = new Map();
  for (const capability of capabilities ?? []) {
    const id = String(capability?.capability_id ?? "").trim();
    if (id && !byId.has(id.toUpperCase())) {
      byId.set(id.toUpperCase(), capability);
    }
  }
  return [...byId.values()];
}

function editDistance(left, right) {
  const a = String(left);
  const b = String(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

function suggestionsFor(token, capabilities) {
  return capabilities
    .map((capability) => ({
      capability_id: capability.capability_id,
      distance: editDistance(token, capabilityToken(capability.capability_id)),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3)
    .map(({ capability_id: capabilityId }) => capabilityId);
}

export function capabilityIdToLogicalName(capabilityId) {
  const token = capabilityToken(capabilityId);
  return token ? `qveris_finance.${token}` : "qveris_finance.unknown";
}

export function resolveFinanceCapability({ requestedCapability, capabilities }) {
  const requested = String(requestedCapability ?? "").trim();
  if (!requested) {
    throw new FinanceAdapterError(
      "capability_required",
      "A CAP ID or qveris_finance.* logical name is required.",
    );
  }

  const rows = uniqueCapabilities(capabilities);
  if (rows.length === 0) {
    throw new FinanceAdapterError(
      "capability_catalog_empty",
      "The live finance capability catalog returned no capabilities; no CAP ID can be resolved safely.",
    );
  }

  const exact = rows.filter(
    (capability) => String(capability.capability_id).toLowerCase() === requested.toLowerCase(),
  );
  if (exact.length === 1) {
    return exact[0];
  }

  const requestedToken = capabilityToken(requested);
  const tokenMatches = rows.filter((capability) => {
    const values = [
      capability.capability_id,
      capability.logical_name,
      capability.tool_name,
      capability.slug,
    ].filter(Boolean);
    return values.some((value) => capabilityToken(value) === requestedToken);
  });

  if (tokenMatches.length === 1) {
    return tokenMatches[0];
  }
  if (tokenMatches.length > 1) {
    throw new FinanceAdapterError(
      "capability_ambiguous",
      `The live catalog maps '${requested}' to multiple CAP IDs: ${tokenMatches.map((item) => item.capability_id).join(", ")}. Use an exact current CAP ID.`,
      { matches: tokenMatches.map((item) => item.capability_id) },
    );
  }

  const suggestions = suggestionsFor(requestedToken, rows);
  throw new FinanceAdapterError(
    "capability_unavailable",
    `The live finance catalog does not contain '${requested}'.${suggestions.length > 0 ? ` Closest current CAP IDs: ${suggestions.join(", ")}.` : ""}`,
    { requested, suggestions },
  );
}

export async function loadFinanceCapabilityCatalog({
  client,
  apiKey,
  timeoutMs = 30000,
  pageSize = 100,
  controlPlaneMaxAttempts = 2,
  controlPlaneRetryDelayMs = 250,
  controlPlaneRetryEvents = [],
}) {
  if (!client?.listCapabilities) {
    throw new FinanceAdapterError("adapter_client_invalid", "The adapter client must provide listCapabilities().");
  }

  const capabilities = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_CATALOG_PAGES; page += 1) {
    const payload = await withControlPlaneFetchRetry({
      phase: `capability_catalog_page_${page}`,
      maxAttempts: controlPlaneMaxAttempts,
      retryDelayMs: controlPlaneRetryDelayMs,
      retryEvents: controlPlaneRetryEvents,
      operation: () => client.listCapabilities({
        apiKey,
        domain: "finance",
        page,
        pageSize,
        timeoutMs,
      }),
    });
    const rows = capabilityRows(payload);
    let newRows = 0;
    for (const row of rows) {
      const id = String(row?.capability_id ?? "").trim().toUpperCase();
      if (id && !seen.has(id)) {
        seen.add(id);
        capabilities.push(row);
        newRows += 1;
      }
    }

    const total = payloadTotal(payload);
    if (rows.length === 0 || newRows === 0 || (total !== null && capabilities.length >= total)) {
      break;
    }
    if (total === null && rows.length < pageSize) {
      break;
    }
  }

  if (capabilities.length === 0) {
    throw new FinanceAdapterError(
      "capability_catalog_empty",
      "The live /capabilities?domain=finance response contained no usable capability_id values.",
    );
  }
  return capabilities;
}

function isTransientControlPlaneFetchFailure(error) {
  if (Number.isFinite(Number(error?.status))) return false;
  const text = [
    error?.message,
    error?.cause?.message,
    error?.cause?.code,
    error?.code,
  ].filter(Boolean).join(" ");
  return /\bfetch failed\b|\bnetwork error\b|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_(?:CONNECT_TIMEOUT|SOCKET)/i.test(text);
}

async function withControlPlaneFetchRetry({
  operation,
  phase,
  maxAttempts,
  retryDelayMs,
  retryEvents,
}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) {
    throw new FinanceAdapterError(
      "control_plane_max_attempts_invalid",
      "controlPlaneMaxAttempts must be the integer 1 or 2.",
    );
  }
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new FinanceAdapterError(
      "control_plane_retry_delay_invalid",
      "controlPlaneRetryDelayMs must be a non-negative number.",
    );
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !isTransientControlPlaneFetchFailure(error)) throw error;
      retryEvents.push({
        phase,
        reason: "transient_fetch_failure",
        attempt: attempt + 1,
      });
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw new FinanceAdapterError("control_plane_retry_exhausted", `Control-plane retry exhausted for ${phase}.`);
}

function errorHttpStatus(error) {
  if (Number.isFinite(Number(error?.status))) {
    return Number(error.status);
  }
  const match = String(error?.message ?? "").match(/\bHTTP\s+(\d{3})\b/i);
  return match ? Number(match[1]) : null;
}

function mergeDetail(catalogCapability, detailCapability) {
  const catalogParams = normalizeParamDefinitions(catalogCapability);
  const detailParams = normalizeParamDefinitions(detailCapability);
  const params = detailParams.length > 0 ? detailCapability.params ?? detailCapability.parameters : catalogCapability.params ?? catalogCapability.parameters;
  return {
    ...catalogCapability,
    ...detailCapability,
    capability_id: catalogCapability.capability_id,
    ...(params === undefined ? {} : { params }),
    examples: {
      ...(catalogCapability.examples ?? {}),
      ...(detailCapability.examples ?? {}),
    },
  };
}

export async function inspectFinanceCapability({
  client,
  apiKey,
  requestedCapability,
  timeoutMs = 30000,
  controlPlaneMaxAttempts = 2,
  controlPlaneRetryDelayMs = 250,
}) {
  const controlPlaneRetryEvents = [];
  const catalog = await loadFinanceCapabilityCatalog({
    client,
    apiKey,
    timeoutMs,
    controlPlaneMaxAttempts,
    controlPlaneRetryDelayMs,
    controlPlaneRetryEvents,
  });
  const resolved = resolveFinanceCapability({ requestedCapability, capabilities: catalog });
  const capabilityId = String(resolved.capability_id);

  if (!client?.getCapability) {
    throw new FinanceAdapterError("adapter_client_invalid", "The adapter client must provide getCapability().");
  }

  try {
    const payload = await withControlPlaneFetchRetry({
      phase: "capability_detail",
      maxAttempts: controlPlaneMaxAttempts,
      retryDelayMs: controlPlaneRetryDelayMs,
      retryEvents: controlPlaneRetryEvents,
      operation: () => client.getCapability({ apiKey, capabilityId, timeoutMs }),
    });
    const detail = unwrapCapability(payload);
    if (!detail) {
      throw new FinanceAdapterError(
        "capability_detail_invalid",
        `Live cap-detail for ${capabilityId} did not contain a capability record.`,
      );
    }
    if (capabilityToken(detail.capability_id) !== capabilityToken(capabilityId)) {
      throw new FinanceAdapterError(
        "capability_identity_mismatch",
        `Live cap-detail returned ${detail.capability_id} while ${capabilityId} was requested; execution was refused.`,
      );
    }
    return {
      ...mergeDetail(resolved, detail),
      detail_source: "live_cap_detail",
      detail_warning: null,
      control_plane_retry_events: controlPlaneRetryEvents,
    };
  } catch (error) {
    const status = errorHttpStatus(error);
    if (status !== 404 && status !== 405) {
      throw error;
    }
    return {
      ...resolved,
      detail_source: "live_catalog_fallback",
      detail_warning: `Live cap-detail returned HTTP ${status}; the exact matching row from the same live finance catalog was used.`,
      control_plane_retry_events: controlPlaneRetryEvents,
    };
  }
}

function normalizeParamDefinitions(detail) {
  const raw = detail?.params ?? detail?.parameters;
  if (Array.isArray(raw)) {
    return raw
      .filter((param) => param && typeof param === "object" && param.name)
      .map((param) => ({ ...param, name: String(param.name) }));
  }
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const properties = raw.properties && typeof raw.properties === "object" ? raw.properties : raw;
  const required = new Set(Array.isArray(raw.required) ? raw.required : []);
  return Object.entries(properties)
    .filter(([, definition]) => definition && typeof definition === "object")
    .map(([name, definition]) => ({
      ...definition,
      name,
      required: definition.required === true || required.has(name),
    }));
}

function normalizedType(type) {
  if (Array.isArray(type)) {
    return normalizedType(type.find((item) => item !== "null") ?? type[0]);
  }
  return String(type ?? "string").trim().toLowerCase();
}

function coerceBoolean(value, name) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || String(value).toLowerCase() === "true" || String(value) === "1") {
    return true;
  }
  if (value === 0 || String(value).toLowerCase() === "false" || String(value) === "0") {
    return false;
  }
  throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be a boolean.`);
}

function parseJsonValue(value, name, expectedType) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new FinanceAdapterError(
      "parameter_type_invalid",
      `Parameter '${name}' must be a JSON ${expectedType}.`,
    );
  }
}

function coerceValue(value, definition) {
  const name = definition.name;
  const type = normalizedType(definition.type ?? definition.schema?.type);
  let coerced;

  if (["string", "str", "symbol", "ticker"].includes(type)) {
    if (value && typeof value === "object") {
      throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be a string.`);
    }
    coerced = String(value);
  } else if (["integer", "int"].includes(type)) {
    coerced = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isInteger(coerced)) {
      throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be an integer.`);
    }
  } else if (["number", "float", "double", "decimal"].includes(type)) {
    coerced = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(coerced)) {
      throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be a finite number.`);
    }
  } else if (["boolean", "bool"].includes(type)) {
    coerced = coerceBoolean(value, name);
  } else if (["array", "list"].includes(type)) {
    coerced = parseJsonValue(value, name, "array");
    if (!Array.isArray(coerced)) {
      throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be an array.`);
    }
  } else if (["object", "dict", "map", "json"].includes(type)) {
    coerced = parseJsonValue(value, name, "object");
    if (!coerced || typeof coerced !== "object" || Array.isArray(coerced)) {
      throw new FinanceAdapterError("parameter_type_invalid", `Parameter '${name}' must be an object.`);
    }
  } else if (["date", "iso_date"].includes(type)) {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
      coerced = value.toISOString().slice(0, 10);
    } else {
      coerced = String(value);
    }
    const parsedDate = new Date(`${coerced}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(coerced)
      || Number.isNaN(parsedDate.valueOf())
      || parsedDate.toISOString().slice(0, 10) !== coerced
    ) {
      throw new FinanceAdapterError(
        "parameter_type_invalid",
        `Parameter '${name}' must be an ISO date in YYYY-MM-DD format.`,
      );
    }
  } else {
    coerced = value;
  }

  return coerced;
}

function validateAllowedValue(value, definition) {
  const allowed = definition.enum ?? definition.allowed_values ?? definition.choices;
  if (Array.isArray(allowed) && !allowed.some((candidate) => candidate === value)) {
    throw new FinanceAdapterError(
      "parameter_value_invalid",
      `Parameter '${definition.name}' must be one of: ${allowed.join(", ")}.`,
    );
  }
  return value;
}

export function normalizeCnSymbol(value) {
  const symbol = String(value ?? "").trim().toUpperCase();
  if (!symbol) {
    return symbol;
  }

  const prefixMatch = symbol.match(/^(SH|SZ)(\d{6})$/);
  if (prefixMatch) {
    return `${prefixMatch[2]}.${prefixMatch[1]}`;
  }

  const suffixMatch = symbol.match(/^(\d{6})\.(SH|SS|SZ|XSHG|XSHE)$/);
  if (suffixMatch) {
    const exchange = ["SH", "SS", "XSHG"].includes(suffixMatch[2]) ? "SH" : "SZ";
    return `${suffixMatch[1]}.${exchange}`;
  }

  if (/^\d{6}$/.test(symbol)) {
    if (/^[0-3]/.test(symbol)) {
      return `${symbol}.SZ`;
    }
    if (/^[569]/.test(symbol)) {
      return `${symbol}.SH`;
    }
    throw new FinanceAdapterError(
      "symbol_exchange_ambiguous",
      `Symbol '${symbol}' needs an explicit exchange suffix; use .SH, .SZ, or another exchange supported by live cap-detail.`,
    );
  }

  return symbol;
}

function normalizeParameterValue(name, value) {
  const normalizedName = String(name).toLowerCase();
  if (["symbol", "ticker", "security_code", "code"].includes(normalizedName)) {
    return normalizeCnSymbol(value);
  }
  if (["symbols", "tickers", "security_codes", "codes"].includes(normalizedName) && Array.isArray(value)) {
    return value.map(normalizeCnSymbol);
  }
  if (normalizedName === "market" && typeof value === "string") {
    return value.trim().toUpperCase();
  }
  return value;
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sampleParameters(detail) {
  const sample = detail?.examples?.sample_parameters ?? detail?.sample_parameters;
  return sample && typeof sample === "object" && !Array.isArray(sample) ? sample : {};
}

export function prepareCapabilityParameters({ detail, parameters }) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new FinanceAdapterError("parameters_invalid", "CAP parameters must be an object.");
  }

  const definitions = normalizeParamDefinitions(detail);
  if (definitions.length === 0) {
    throw new FinanceAdapterError(
      "capability_parameter_schema_unavailable",
      `The parameter schema is unavailable in the live cap-detail/catalog record for ${detail?.capability_id ?? "this CAP"}, so an allow-list cannot be enforced. Execution was refused.`,
    );
  }

  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  const output = {};
  const droppedParams = [];
  const filledParams = [];
  const normalizedParams = [];

  for (const [name, value] of Object.entries(parameters)) {
    const definition = byName.get(name);
    if (!definition) {
      droppedParams.push({ name, reason: "not_in_cap_detail" });
      continue;
    }
    const coerced = coerceValue(value, definition);
    const normalized = validateAllowedValue(normalizeParameterValue(name, coerced), definition);
    output[name] = normalized;
    if (!valuesEqual(value, normalized)) {
      normalizedParams.push({ name, from: value, to: normalized, reason: "cap_detail_type_or_symbol_normalization" });
    }
  }

  const samples = sampleParameters(detail);
  for (const definition of definitions) {
    if (!definition.required || (output[definition.name] !== undefined && output[definition.name] !== null && output[definition.name] !== "")) {
      continue;
    }
    let value;
    let source;
    if (definition.default !== undefined) {
      value = definition.default;
      source = "cap_detail_default";
    } else if (definition.name === "market" && typeof output.symbol === "string" && /\.(SH|SZ)$/.test(output.symbol)) {
      value = "CN";
      source = "normalized_symbol";
    } else if (!IDENTITY_PARAM_NAMES.has(definition.name.toLowerCase()) && Object.hasOwn(samples, definition.name)) {
      value = samples[definition.name];
      source = "cap_detail_example";
    } else {
      continue;
    }
    const coerced = coerceValue(value, definition);
    output[definition.name] = validateAllowedValue(
      normalizeParameterValue(definition.name, coerced),
      definition,
    );
    filledParams.push({ name: definition.name, source });
  }

  const missing = definitions
    .filter((definition) => definition.required)
    .map((definition) => definition.name)
    .filter((name) => output[name] === undefined || output[name] === null || output[name] === "");
  if (missing.length > 0) {
    const accepted = definitions
      .map((definition) => `${definition.name}:${normalizedType(definition.type ?? definition.schema?.type)}${definition.required ? " (required)" : ""}`)
      .join(", ");
    throw new FinanceAdapterError(
      "required_parameters_missing",
      `Missing required CAP parameters: ${missing.join(", ")}. Accepted live cap-detail parameters: ${accepted}. Supply the missing values explicitly; the adapter will not invent them.`,
      { missing, accepted: definitions.map(({ name, type, required }) => ({ name, type, required: Boolean(required) })) },
    );
  }

  if (
    typeof output.symbol === "string"
    && /\.(SH|SZ)$/.test(output.symbol)
    && output.market !== undefined
    && output.market !== "CN"
  ) {
    throw new FinanceAdapterError(
      "security_identity_mismatch",
      `Normalized A-share symbol '${output.symbol}' conflicts with market '${output.market}'. Use market=CN or omit market when it is optional.`,
    );
  }

  return {
    parameters: output,
    definitions,
    dropped_params: droppedParams,
    filled_params: filledParams,
    normalized_params: normalizedParams,
  };
}

function minimalParameters(parameters, definitions) {
  const required = new Set(
    definitions.filter((definition) => definition.required).map((definition) => definition.name),
  );
  return Object.fromEntries(
    Object.entries(parameters).filter(([name]) => required.has(name) || IDENTITY_PARAM_NAMES.has(name.toLowerCase())),
  );
}

function responseSuccess(response) {
  return response?.success === true;
}

function responseErrorCode(response) {
  return String(
    response?.error_code
      ?? response?.result?.error_type
      ?? response?.execution_outcome?.reason_code
      ?? response?.error?.code
      ?? (response?.error?.http_status ? `http_${response.error.http_status}` : "cap_call_failed"),
  );
}

function responseErrorText(response) {
  return [
    response?.error_message,
    response?.error,
    response?.result?.error_type,
    response?.result?.error_details,
    response?.result?.parameter_help?.message,
    response?.execution_outcome?.message,
  ].filter((value) => typeof value === "string").join(" ");
}

function isParameterFailure(response) {
  const code = responseErrorCode(response);
  const text = `${code} ${responseErrorText(response)}`;
  return /(?:invalid|unknown|unsupported|unmappable|missing|required|error)[ _-]*(?:input[ _-]*)?(?:param|parameter)|(?:param|parameter)[ _-]*(?:invalid|unknown|unsupported|unmappable|missing|required|error)/i.test(text)
    || /missing_required_input|invalid_parameters|parameter_contract/i.test(text)
    || /^http_(400|409|422)$/.test(code);
}

function errorNamedOptionalParameters(response, definitions) {
  const text = responseErrorText(response).toLowerCase();
  return definitions
    .filter((definition) => !definition.required)
    .map((definition) => definition.name)
    .filter((name) => new RegExp(`(?:^|[^a-z0-9_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9_])`, "i").test(text));
}

function isInvalidCapabilityFailure(response) {
  const text = `${responseErrorCode(response)} ${responseErrorText(response)}`;
  return /invalid[ _-]*capability|capability[ _-]*(?:not[ _-]*found|unavailable)/i.test(text);
}

function isExplicitlyRetryableTransient(response) {
  const text = `${responseErrorCode(response)} ${responseErrorText(response)}`;
  const status = Number(response?.result?.status_code ?? response?.execution_outcome?.http_status_code ?? 0);
  if ([400, 409, 422].includes(status)
      || /invalid\s+[a-z0-9_. -]+(?:must be one of|allowed|supported)/i.test(text)
      || /must be one of|missing_one_of|missing required|invalid value/i.test(text)) {
    return false;
  }
  return response?.execution_outcome?.retryable === true
    || response?.error?.retryable === true
    || response?.retryable === true;
}

function thrownFailure(error, capabilityId, parameters) {
  const status = errorHttpStatus(error);
  const retryable = isTransientControlPlaneFetchFailure(error);
  return {
    success: false,
    capability_id: capabilityId,
    parameters,
    execution_id: null,
    retryable,
    error_message: error instanceof Error ? error.message : String(error),
    error: {
      code: error?.code ?? (status ? `http_${status}` : "transport_error"),
      http_status: status,
      retryable,
    },
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function responseSha256(response) {
  return createHash("sha256").update(canonicalJson(response), "utf8").digest("hex");
}

async function callOnce({ client, apiKey, capabilityId, parameters, strategy, searchId, timeoutMs }) {
  try {
    return await client.queryCapability({
      apiKey,
      capabilityId,
      parameters,
      strategy,
      searchId,
      timeoutMs,
    });
  } catch (error) {
    return thrownFailure(error, capabilityId, parameters);
  }
}

function buildObservedCall({ response, toolName, capabilityId, parameters, fallbackUsed, observedAt }) {
  const sanitizedResponse = sanitizeProviderRouteMetadata({
    ...response,
    capability_id: response?.capability_id ?? capabilityId,
    parameters: response?.parameters ?? parameters,
  });
  const status = responseSuccess(sanitizedResponse) ? "success" : "failed";
  const missingFields = status === "success" ? [] : [responseErrorCode(sanitizedResponse)];
  return {
    tool_name: toolName,
    request_kind: "capabilities/query",
    capability_id: capabilityId,
    params: sanitizeProviderRouteMetadata(parameters),
    status,
    execution_id: sanitizedResponse.execution_id ?? null,
    fallback_used: fallbackUsed,
    missing_fields: missingFields,
    observed_at: sanitizedResponse.created_at ?? observedAt,
    response_sha256: responseSha256(sanitizedResponse),
    response: sanitizedResponse,
  };
}

function traceFromObservedCall(observedCall) {
  return {
    tool_name: observedCall.tool_name,
    params: observedCall.params,
    status: observedCall.status,
    execution_id: observedCall.execution_id,
    fallback_used: observedCall.fallback_used,
    missing_fields: observedCall.missing_fields,
  };
}

async function hydrateFullContent(response, {
  enabled = false,
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000,
  maxBytes = 10 * 1024 * 1024,
} = {}) {
  const urlValue = response?.result?.full_content_file_url;
  if (!enabled || response?.success !== true || typeof urlValue !== "string") return response;
  const url = new URL(urlValue);
  if (url.protocol !== "https:"
      || url.hostname !== "oss.qveris.cloud"
      || url.username
      || url.password
      || url.port
      || !url.pathname.startsWith("/tool_result_cache/")) {
    return {
      ...response,
      result: { ...response.result, content_retrieval: { status: "rejected", reason: "unapproved_content_host", attempts: 0 } },
    };
  }
  let lastError;
  let attempts = 0;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;
    try {
      const fetched = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      if (!fetched.ok) throw new Error(`full content HTTP ${fetched.status}`);
      const declared = Number(fetched.headers.get("content-length") ?? 0);
      if (declared > maxBytes) throw new Error("full content exceeds size limit");
      const chunks = [];
      let totalBytes = 0;
      const reader = fetched.body?.getReader();
      if (!reader) throw new Error("full content response body is unavailable");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error("full content exceeds size limit");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.hasOwn(parsed, "data")
        ? parsed.data
        : parsed;
      const { full_content_file_url: ignoredUrl, truncated_content: ignoredPrefix, ...rest } = response.result;
      return {
        ...response,
        result: {
          ...rest,
          data,
          content_retrieval: {
            status: "success",
            host: url.hostname,
            attempts: attempt,
            bytes: totalBytes,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          },
        },
      };
    } catch (error) {
      lastError = error;
      if (attempt === 1 && isTransientControlPlaneFetchFailure(error)) continue;
      break;
    }
  }
  return {
    ...response,
    result: {
      ...response.result,
      content_retrieval: {
        status: "failed",
        reason: lastError instanceof Error ? lastError.message : String(lastError),
        attempts,
      },
    },
  };
}

export async function executeFinanceCapability({
  client,
  apiKey,
  requestedCapability,
  parameters,
  strategy = "best",
  searchId,
  timeoutMs = 120000,
  maxAttempts = 2,
  retrieveFullContent = false,
  fullContentFetch = globalThis.fetch,
  maxFullContentBytes = 10 * 1024 * 1024,
  now = () => new Date().toISOString(),
}) {
  if (!client?.queryCapability) {
    throw new FinanceAdapterError("adapter_client_invalid", "The adapter client must provide queryCapability().");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) {
    throw new FinanceAdapterError(
      "adapter_max_attempts_invalid",
      "maxAttempts must be the integer 1 or 2.",
    );
  }

  let detail = await inspectFinanceCapability({
    client,
    apiKey,
    requestedCapability,
    timeoutMs: Math.min(timeoutMs, 30000),
  });
  let prepared = prepareCapabilityParameters({ detail, parameters });
  let capabilityId = detail.capability_id;
  let toolName = capabilityIdToLogicalName(capabilityId);
  let finalParams = prepared.parameters;
  const observedCalls = [];
  const retryEvents = [];

  const firstResponse = await hydrateFullContent(await callOnce({
    client,
    apiKey,
    capabilityId,
    parameters: finalParams,
    strategy,
    searchId,
    timeoutMs,
  }), { enabled: retrieveFullContent, fetchImpl: fullContentFetch, timeoutMs: Math.min(timeoutMs, 30000), maxBytes: maxFullContentBytes });
  observedCalls.push(buildObservedCall({
    response: firstResponse,
    toolName,
    capabilityId,
    parameters: finalParams,
    fallbackUsed: false,
    observedAt: now(),
  }));

  if (maxAttempts > 1 && !responseSuccess(firstResponse) && isInvalidCapabilityFailure(firstResponse)) {
    const refreshedDetail = await inspectFinanceCapability({
      client,
      apiKey,
      requestedCapability,
      timeoutMs: Math.min(timeoutMs, 30000),
    });
    if (refreshedDetail.capability_id !== capabilityId) {
      detail = refreshedDetail;
      prepared = prepareCapabilityParameters({ detail, parameters });
      capabilityId = detail.capability_id;
      toolName = capabilityIdToLogicalName(capabilityId);
      finalParams = prepared.parameters;
      retryEvents.push({ reason: "live_catalog_capability_changed", capability_id: capabilityId });
    }
  } else if (maxAttempts > 1 && !responseSuccess(firstResponse) && isParameterFailure(firstResponse)) {
    const namedOptionalParams = errorNamedOptionalParameters(firstResponse, prepared.definitions);
    const guidedParams = Object.fromEntries(
      Object.entries(finalParams).filter(([name]) => !namedOptionalParams.includes(name)),
    );
    if (namedOptionalParams.length > 0 && !valuesEqual(guidedParams, finalParams)) {
      finalParams = guidedParams;
      retryEvents.push({
        reason: "error_guided_optional_parameter_removal",
        removed_params: namedOptionalParams,
      });
    } else {
      const minimal = minimalParameters(finalParams, prepared.definitions);
      if (!valuesEqual(minimal, finalParams)) {
        finalParams = minimal;
        retryEvents.push({
          reason: "minimal_parameters_after_parameter_error",
          removed_params: Object.keys(prepared.parameters).filter((name) => !Object.hasOwn(minimal, name)),
        });
      }
    }
  } else if (maxAttempts > 1 && !responseSuccess(firstResponse) && isExplicitlyRetryableTransient(firstResponse)) {
    retryEvents.push({
      reason: "explicitly_retryable_transient_failure",
      reason_code: responseErrorCode(firstResponse),
    });
  }

  if (retryEvents.length > 0) {
    const retryResponse = await hydrateFullContent(await callOnce({
      client,
      apiKey,
      capabilityId,
      parameters: finalParams,
      strategy,
      searchId,
      timeoutMs,
    }), { enabled: retrieveFullContent, fetchImpl: fullContentFetch, timeoutMs: Math.min(timeoutMs, 30000), maxBytes: maxFullContentBytes });
    observedCalls.push(buildObservedCall({
      response: retryResponse,
      toolName,
      capabilityId,
      parameters: finalParams,
      fallbackUsed: true,
      observedAt: now(),
    }));
  }

  const finalObservedCall = observedCalls.at(-1);
  return sanitizeProviderRouteMetadata({
    adapter_version: ADAPTER_VERSION,
    resolution: {
      requested_capability: requestedCapability,
      tool_name: toolName,
      capability_id: capabilityId,
      detail_source: detail.detail_source,
      detail_warning: detail.detail_warning,
      control_plane_retry_events: detail.control_plane_retry_events ?? [],
    },
    requested_param_names: Object.keys(parameters ?? {}),
    parameter_audit: {
      dropped_params: prepared.dropped_params,
      filled_params: prepared.filled_params,
      normalized_params: prepared.normalized_params,
    },
    retry_events: retryEvents,
    control_plane_retry_events: detail.control_plane_retry_events ?? [],
    final_params: finalParams,
    response: finalObservedCall.response,
    observed_calls: observedCalls,
    qveris_trace: observedCalls.map(traceFromObservedCall),
  });
}
