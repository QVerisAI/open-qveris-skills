#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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
  const configured = String(env.QVERIS_BASE_URL ?? env.QVERIS_API_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
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

function hasConfiguredProxy(env = process.env) {
  return Boolean(env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || env.ALL_PROXY || env.all_proxy);
}

function relaunchWithEnvProxyIfNeeded() {
  if (!hasConfiguredProxy()
      || process.execArgv.includes("--use-env-proxy")
      || process.env.QVERIS_PROXY_REEXEC
      || !process.allowedNodeEnvironmentFlags.has("--use-env-proxy")) {
    return false;
  }
  const child = spawnSync(process.execPath, [
    "--use-env-proxy",
    ...process.execArgv,
    resolve(process.argv[1]),
    ...process.argv.slice(2),
  ], {
    stdio: "inherit",
    env: { ...process.env, QVERIS_PROXY_REEXEC: "1" },
  });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
  return true;
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
  const examples = [descriptor.example, ...(Array.isArray(descriptor.examples) ? descriptor.examples : [])]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim().toUpperCase());
  if (examples.length > 0 && examples.every((value) => /^\d{6}$/.test(value))) {
    return canonical.replace(/\.(?:SH|SZ|BJ)$/i, "");
  }
  if (/six[- ]?digit|6[- ]?digit|\\d\{6\}|without\s+(?:exchange|suffix)/i.test(pattern)) {
    return canonical.replace(/\.(?:SH|SZ|BJ)$/i, "");
  }
  if ((examples.some((value) => /\.SS$/.test(value)) && !examples.some((value) => /\.SH$/.test(value)))
      || /\.SH\s+is\s+not\s+supported|Shanghai\s+(?:uses|requires)\s+\.SS/i.test(pattern)) {
    return canonical.replace(/\.SH$/i, ".SS");
  }
  return canonical;
}

function adaptIdentifierValueForSchema(value, descriptor = {}) {
  if (!Array.isArray(value)) return adaptIdentifierForSchema(value, descriptor);
  const adapted = value.map((symbol) => adaptIdentifierForSchema(symbol, descriptor));
  const description = String(descriptor.description ?? "");
  return descriptor.type === "string" || /comma[- ]separated/i.test(description) ? adapted.join(",") : adapted;
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
    symbol: ["symbol", "ticker", "code", "security_code", "s"],
    symbols: ["symbols", "codes", "tickers", "security_codes", "s"],
    start_date: ["start_date", "startdate", "begin_date", "from_date", "sdate", "from", "start"],
    end_date: ["end_date", "enddate", "stop_date", "to_date", "edate", "to", "end"],
    adjustment: ["adjustment", "cps"],
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
    if (sourceName === "symbol" || sourceName === "symbols") targetValue = adaptIdentifierValueForSchema(sourceValue, properties[targetName]);
    if (targetName === "period") targetValue = normalizeFiscalPeriod(sourceValue);
    const enumMap = enumMaps[targetName] ?? enumMaps[sourceName];
    if (enumMap && Object.hasOwn(enumMap, String(sourceValue))) targetValue = enumMap[String(sourceValue)];
    else if (enumMap && Object.hasOwn(enumMap, String(targetValue))) targetValue = enumMap[String(targetValue)];
    const supportedValues = properties[targetName]?.enum;
    if (Array.isArray(supportedValues) && !supportedValues.some((value) => Object.is(value, targetValue))) {
      throw new DirectContractError("unsupported_enum_value", `Adapted value for ${targetName} is outside the discovered enum`, {
        parameter: targetName,
        value: targetValue,
        supported_values: supportedValues,
      });
    }
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

function countResponseRows(value) {
  if (Array.isArray(value)) return value.reduce((total, item) => total + countResponseRows(item), 0);
  return value && typeof value === "object" ? 1 : 0;
}

function billedQuantity(call) {
  const explicit = finiteNumber(call?.usage?.billable_quantity
    ?? call?.billing?.billable_quantity
    ?? call?.billing?.quantity);
  if (explicit !== undefined) return explicit;
  const summary = String(call?.billing?.summary ?? call?.response?.billing?.summary ?? "");
  const match = summary.match(/used\s+([\d,.]+)\s+quantit(?:y|ys|ies)/i);
  return match ? finiteNumber(match[1].replace(/,/g, ""), 0) : 0;
}

export function summarizeObservedUsage(observedCalls = []) {
  if (!Array.isArray(observedCalls)) throw new DirectContractError("invalid_observed_calls", "observedCalls must be an array");
  return observedCalls.reduce((usage, call) => {
    const credits = finiteNumber(call?.usage?.credits
      ?? call?.billing?.list_amount_credits
      ?? call?.billing?.credits
      ?? call?.response?.billing?.list_amount_credits
      ?? call?.response?.cost, 0);
    const rows = finiteNumber(call?.usage?.rows,
      call?.request_kind === "tools/execute" ? countResponseRows(call?.response?.result?.data) : 0);
    return {
      calls: usage.calls + 1,
      credits: usage.credits + credits,
      rows: usage.rows + rows,
      billable_quantity: usage.billable_quantity + billedQuantity(call),
    };
  }, { calls: 0, credits: 0, rows: 0, billable_quantity: 0 });
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

export function enforceDirectBudget({ budget = {}, estimate = {}, observedCalls = [] } = {}) {
  const limits = {
    calls: finiteNumber(budget.max_calls),
    credits: finiteNumber(budget.max_credits),
    rows: finiteNumber(budget.max_rows),
    billable_quantity: finiteNumber(budget.max_billable_quantity),
  };
  const observed = summarizeObservedUsage(observedCalls);
  const used = {
    calls: Math.max(finiteNumber(budget.used_calls, 0), observed.calls),
    credits: Math.max(finiteNumber(budget.used_credits, 0), observed.credits),
    rows: Math.max(finiteNumber(budget.used_rows, 0), observed.rows),
    billable_quantity: Math.max(finiteNumber(budget.used_billable_quantity, 0), observed.billable_quantity),
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

function normalizeSecurityIdentity(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return null;
  if (/^\d{6}(?:\.(?:SH|SS|SZ|BJ))?$/.test(text)) return normalizeAshareSymbol(text);
  return text;
}

function barObservationFingerprint(row) {
  return canonicalJson({
    symbol: normalizeSecurityIdentity(row?.symbol ?? row?.thscode ?? row?.ticker ?? row?.code),
    open: row?.open ?? row?.adjOpen ?? row?.adjustedOpen ?? null,
    high: row?.high ?? row?.adjHigh ?? row?.adjustedHigh ?? null,
    low: row?.low ?? row?.adjLow ?? row?.adjustedLow ?? null,
    close: row?.adj_close ?? row?.adjusted_close ?? row?.adjClose ?? row?.adjustedClose ?? row?.qfq_close ?? row?.close ?? null,
    volume: row?.volume ?? null,
    adjustment_factor: row?.adjustment_factor ?? null,
  });
}

export function normalizeAdjustedBars(rows, {
  startDate,
  endDate,
  requestedCount,
  adjustment = "adjusted",
  factorConvention,
  expectedSymbol,
} = {}) {
  if (!Array.isArray(rows)) throw new DirectContractError("invalid_bars", "bars must be an array");
  const expectedIdentity = normalizeSecurityIdentity(expectedSymbol);
  if (expectedIdentity) {
    const observedIdentities = [...new Set(rows
      .map((row) => normalizeSecurityIdentity(row?.symbol ?? row?.thscode ?? row?.ticker ?? row?.code))
      .filter(Boolean))];
    if (observedIdentities.length === 0) {
      return { status: "rejected", reason_code: "entity_identity_missing", observed_symbols: [], bars: [] };
    }
    if (observedIdentities.some((identity) => identity !== expectedIdentity)) {
      return { status: "rejected", reason_code: "entity_mismatch", expected_symbol: expectedIdentity, observed_symbols: observedIdentities, bars: [] };
    }
  }
  const byDate = new Map();
  for (const row of rows) {
    const date = String(row?.date ?? row?.trade_date ?? row?.time ?? row?.timestamp ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (startDate && date < startDate) continue;
    if (endDate && date > endDate) continue;
    const existing = byDate.get(date);
    if (existing && barObservationFingerprint(existing) !== barObservationFingerprint(row)) {
      return { status: "rejected", reason_code: "conflicting_duplicate_observation", duplicate_date: date, bars: [] };
    }
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
    const explicitAdjusted = row.adj_close ?? row.adjusted_close ?? row.adjClose ?? row.adjustedClose ?? row.qfq_close;
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

function parseEvidenceTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function zonedDateParts(timestamp, timeZone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
  } catch {
    throw new DirectContractError("invalid_market_timezone", `Unsupported market time zone ${timeZone}`);
  }
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: (Number(value("hour")) * 60) + Number(value("minute")),
  };
}

function previousMarketDate(dateTag, holidays) {
  let timestamp = Date.parse(`${dateTag}T00:00:00Z`) - (24 * 60 * 60 * 1000);
  while (true) {
    const candidate = new Date(timestamp);
    const nextDate = candidate.toISOString().slice(0, 10);
    const weekday = candidate.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holidays.has(nextDate)) return nextDate;
    timestamp -= 24 * 60 * 60 * 1000;
  }
}

function expectedMarketSessionDate(observedTimestamp, marketSession) {
  const timeZone = String(marketSession.timeZone ?? marketSession.time_zone ?? "").trim();
  if (!timeZone) throw new DirectContractError("market_timezone_required", "marketSession.timeZone is required");
  const openTime = String(marketSession.openTime ?? marketSession.open_time ?? "09:30");
  const openMatch = /^(\d{2}):(\d{2})$/.exec(openTime);
  if (!openMatch || Number(openMatch[1]) > 23 || Number(openMatch[2]) > 59) {
    throw new DirectContractError("invalid_market_open_time", "marketSession.openTime must use HH:MM");
  }
  const holidaysInput = marketSession.holidays ?? [];
  if (!Array.isArray(holidaysInput)) throw new DirectContractError("invalid_market_holidays", "marketSession.holidays must be an array");
  const holidays = new Set(holidaysInput.map(String));
  const observed = zonedDateParts(observedTimestamp, timeZone);
  const observedWeekday = new Date(`${observed.date}T00:00:00Z`).getUTCDay();
  const openMinutes = (Number(openMatch[1]) * 60) + Number(openMatch[2]);
  if (observedWeekday === 0 || observedWeekday === 6 || holidays.has(observed.date) || observed.minutes < openMinutes) {
    return { date: previousMarketDate(observed.date, holidays), timeZone };
  }
  return { date: observed.date, timeZone };
}

export function validateQuote(quote, {
  expectedSymbol,
  expectedCurrency,
  observedAt = new Date().toISOString(),
  maxAgeMs,
  maxFutureSkewMs = 5 * 60 * 1000,
  marketSession,
} = {}) {
  if (!quote || typeof quote !== "object" || Array.isArray(quote)) {
    return { status: "rejected", reason_code: "invalid_quote", quote: null };
  }
  const expectedIdentity = normalizeSecurityIdentity(expectedSymbol);
  const observedIdentity = normalizeSecurityIdentity(quote.symbol ?? quote.ticker ?? quote.code ?? quote.thscode);
  if (expectedIdentity && !observedIdentity) {
    return { status: "rejected", reason_code: "entity_identity_missing", quote: null };
  }
  if (expectedIdentity && observedIdentity !== expectedIdentity) {
    return { status: "rejected", reason_code: "entity_mismatch", expected_symbol: expectedIdentity, observed_symbol: observedIdentity, quote: null };
  }
  const observedCurrency = String(quote.currency ?? quote.reportedCurrency ?? "").trim().toUpperCase();
  if (expectedCurrency && !observedCurrency) {
    return { status: "rejected", reason_code: "currency_missing", quote: null };
  }
  if (expectedCurrency && observedCurrency !== String(expectedCurrency).trim().toUpperCase()) {
    return { status: "rejected", reason_code: "currency_mismatch", expected_currency: String(expectedCurrency).trim().toUpperCase(), observed_currency: observedCurrency, quote: null };
  }
  const price = finiteNumber(quote.price ?? quote.c ?? quote.close ?? quote.current_price ?? quote.latestPrice);
  if (price === undefined) return { status: "rejected", reason_code: "price_missing", quote: null };
  const sourceTimestamp = parseEvidenceTimestamp(quote.timestamp ?? quote.time ?? quote.datetime ?? quote.lastUpdated ?? quote.latestTradingDay ?? quote.t);
  const observedTimestamp = parseEvidenceTimestamp(observedAt);
  let freshnessBasis = null;
  if (maxAgeMs !== undefined || marketSession) {
    if (sourceTimestamp === null || observedTimestamp === null) {
      return { status: "rejected", reason_code: "quote_timestamp_missing", quote: null };
    }
    const ageMs = observedTimestamp - sourceTimestamp;
    if (ageMs < -finiteNumber(maxFutureSkewMs, 0)) return { status: "rejected", reason_code: "future_quote_timestamp", age_ms: ageMs, quote: null };
    if (marketSession) {
      const expectedSession = expectedMarketSessionDate(observedTimestamp, marketSession);
      const sourceDate = zonedDateParts(sourceTimestamp, expectedSession.timeZone).date;
      if (sourceDate < expectedSession.date) {
        return { status: "rejected", reason_code: "stale_quote", source_market_date: sourceDate, expected_market_date: expectedSession.date, quote: null };
      }
      freshnessBasis = "market_session";
    }
  }
  if (maxAgeMs !== undefined) {
    const maximumAge = finiteNumber(maxAgeMs);
    if (maximumAge === undefined || maximumAge < 0) throw new DirectContractError("invalid_max_age", "maxAgeMs must be a non-negative number");
    const ageMs = observedTimestamp - sourceTimestamp;
    if (ageMs > maximumAge) return { status: "rejected", reason_code: "stale_quote", age_ms: ageMs, max_age_ms: maximumAge, quote: null };
    freshnessBasis ??= "elapsed_time";
  }
  return {
    status: "complete",
    reason_code: null,
    freshness_basis: freshnessBasis,
    quote: { ...quote, symbol: observedIdentity ?? null, currency: observedCurrency || null, price, source_timestamp: sourceTimestamp === null ? null : new Date(sourceTimestamp).toISOString() },
  };
}

function executionRecords(data) {
  if (!Array.isArray(data)) return data && typeof data === "object" ? [data] : [];
  return data.flat(Infinity).filter((item) => item && typeof item === "object" && !Array.isArray(item));
}

function valueAtPath(value, path) {
  return String(path ?? "").split(".").filter(Boolean).reduce((current, key) => current?.[key], value);
}

function validateRecordEvidence(data, validation) {
  const requiredFields = validation.requiredFields ?? validation.required_fields ?? [];
  if (!Array.isArray(requiredFields)) throw new DirectContractError("invalid_required_fields", "requiredFields must be an array");
  const missingFields = requiredFields.filter((path) => valueAtPath(data, path) === undefined || valueAtPath(data, path) === null);
  if (missingFields.length > 0) return { status: "rejected", reason_code: "required_fields_missing", missing_fields: missingFields };

  const expectedIdentity = normalizeSecurityIdentity(validation.expectedSymbol ?? validation.expected_symbol);
  const observedIdentity = normalizeSecurityIdentity(data?.symbol ?? data?.ticker ?? data?.code ?? data?.thscode);
  if (expectedIdentity && !observedIdentity) return { status: "rejected", reason_code: "entity_identity_missing" };
  if (expectedIdentity && observedIdentity !== expectedIdentity) {
    return { status: "rejected", reason_code: "entity_mismatch", expected_symbol: expectedIdentity, observed_symbol: observedIdentity };
  }

  const recordPath = validation.recordPath ?? validation.record_path;
  const recordValue = recordPath ? valueAtPath(data, recordPath) : data;
  const records = executionRecords(recordValue);
  const minRecords = finiteNumber(validation.minRecords ?? validation.min_records, 1);
  if (!Number.isInteger(minRecords) || minRecords < 0) throw new DirectContractError("invalid_min_records", "minRecords must be a non-negative integer");
  if (records.length < minRecords) return { status: "rejected", reason_code: "insufficient_records", observed_count: records.length, minimum_count: minRecords };

  const expectedCurrency = String(validation.expectedCurrency ?? validation.expected_currency ?? "").trim().toUpperCase();
  if (expectedCurrency) {
    const currencies = [...new Set([data, ...records]
      .map((record) => String(record?.currency ?? record?.reportedCurrency ?? "").trim().toUpperCase())
      .filter(Boolean))];
    if (currencies.length === 0) return { status: "rejected", reason_code: "currency_missing", observed_count: records.length };
    if (currencies.some((currency) => currency !== expectedCurrency)) {
      return { status: "rejected", reason_code: "currency_mismatch", expected_currency: expectedCurrency, observed_currencies: currencies, observed_count: records.length };
    }
  }
  return { status: "complete", reason_code: null, observed_count: records.length, observed_symbol: observedIdentity };
}

export function validateDirectResponse({ requestKind, payload, validation, params = {}, observedAt = new Date().toISOString() } = {}) {
  if (!payload || typeof payload !== "object") {
    return { status: "failed", reason_code: "invalid_response_envelope", evidence: null };
  }
  if (payload.success === false) {
    return { status: "failed", reason_code: payload.error_type ?? "request_failed", evidence: null };
  }
  if (requestKind === "search" || requestKind === "tools/by-ids") {
    if (!Array.isArray(payload.results)) return { status: "rejected", reason_code: "results_missing", evidence: null };
    if (requestKind === "search" && !payload.search_id) return { status: "rejected", reason_code: "search_id_missing", evidence: null };
    return { status: "success", reason_code: null, evidence: { result_count: payload.results.length } };
  }
  if (requestKind !== "tools/execute") {
    throw new DirectContractError("invalid_request_kind", `Unsupported request kind ${requestKind}`);
  }
  const statusCode = finiteNumber(payload?.result?.status_code);
  if (statusCode !== undefined && (statusCode < 200 || statusCode >= 300)) {
    return { status: "failed", reason_code: `upstream_status_${statusCode}`, evidence: null };
  }
  const data = payload?.result?.data;
  if (data === undefined || data === null) return { status: "rejected", reason_code: "response_data_missing", evidence: null };
  if (!validation || typeof validation !== "object") {
    return { status: "rejected", reason_code: "semantic_validation_required", evidence: null };
  }
  if (validation.kind === "adjusted_bars") {
    const evidence = normalizeAdjustedBars(executionRecords(data), {
      startDate: validation.startDate ?? validation.start_date,
      endDate: validation.endDate ?? validation.end_date,
      requestedCount: validation.requestedCount ?? validation.requested_count,
      adjustment: validation.adjustment,
      factorConvention: validation.factorConvention ?? validation.factor_convention,
      expectedSymbol: validation.expectedSymbol ?? validation.expected_symbol,
    });
    return evidence.status === "complete"
      ? { status: "success", reason_code: null, evidence }
      : { status: "rejected", reason_code: evidence.reason_code, evidence };
  }
  if (validation.kind === "adjusted_bar_groups") {
    const records = executionRecords(data);
    const expectedSymbols = validation.expectedSymbols ?? validation.expected_symbols;
    if (!Array.isArray(expectedSymbols) || expectedSymbols.length === 0) {
      throw new DirectContractError("expected_symbols_required", "adjusted_bar_groups requires expectedSymbols");
    }
    const expected = [...new Set(expectedSymbols.map(normalizeSecurityIdentity))].sort();
    const groups = new Map();
    for (const record of records) {
      const identity = normalizeSecurityIdentity(record?.symbol ?? record?.thscode ?? record?.ticker ?? record?.code);
      if (!identity) return { status: "rejected", reason_code: "entity_identity_missing", evidence: null };
      groups.set(identity, [...(groups.get(identity) ?? []), record]);
    }
    const observed = [...groups.keys()].sort();
    if (canonicalJson(observed) !== canonicalJson(expected)) {
      return { status: "rejected", reason_code: "entity_set_mismatch", evidence: { expected_symbols: expected, observed_symbols: observed } };
    }
    const normalizedGroups = {};
    for (const symbol of expected) {
      const normalized = normalizeAdjustedBars(groups.get(symbol), {
        startDate: validation.startDate ?? validation.start_date,
        endDate: validation.endDate ?? validation.end_date,
        requestedCount: validation.requestedCount ?? validation.requested_count,
        adjustment: validation.adjustment,
        factorConvention: validation.factorConvention ?? validation.factor_convention,
        expectedSymbol: symbol,
      });
      normalizedGroups[symbol] = normalized;
      if (normalized.status !== "complete") {
        return { status: "rejected", reason_code: normalized.reason_code, evidence: { observed_symbols: observed, groups: normalizedGroups } };
      }
    }
    return { status: "success", reason_code: null, evidence: { observed_symbols: observed, groups: normalizedGroups } };
  }
  if (validation.kind === "quote") {
    let quote = Array.isArray(data) ? executionRecords(data)[0] : data;
    const expectedSymbol = validation.expectedSymbol ?? validation.expected_symbol;
    const identitySource = validation.identitySource ?? validation.identity_source;
    if (identitySource === "request" && !normalizeSecurityIdentity(quote?.symbol ?? quote?.ticker ?? quote?.code ?? quote?.thscode)) {
      const requestedIdentity = normalizeSecurityIdentity(params?.symbol ?? params?.ticker ?? params?.code ?? params?.thscode);
      const expectedIdentity = normalizeSecurityIdentity(expectedSymbol);
      if (!requestedIdentity || (expectedIdentity && requestedIdentity !== expectedIdentity)) {
        return { status: "rejected", reason_code: "request_entity_mismatch", evidence: null };
      }
      quote = { ...quote, symbol: requestedIdentity };
    }
    const evidence = validateQuote(quote, {
      expectedSymbol,
      expectedCurrency: validation.expectedCurrency ?? validation.expected_currency,
      observedAt,
      maxAgeMs: validation.maxAgeMs ?? validation.max_age_ms,
      maxFutureSkewMs: validation.maxFutureSkewMs ?? validation.max_future_skew_ms,
      marketSession: validation.marketSession ?? validation.market_session,
    });
    if (evidence.status === "complete") evidence.identity_source = identitySource === "request" ? "request" : "response";
    return evidence.status === "complete"
      ? { status: "success", reason_code: null, evidence }
      : { status: "rejected", reason_code: evidence.reason_code, evidence };
  }
  if (validation.kind === "records") {
    const evidence = validateRecordEvidence(data, validation);
    return evidence.status === "complete"
      ? { status: "success", reason_code: null, evidence }
      : { status: "rejected", reason_code: evidence.reason_code, evidence };
  }
  return { status: "rejected", reason_code: "unsupported_semantic_validation", evidence: null };
}

function compactValidationEvidence(value) {
  if (Array.isArray(value)) return value.map((item) => compactValidationEvidence(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["bars", "quote"].includes(key))
    .map(([key, child]) => [key, compactValidationEvidence(child)]));
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
  usage = null,
  validation = null,
} = {}) {
  if (!["search", "tools/execute", "tools/by-ids"].includes(requestKind)) {
    throw new DirectContractError("invalid_request_kind", `Unsupported request kind ${requestKind}`);
  }
  if (!["success", "failed", "rejected"].includes(status)) {
    throw new DirectContractError("invalid_status", `Unsupported status ${status}`);
  }
  const sanitizedResponse = sanitizeDirectResponse(response);
  const observedSearchId = searchId ?? sanitizedResponse?.search_id ?? null;
  const trace = {
    request_kind: requestKind,
    query,
    tool_id: toolId,
    params: params === null ? null : sanitizeDirectResponse(params),
    status,
    search_id: observedSearchId,
    fallback_used: Boolean(fallbackUsed),
    missing_fields: [...missingFields],
  };
  return {
    ...trace,
    observed_at: observedAt,
    elapsed_ms: elapsedMs,
    timeout,
    billing: sanitizeDirectResponse(billing),
    usage: sanitizeDirectResponse(usage),
    validation: sanitizeDirectResponse(validation),
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

async function readObservedArtifact(path) {
  try {
    const artifact = JSON.parse(await readFile(resolve(path), "utf8"));
    if (artifact?.artifact_version !== "observed_calls.v1" || !Array.isArray(artifact.observed_calls)) {
      throw new DirectContractError("invalid_artifact", "Existing artifact is not observed_calls.v1");
    }
    return artifact;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function withArtifactLock(path, callback, { timeoutMs = 5_000, staleAfterMs = 30_000 } = {}) {
  const lockPath = `${resolve(path)}.lock`;
  const started = Date.now();
  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs >= staleAfterMs) {
          await rm(lockPath, { recursive: true, force: true });
          continue;
        }
      } catch (statError) {
        if (statError?.code === "ENOENT") continue;
        throw statError;
      }
      if (Date.now() - started >= timeoutMs) {
        throw new DirectContractError("artifact_lock_timeout", `Timed out waiting for artifact lock ${lockPath}`);
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    }
  }
  try {
    return await callback();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}

export async function appendObservedCall(path, { skill, caseId, call }) {
  return withArtifactLock(path, async () => {
    const existing = await readObservedArtifact(path);
    const calls = existing?.observed_calls ?? [];
    const artifact = createObservedCallsArtifact({ skill, caseId, calls: [...calls, call] });
    await writeArtifact(path, artifact);
    return artifact;
  });
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
  execute --tool-id ID --search-id ID --params JSON --schema JSON [--enum-maps JSON] --validation JSON --estimate JSON --budget JSON --skill NAME --artifact PATH
  annotate --artifact PATH [--index -1] --status failed|rejected [--missing-fields JSON]

HTTP uses QVERIS_BASE_URL (or desktop QVERIS_API_BASE_URL) and QVERIS_API_KEY. Responses are sanitized and appended to observed_calls.v1.`);
    return;
  }
  if (command === "preflight") {
    const adaptation = adaptDirectParameters({ parameters: jsonFlag(flags, "--params"), schema: requiredJsonFlag(flags, "--schema"), enumMaps: jsonFlag(flags, "--enum-maps", {}) });
    const estimate = estimateDirectBudget(jsonFlag(flags, "--estimate", {}));
    const artifactPath = flags.get("--artifact");
    const artifact = artifactPath ? await readObservedArtifact(String(artifactPath)) : null;
    const budget = enforceDirectBudget({ budget: jsonFlag(flags, "--budget", {}), estimate, observedCalls: artifact?.observed_calls ?? [] });
    console.log(JSON.stringify({
      base_url: resolveDirectBaseUrl(),
      transport: {
        proxy_configured: hasConfiguredProxy(),
        env_proxy_enabled: process.execArgv.includes("--use-env-proxy"),
      },
      adaptation,
      estimate,
      budget,
    }, null, 2));
    return;
  }

  if (command === "annotate") {
    const artifactPath = flags.get("--artifact");
    if (!artifactPath) throw new DirectContractError("artifact_required", "--artifact is required");
    let call;
    const updated = await withArtifactLock(String(artifactPath), async () => {
      const artifact = await readObservedArtifact(String(artifactPath));
      if (!artifact) throw new DirectContractError("invalid_artifact", "Artifact is not observed_calls.v1");
      const requestedIndex = Number(flags.get("--index") ?? -1);
      const index = requestedIndex < 0 ? artifact.observed_calls.length + requestedIndex : requestedIndex;
      call = artifact.observed_calls[index];
      if (!call) throw new DirectContractError("invalid_artifact_index", `No observed call at index ${requestedIndex}`);
      const status = String(flags.get("--status") ?? "");
      if (!["failed", "rejected"].includes(status)) throw new DirectContractError("invalid_status", "--status may only downgrade an observed call to failed or rejected");
      const missingFields = jsonFlag(flags, "--missing-fields", call.missing_fields ?? []);
      if (!Array.isArray(missingFields)) throw new DirectContractError("invalid_missing_fields", "--missing-fields must be a JSON array");
      call.status = status;
      call.missing_fields = missingFields;
      call.trace = { ...call.trace, status, missing_fields: missingFields };
      const nextArtifact = createObservedCallsArtifact({
        skill: artifact.skill,
        caseId: artifact.case_id ?? null,
        calls: artifact.observed_calls,
        recordedAt: artifact.recorded_at ?? new Date().toISOString(),
      });
      await writeArtifact(String(artifactPath), nextArtifact);
      return nextArtifact;
    });
    console.log(JSON.stringify({ observed_call: call, observed_call_count: updated.observed_call_count }, null, 2));
    return;
  }

  const skill = String(flags.get("--skill") ?? "qveris-direct");
  const caseId = flags.get("--case-id") === undefined ? null : String(flags.get("--case-id"));
  const artifactPath = flags.get("--artifact");
  if (!artifactPath) throw new DirectContractError("artifact_required", "--artifact is required for observed-call integrity");
  const existingArtifact = await readObservedArtifact(String(artifactPath));
  const observedCalls = existingArtifact?.observed_calls ?? [];
  const timeoutMs = Number(flags.get("--timeout-ms") ?? (command === "execute" ? 120_000 : 30_000));
  const apiKey = process.env.QVERIS_API_KEY;
  const budgetInput = requiredBudget(flags);
  let requestKind;
  let query = null;
  let toolId = flags.get("--tool-id") ?? null;
  let searchId = flags.get("--search-id") ?? null;
  let params = null;
  let validation = null;
  let request;

  if (command === "search") {
    requestKind = "search";
    query = String(flags.get("--query") ?? "").trim();
    if (!query) throw new DirectContractError("query_required", "--query is required");
    enforceDirectBudget({ budget: budgetInput, estimate: { calls: 1, credits: 0, rows: 0, billable_quantity: 0 }, observedCalls });
    request = () => requestJson("/search", { apiKey, body: { query, limit: Number(flags.get("--limit") ?? 10) }, timeoutMs });
  } else if (command === "inspect") {
    requestKind = "tools/by-ids";
    if (!toolId) throw new DirectContractError("tool_id_required", "--tool-id is required");
    enforceDirectBudget({ budget: budgetInput, estimate: { calls: 1, credits: 0, rows: 0, billable_quantity: 0 }, observedCalls });
    request = () => requestJson("/tools/by-ids", { apiKey, body: { tool_ids: [toolId], ...(searchId ? { search_id: searchId } : {}) }, timeoutMs });
  } else if (command === "execute") {
    requestKind = "tools/execute";
    if (!toolId || !searchId) throw new DirectContractError("tool_pair_required", "--tool-id and --search-id are required");
    const adaptation = adaptDirectParameters({ parameters: jsonFlag(flags, "--params"), schema: requiredJsonFlag(flags, "--schema"), enumMaps: jsonFlag(flags, "--enum-maps", {}) });
    params = adaptation.final_parameters;
    validation = requiredJsonFlag(flags, "--validation");
    const estimate = estimateDirectBudget(requiredJsonFlag(flags, "--estimate"));
    enforceDirectBudget({ budget: budgetInput, estimate, observedCalls });
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
    const outcome = validateDirectResponse({ requestKind, payload, validation, params, observedAt });
    const missingFields = outcome.reason_code ? [outcome.reason_code] : [];
    const billing = payload?.billing ?? { cost: payload?.cost ?? null };
    const usage = summarizeObservedUsage([{ request_kind: requestKind, billing, response: payload }]);
    let call = createObservedCall({
      requestKind,
      query,
      toolId,
      params,
      status: outcome.status,
      searchId,
      fallbackUsed: flags.has("--fallback"),
      missingFields,
      response: payload,
      observedAt,
      elapsedMs,
      billing,
      usage,
      validation: {
        kind: validation?.kind ?? null,
        status: outcome.status,
        reason_code: outcome.reason_code,
        evidence: compactValidationEvidence(outcome.evidence),
      },
    });
    let postflightError = null;
    try {
      enforceDirectBudget({
        budget: budgetInput,
        estimate: { calls: 0, credits: 0, rows: 0, billable_quantity: 0 },
        observedCalls: [...observedCalls, call],
      });
    } catch (error) {
      if (error?.code !== "budget_limited") throw error;
      postflightError = error;
      call = createObservedCall({
        requestKind,
        query,
        toolId,
        params,
        status: "rejected",
        searchId,
        fallbackUsed: flags.has("--fallback"),
        missingFields: ["actual_budget_exceeded"],
        response: payload,
        observedAt,
        elapsedMs,
        billing,
        usage,
        validation: { kind: validation?.kind ?? null, status: "rejected", reason_code: "actual_budget_exceeded", budget: error.details },
      });
    }
    const artifact = await appendObservedCall(String(artifactPath), { skill, caseId, call });
    console.log(JSON.stringify({ response: call.response, observed_call: call, observed_call_count: artifact.observed_call_count }, null, 2));
    if (postflightError) {
      postflightError.recorded = true;
      throw postflightError;
    }
  } catch (error) {
    if (error?.recorded) throw error;
    const timeout = error?.timeout ?? null;
    const call = createObservedCall({ requestKind, query, toolId, params, status: "failed", searchId, fallbackUsed: flags.has("--fallback"), missingFields: [timeout?.reason_code ?? error?.code ?? "request_failed"], response: { error: error?.message ?? String(error), timeout }, observedAt, timeout });
    await appendObservedCall(String(artifactPath), { skill, caseId, call });
    throw error;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  if (!relaunchWithEnvProxyIfNeeded()) {
    runCli(process.argv.slice(2)).catch((error) => {
      console.error(JSON.stringify(sanitizeDirectResponse({ code: error?.code ?? "runtime_error", message: error?.message ?? String(error), details: error?.details ?? null, timeout: error?.timeout ?? null })));
      process.exit(1);
    });
  }
}
