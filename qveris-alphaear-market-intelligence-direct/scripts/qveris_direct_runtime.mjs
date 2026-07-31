#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://qveris.ai/api/v1";
const APPROVED_HOSTS = new Set(["qveris.ai", "qveris.cn", "api.qveris.cloud"]);
const SENSITIVE_EXACT_KEYS = new Set(["token", "candidate", "candidates", "candidates_tried"]);
const SENSITIVE_KEY_RE = /(^|_)(authorization|api_?key|access_?token|refresh_?token|id_?token|secret|cookie|credential|provider|route|routing|failover|signed_?url|source_?tool_?id|full_?content_?(?:file_?)?url|remaining_?credits)($|_)/i;
const AUTH_VALUE_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SIGNED_URL_RE = /https:\/\/[^\s|)`"']+[?&](?:signature|x-amz-signature|token|access_key|expires)=[^\s|)`"']*/gi;
const PERIOD_CODES = Object.freeze({
  FY: "1231",
  ANNUAL: "1231",
  Q1: "0331",
  Q2: "0630",
  H1: "0630",
  Q3: "0930",
  Q4: "1231",
});

export class DirectContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DirectContractError";
    this.code = code;
    this.details = details;
  }
}

export function resolveDirectBaseUrl(env = process.env) {
  const configured = String(env.QVERIS_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(configured);
  } catch {
    throw new DirectContractError("invalid_base_url", "QVERIS_BASE_URL must be a valid absolute URL");
  }
  if (parsed.protocol !== "https:") {
    throw new DirectContractError("invalid_base_url", "QVERIS_BASE_URL must use HTTPS");
  }
  if (!APPROVED_HOSTS.has(parsed.hostname.toLowerCase())
      || parsed.pathname !== "/api/v1"
      || parsed.username
      || parsed.password
      || parsed.port
      || parsed.search
      || parsed.hash) {
    throw new DirectContractError(
      "invalid_base_url",
      "QVERIS_BASE_URL must use an approved QVeris /api/v1 host without credentials, port, query, or fragment",
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

export function normalizeAshareSymbol(value) {
  const symbol = String(value ?? "").trim().toUpperCase();
  if (!symbol) return symbol;
  const suffixed = symbol.match(/^(\d{6})\.(SH|SS|SZ|BJ)$/);
  if (suffixed) return `${suffixed[1]}.${suffixed[2] === "SS" ? "SH" : suffixed[2]}`;
  const bare = symbol.match(/^(\d{6})$/);
  if (!bare) return symbol;
  const code = bare[1];
  if (/^92/.test(code)) return `${code}.BJ`;
  if (/^[56]/.test(code)) return `${code}.SH`;
  if (/^[0123]/.test(code)) return `${code}.SZ`;
  if (/^[48]/.test(code)) return `${code}.BJ`;
  throw new DirectContractError("ambiguous_symbol", `Cannot infer an A-share exchange for ${code}`);
}

export function normalizeFiscalPeriod(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return PERIOD_CODES[normalized] ?? value;
}

function schemaProperties(schema) {
  if (!schema) return {};
  if (schema.properties && typeof schema.properties === "object") return schema.properties;
  if (Array.isArray(schema)) {
    return Object.fromEntries(schema
      .filter((item) => item && typeof item === "object" && (item.name || item.key))
      .map((item) => [String(item.name ?? item.key), item]));
  }
  if (Array.isArray(schema.params)) return schemaProperties(schema.params);
  return {};
}

function firstSupported(properties, aliases, fallback) {
  return aliases.find((name) => Object.hasOwn(properties, name)) ?? fallback;
}

function adaptIdentifierForSchema(symbol, descriptor = {}) {
  const canonical = normalizeAshareSymbol(symbol);
  const pattern = String(descriptor.pattern ?? descriptor.regex ?? descriptor.description ?? "");
  if (/six[- ]?digit|6[- ]?digit|\\d\{6\}|without\s+(?:exchange|suffix)/i.test(pattern)) {
    return canonical.replace(/\.(?:SH|SZ|BJ)$/i, "");
  }
  return canonical;
}

export function adaptDirectParameters({ parameters = {}, schema, enumMaps = {} } = {}) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new DirectContractError("invalid_parameters", "parameters must be an object");
  }
  const properties = schemaProperties(schema);
  const hasSchema = Object.keys(properties).length > 0;
  const adapted = {};
  const audit = [];
  const aliases = {
    symbol: ["symbol", "ticker", "code", "security_code"],
    start_date: ["start_date", "begin_date", "from_date", "start"],
    end_date: ["end_date", "stop_date", "to_date", "end"],
    fiscal_period: ["fiscal_period", "period", "report_period"],
    statement_type: ["statement_type", "type", "report_type"],
  };

  for (const [sourceName, sourceValue] of Object.entries(parameters)) {
    const targetName = Object.hasOwn(aliases, sourceName)
      ? firstSupported(properties, aliases[sourceName], sourceName)
      : sourceName;
    if (hasSchema && !Object.hasOwn(properties, targetName)) {
      audit.push({ source: sourceName, target: null, action: "dropped_unsupported" });
      continue;
    }
    let targetValue = sourceValue;
    if (sourceName === "symbol") targetValue = adaptIdentifierForSchema(sourceValue, properties[targetName]);
    if (targetName === "period") targetValue = normalizeFiscalPeriod(sourceValue);
    const enumMap = enumMaps[targetName] ?? enumMaps[sourceName];
    if (enumMap && Object.hasOwn(enumMap, String(targetValue))) targetValue = enumMap[String(targetValue)];
    adapted[targetName] = targetValue;
    audit.push({
      source: sourceName,
      target: targetName,
      action: sourceName === targetName && Object.is(sourceValue, targetValue) ? "preserved" : "adapted",
    });
  }

  const required = Object.entries(properties)
    .filter(([, descriptor]) => descriptor?.required === true)
    .map(([name]) => name);
  if (Array.isArray(schema?.required)) required.push(...schema.required);
  const missingRequired = [...new Set(required)].filter((name) => adapted[name] === undefined || adapted[name] === null || adapted[name] === "");
  if (missingRequired.length > 0) {
    throw new DirectContractError("missing_required_parameters", "Required direct-tool parameters are missing", { missingRequired });
  }
  return {
    schema_version: "qveris.direct-parameter-adaptation.v1",
    original_parameters: parameters,
    final_parameters: adapted,
    audit,
  };
}

function finiteNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function estimateDirectBudget({
  expectedRows,
  expectedBillableQuantity,
  creditsPerUnit,
  unitsPerCredit = 1,
  fixedCredits = 0,
  calls = 1,
} = {}) {
  const rows = finiteNumber(expectedRows);
  const billableQuantity = finiteNumber(expectedBillableQuantity, rows);
  const rate = finiteNumber(creditsPerUnit);
  const per = finiteNumber(unitsPerCredit, 1);
  const fixed = finiteNumber(fixedCredits, 0);
  const estimatedCredits = rate === undefined || billableQuantity === undefined
    ? undefined
    : fixed + ((billableQuantity / per) * rate);
  return {
    calls: finiteNumber(calls, 1),
    rows,
    billable_quantity: billableQuantity,
    credits: estimatedCredits,
    estimate_complete: rows !== undefined && billableQuantity !== undefined && estimatedCredits !== undefined,
  };
}

export function enforceDirectBudget({ budget = {}, estimate = {} } = {}) {
  const limits = {
    calls: finiteNumber(budget.max_calls),
    credits: finiteNumber(budget.max_credits),
    rows: finiteNumber(budget.max_rows),
    billable_quantity: finiteNumber(budget.max_billable_quantity),
  };
  const used = {
    calls: finiteNumber(budget.used_calls, 0),
    credits: finiteNumber(budget.used_credits, 0),
    rows: finiteNumber(budget.used_rows, 0),
    billable_quantity: finiteNumber(budget.used_billable_quantity, 0),
  };
  const exceeded = [];
  for (const key of Object.keys(limits)) {
    if (limits[key] === undefined) continue;
    if (estimate[key] === undefined) {
      exceeded.push(`${key}_estimate_unknown`);
      continue;
    }
    if (used[key] + estimate[key] > limits[key]) exceeded.push(`max_${key}_exceeded`);
  }
  if (exceeded.length > 0) {
    throw new DirectContractError("budget_limited", "Direct request is blocked by the preflight budget", {
      exceeded,
      limits,
      used,
      estimate,
    });
  }
  return { allowed: true, limits, used, estimate };
}

function numberOrReject(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new DirectContractError("invalid_bar_value", `${field} must be finite`);
  return number;
}

export function normalizeAdjustedBars(rows, {
  startDate,
  endDate,
  requestedCount,
  adjustment = "adjusted",
  factorConvention,
} = {}) {
  if (!Array.isArray(rows)) throw new DirectContractError("invalid_bars", "bars must be an array");
  const byDate = new Map();
  for (const row of rows) {
    const date = String(row?.date ?? row?.trade_date ?? row?.timestamp ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (startDate && date < startDate) continue;
    if (endDate && date > endDate) continue;
    byDate.set(date, { ...row, date });
  }
  let filtered = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  if (requestedCount !== undefined) {
    const count = Number(requestedCount);
    if (!Number.isInteger(count) || count < 0) throw new DirectContractError("invalid_requested_count", "requestedCount must be a non-negative integer");
    if (filtered.length < count) {
      return { status: "rejected", reason_code: "insufficient_observations", requested_count: count, observed_count: filtered.length, bars: [] };
    }
    filtered = count === 0 ? [] : filtered.slice(-count);
  }

  const normalized = [];
  for (const row of filtered) {
    const explicitAdjusted = row.adj_close ?? row.adjusted_close ?? row.qfq_close;
    const rawClose = row.close;
    let adjClose;
    let basis;
    if (explicitAdjusted !== undefined && explicitAdjusted !== null) {
      adjClose = numberOrReject(explicitAdjusted, "adj_close");
      basis = "explicit_adjusted_close";
    } else if (["none", "raw", "unadjusted"].includes(String(adjustment).toLowerCase())) {
      adjClose = numberOrReject(rawClose, "close");
      basis = "raw_close_requested";
    } else if (row.adjustment_factor !== undefined && factorConvention) {
      const close = numberOrReject(rawClose, "close");
      const factor = numberOrReject(row.adjustment_factor, "adjustment_factor");
      if (factorConvention === "multiply") adjClose = close * factor;
      else if (factorConvention === "divide") adjClose = close / factor;
      else throw new DirectContractError("adjustment_basis_unclear", `Unsupported factor convention ${factorConvention}`);
      basis = `close_${factorConvention}_factor`;
    } else {
      return {
        status: "rejected",
        reason_code: "adjustment_basis_unclear",
        requested_count: requestedCount ?? null,
        observed_count: filtered.length,
        bars: [],
      };
    }
    normalized.push({ ...row, adj_close: adjClose, adjustment_basis: basis });
  }
  return {
    status: "complete",
    reason_code: null,
    requested_count: requestedCount ?? null,
    observed_count: normalized.length,
    window_start: normalized[0]?.date ?? null,
    window_end: normalized.at(-1)?.date ?? null,
    bars: normalized,
  };
}

export function validateFactorComparability(rows, { minSecurities = 3 } = {}) {
  if (!Array.isArray(rows)) throw new DirectContractError("invalid_factor_rows", "factor rows must be an array");
  if (rows.length < minSecurities) {
    return { status: "rejected", reason_code: "insufficient_comparable_securities", comparable_rows: [] };
  }
  const required = ["factor_set", "price_window", "fiscal_period", "measurement_basis", "market_convention"];
  const missing = rows.flatMap((row) => required.filter((field) => row?.[field] === undefined).map((field) => `${row?.security ?? "unknown"}:${field}`));
  if (missing.length > 0) return { status: "rejected", reason_code: "comparison_basis_incomplete", missing_fields: missing, comparable_rows: [] };
  const basis = (row) => canonicalJson({
    factor_set: [...row.factor_set].map(String).sort(),
    price_window: row.price_window,
    fiscal_period: row.fiscal_period,
    measurement_basis: row.measurement_basis,
    market_convention: row.market_convention,
  });
  if (new Set(rows.map(basis)).size !== 1) {
    return { status: "rejected", reason_code: "comparison_basis_mismatch", comparable_rows: [] };
  }
  const peerGroups = new Set(rows.map((row) => row.peer_group).filter(Boolean));
  if (peerGroups.size > 1) {
    const methods = new Set(rows.map((row) => row.normalization_method).filter(Boolean));
    const normalized = rows.every((row) => row.cross_industry_normalized === true) && methods.size === 1;
    if (!normalized) return { status: "rejected", reason_code: "cross_industry_not_comparable", comparable_rows: [] };
  }
  return { status: "complete", reason_code: null, comparable_rows: rows };
}

function normalizedKey(key) {
  return String(key ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function sanitizeDirectResponse(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeDirectResponse(item));
  if (typeof value === "string") {
    return value.replace(AUTH_VALUE_RE, "Bearer [redacted]").replace(SIGNED_URL_RE, "[redacted_signed_url]");
  }
  if (!value || typeof value !== "object") return value;
  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    const keyName = normalizedKey(key);
    if (SENSITIVE_EXACT_KEYS.has(keyName) || SENSITIVE_KEY_RE.test(keyName)) continue;
    sanitized[key] = sanitizeDirectResponse(child);
  }
  return sanitized;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function responseSha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function createObservedCall({
  requestKind,
  query = null,
  toolId = null,
  params = null,
  status,
  searchId = null,
  fallbackUsed = false,
  missingFields = [],
  response = null,
  observedAt = new Date().toISOString(),
  elapsedMs = null,
  timeout = null,
  billing = null,
} = {}) {
  if (!["search", "tools/execute", "tools/by-ids"].includes(requestKind)) {
    throw new DirectContractError("invalid_request_kind", `Unsupported request kind ${requestKind}`);
  }
  if (!["success", "failed", "rejected"].includes(status)) {
    throw new DirectContractError("invalid_status", `Unsupported status ${status}`);
  }
  const sanitizedResponse = sanitizeDirectResponse(response);
  const trace = {
    request_kind: requestKind,
    query,
    tool_id: toolId,
    params: params === null ? null : sanitizeDirectResponse(params),
    status,
    search_id: searchId,
    fallback_used: Boolean(fallbackUsed),
    missing_fields: [...missingFields],
  };
  return {
    ...trace,
    observed_at: observedAt,
    elapsed_ms: elapsedMs,
    timeout,
    billing: sanitizeDirectResponse(billing),
    response_sha256: responseSha256(sanitizedResponse),
    response: sanitizedResponse,
    trace,
  };
}

export function createObservedCallsArtifact({ skill, caseId = null, calls = [], recordedAt = new Date().toISOString() } = {}) {
  return {
    artifact_version: "observed_calls.v1",
    skill,
    case_id: caseId,
    recorded_at: recordedAt,
    observed_call_count: calls.length,
    observed_calls: calls,
    qveris_trace: calls.map((call) => call.trace),
  };
}

export function classifyTimeout(error, {
  elapsedMs,
  clientTimeoutMs,
  executionTimeoutMs,
  upstreamTimeoutMs,
} = {}) {
  const text = String(error?.message ?? error ?? "");
  let layer = "unknown";
  let limitMs = null;
  if (error?.name === "AbortError" || /aborted|client timeout/i.test(text)) {
    layer = "client";
    limitMs = clientTimeoutMs ?? null;
  } else if (/execution timeout|qveris execution|gateway timeout/i.test(text)) {
    layer = "qveris_execution";
    limitMs = executionTimeoutMs ?? null;
  } else if (/upstream|provider.*timeout|request timeout after/i.test(text)) {
    layer = "upstream";
    limitMs = upstreamTimeoutMs ?? null;
  }
  return {
    reason_code: "request_timeout",
    layer,
    elapsed_ms: finiteNumber(elapsedMs, null),
    limit_ms: finiteNumber(limitMs, null),
    message: `${layer} timeout after ${finiteNumber(elapsedMs, 0)}ms${limitMs ? ` (configured limit ${limitMs}ms)` : ""}`,
  };
}

async function requestJson(path, { method = "POST", query = {}, body, timeoutMs = 30_000, apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new DirectContractError("missing_api_key", "QVERIS_API_KEY is not set");
  const url = new URL(`${resolveDirectBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "manual",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      throw new DirectContractError("redirect_rejected", "QVeris redirects are not allowed");
    }
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text.slice(0, 500) }; }
    if (!response.ok) {
      const error = new DirectContractError("http_error", `HTTP ${response.status} for ${method} ${path}`, { status: response.status, payload: sanitizeDirectResponse(payload) });
      error.status = response.status;
      throw error;
    }
    return { payload, elapsedMs: Date.now() - started };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    if (error?.name === "AbortError") {
      error.timeout = classifyTimeout(error, { elapsedMs, clientTimeoutMs: timeoutMs });
    } else {
      const detailText = `${error?.message ?? ""} ${JSON.stringify(error?.details?.payload ?? {})}`;
      if (/timeout|timed out/i.test(detailText)) {
        const seconds = detailText.match(/(?:after|limit(?:ed)? to)\s+(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i);
        const hintedLimitMs = seconds ? Number(seconds[1]) * 1000 : undefined;
        const classified = /gateway|execution/i.test(detailText)
          ? new Error(`QVeris execution timeout: ${detailText}`)
          : new Error(`Upstream provider timeout: ${detailText}`);
        error.timeout = classifyTimeout(classified, {
          elapsedMs,
          executionTimeoutMs: hintedLimitMs,
          upstreamTimeoutMs: hintedLimitMs,
        });
      }
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function writeArtifact(path, artifact) {
  const target = resolve(path);
  const temp = resolve(dirname(target), `.${target.split(/[\\/]/).at(-1)}.${process.pid}.tmp`);
  await writeFile(temp, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temp, target);
}

async function appendArtifact(path, { skill, caseId, call }) {
  let calls = [];
  try {
    const existing = JSON.parse(await readFile(resolve(path), "utf8"));
    if (existing?.artifact_version !== "observed_calls.v1" || !Array.isArray(existing.observed_calls)) {
      throw new DirectContractError("invalid_artifact", "Existing artifact is not observed_calls.v1");
    }
    calls = existing.observed_calls;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const artifact = createObservedCallsArtifact({ skill, caseId, calls: [...calls, call] });
  await writeArtifact(path, artifact);
  return artifact;
}

function parseArgs(argv) {
  const command = argv[0];
  const flags = new Map();
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith("--")) continue;
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true;
    flags.set(flag, value);
  }
  return { command, flags };
}

function jsonFlag(flags, name, fallback = {}) {
  const raw = flags.get(name);
  if (raw === undefined) return fallback;
  try { return JSON.parse(raw); } catch (error) { throw new DirectContractError("invalid_cli_json", `${name} is invalid JSON: ${error.message}`); }
}

function requiredJsonFlag(flags, name) {
  if (!flags.has(name)) throw new DirectContractError("missing_cli_flag", `${name} is required`);
  return jsonFlag(flags, name);
}

function requiredBudget(flags) {
  const budget = requiredJsonFlag(flags, "--budget");
  const missing = ["max_calls", "max_credits", "max_rows", "max_billable_quantity"]
    .filter((name) => budget[name] === undefined || budget[name] === null);
  if (missing.length > 0) {
    throw new DirectContractError("budget_contract_incomplete", "Direct budget is missing required limits", { missing });
  }
  return budget;
}

async function runCli(argv) {
  const { command, flags } = parseArgs(argv);
  if (!command || ["help", "--help", "-h"].includes(command)) {
    console.log(`QVeris direct audited runtime

Commands:
  preflight --params JSON --schema JSON [--enum-maps JSON] [--estimate JSON] [--budget JSON]
  search --query TEXT [--limit N] --budget JSON --skill NAME --artifact PATH
  inspect --tool-id ID [--search-id ID] --budget JSON --skill NAME --artifact PATH
  execute --tool-id ID --search-id ID --params JSON --schema JSON [--enum-maps JSON] --estimate JSON --budget JSON --skill NAME --artifact PATH
  annotate --artifact PATH [--index -1] --status success|failed|rejected [--missing-fields JSON]

HTTP uses QVERIS_BASE_URL (approved QVeris /api/v1 hosts only) and QVERIS_API_KEY. Responses are sanitized and appended to observed_calls.v1.`);
    return;
  }
  if (command === "preflight") {
    const adaptation = adaptDirectParameters({ parameters: jsonFlag(flags, "--params"), schema: requiredJsonFlag(flags, "--schema"), enumMaps: jsonFlag(flags, "--enum-maps", {}) });
    const estimate = estimateDirectBudget(jsonFlag(flags, "--estimate", {}));
    const budget = enforceDirectBudget({ budget: jsonFlag(flags, "--budget", {}), estimate });
    console.log(JSON.stringify({ base_url: resolveDirectBaseUrl(), adaptation, estimate, budget }, null, 2));
    return;
  }

  if (command === "annotate") {
    const artifactPath = flags.get("--artifact");
    if (!artifactPath) throw new DirectContractError("artifact_required", "--artifact is required");
    const artifact = JSON.parse(await readFile(resolve(String(artifactPath)), "utf8"));
    if (artifact?.artifact_version !== "observed_calls.v1" || !Array.isArray(artifact.observed_calls)) {
      throw new DirectContractError("invalid_artifact", "Artifact is not observed_calls.v1");
    }
    const requestedIndex = Number(flags.get("--index") ?? -1);
    const index = requestedIndex < 0 ? artifact.observed_calls.length + requestedIndex : requestedIndex;
    const call = artifact.observed_calls[index];
    if (!call) throw new DirectContractError("invalid_artifact_index", `No observed call at index ${requestedIndex}`);
    const status = String(flags.get("--status") ?? "");
    if (!["success", "failed", "rejected"].includes(status)) throw new DirectContractError("invalid_status", "--status must be success, failed, or rejected");
    const missingFields = jsonFlag(flags, "--missing-fields", call.missing_fields ?? []);
    if (!Array.isArray(missingFields)) throw new DirectContractError("invalid_missing_fields", "--missing-fields must be a JSON array");
    call.status = status;
    call.missing_fields = missingFields;
    call.trace = { ...call.trace, status, missing_fields: missingFields };
    const updated = createObservedCallsArtifact({
      skill: artifact.skill,
      caseId: artifact.case_id ?? null,
      calls: artifact.observed_calls,
      recordedAt: artifact.recorded_at ?? new Date().toISOString(),
    });
    await writeArtifact(String(artifactPath), updated);
    console.log(JSON.stringify({ observed_call: call, observed_call_count: updated.observed_call_count }, null, 2));
    return;
  }

  const skill = String(flags.get("--skill") ?? "qveris-direct");
  const caseId = flags.get("--case-id") === undefined ? null : String(flags.get("--case-id"));
  const artifactPath = flags.get("--artifact");
  if (!artifactPath) throw new DirectContractError("artifact_required", "--artifact is required for observed-call integrity");
  const timeoutMs = Number(flags.get("--timeout-ms") ?? (command === "execute" ? 120_000 : 30_000));
  const apiKey = process.env.QVERIS_API_KEY;
  const budgetInput = requiredBudget(flags);
  let requestKind;
  let query = null;
  let toolId = flags.get("--tool-id") ?? null;
  let searchId = flags.get("--search-id") ?? null;
  let params = null;
  let request;

  if (command === "search") {
    requestKind = "search";
    query = String(flags.get("--query") ?? "").trim();
    if (!query) throw new DirectContractError("query_required", "--query is required");
    enforceDirectBudget({ budget: budgetInput, estimate: { calls: 1, credits: 0, rows: 0, billable_quantity: 0 } });
    request = () => requestJson("/search", { apiKey, body: { query, limit: Number(flags.get("--limit") ?? 10) }, timeoutMs });
  } else if (command === "inspect") {
    requestKind = "tools/by-ids";
    if (!toolId) throw new DirectContractError("tool_id_required", "--tool-id is required");
    enforceDirectBudget({ budget: budgetInput, estimate: { calls: 1, credits: 0, rows: 0, billable_quantity: 0 } });
    request = () => requestJson("/tools/by-ids", { apiKey, body: { tool_ids: [toolId], ...(searchId ? { search_id: searchId } : {}) }, timeoutMs });
  } else if (command === "execute") {
    requestKind = "tools/execute";
    if (!toolId || !searchId) throw new DirectContractError("tool_pair_required", "--tool-id and --search-id are required");
    const adaptation = adaptDirectParameters({ parameters: jsonFlag(flags, "--params"), schema: requiredJsonFlag(flags, "--schema"), enumMaps: jsonFlag(flags, "--enum-maps", {}) });
    params = adaptation.final_parameters;
    const estimate = estimateDirectBudget(requiredJsonFlag(flags, "--estimate"));
    enforceDirectBudget({ budget: budgetInput, estimate });
    request = () => requestJson("/tools/execute", {
      apiKey,
      query: { tool_id: toolId },
      body: { search_id: searchId, parameters: params, max_response_size: Number(flags.get("--max-response-size") ?? 20480) },
      timeoutMs,
    });
  } else {
    throw new DirectContractError("unsupported_command", `Unsupported command ${command}`);
  }

  const observedAt = new Date().toISOString();
  try {
    const { payload, elapsedMs } = await request();
    const status = payload?.success === false ? "failed" : "success";
    const missingFields = status === "failed" ? [payload?.error_type ?? "request_failed"] : [];
    const call = createObservedCall({ requestKind, query, toolId, params, status, searchId, fallbackUsed: flags.has("--fallback"), missingFields, response: payload, observedAt, elapsedMs, billing: payload?.billing ?? { cost: payload?.cost ?? null } });
    const artifact = await appendArtifact(String(artifactPath), { skill, caseId, call });
    console.log(JSON.stringify({ response: call.response, observed_call: call, observed_call_count: artifact.observed_call_count }, null, 2));
  } catch (error) {
    const timeout = error?.timeout ?? null;
    const call = createObservedCall({ requestKind, query, toolId, params, status: "failed", searchId, fallbackUsed: flags.has("--fallback"), missingFields: [timeout?.reason_code ?? error?.code ?? "request_failed"], response: { error: error?.message ?? String(error), timeout }, observedAt, timeout });
    await appendArtifact(String(artifactPath), { skill, caseId, call });
    throw error;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(JSON.stringify(sanitizeDirectResponse({ code: error?.code ?? "runtime_error", message: error?.message ?? String(error), details: error?.details ?? null, timeout: error?.timeout ?? null })));
    process.exit(1);
  });
}
