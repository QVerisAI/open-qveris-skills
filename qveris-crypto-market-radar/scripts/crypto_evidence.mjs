import { createHash } from "node:crypto";

export const DEFAULT_MAX_AGE = Object.freeze({
  spot: "PT15M",
  history: "P1D",
  rankings: "PT15M",
  market_mood: "P1D",
  whale: "PT1H",
  news_social: "P1D",
});
const ISO_DURATION_RE = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function durationMilliseconds(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be an ISO-8601 duration string`);
  }
  const match = value.match(ISO_DURATION_RE);
  if (!match || match.slice(1).every((part) => part === undefined)) {
    throw new Error(`${label} must use an unambiguous ISO-8601 week/day/time duration`);
  }
  const [weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0] = match
    .slice(1)
    .map((part) => part === undefined ? 0 : Number(part));
  return (((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60000 + seconds * 1000;
}

export function normalizeMaxAge(maxAge) {
  if (!maxAge || typeof maxAge !== "object" || Array.isArray(maxAge)) {
    throw new Error("maxAge must be an object keyed by evidence class");
  }
  const unknown = Object.keys(maxAge).filter((key) => !Object.hasOwn(DEFAULT_MAX_AGE, key));
  if (unknown.length > 0) {
    throw new Error(`maxAge contains unknown evidence classes: ${unknown.join(", ")}`);
  }
  const normalized = { ...DEFAULT_MAX_AGE };
  for (const [key, value] of Object.entries(maxAge)) {
    const requestedMs = durationMilliseconds(value, `maxAge.${key}`);
    const defaultMs = durationMilliseconds(DEFAULT_MAX_AGE[key], `default maxAge.${key}`);
    if (requestedMs > defaultMs) {
      throw new Error(`maxAge.${key} must be equal to or stricter than ${DEFAULT_MAX_AGE[key]}`);
    }
    normalized[key] = value;
  }
  return normalized;
}

function payloadData(response) {
  return response?.result?.data ?? response?.data ?? null;
}

function firstRecord(value) {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") ?? null;
  if (!value || typeof value !== "object") return null;
  for (const key of ["rows", "items", "results", "data"]) {
    if (Array.isArray(value[key])) {
      return value[key].find((item) => item && typeof item === "object") ?? null;
    }
  }
  return value;
}

function records(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  if (!value || typeof value !== "object") return [];
  for (const key of ["rows", "items", "results", "data", "bars", "candles"]) {
    if (Array.isArray(value[key])) return value[key].filter((item) => item && typeof item === "object");
  }
  return [value];
}

function stringField(record, names) {
  for (const name of names) {
    if (typeof record?.[name] === "string" && record[name].trim()) return record[name].trim();
  }
  return null;
}

function numberField(record, names) {
  for (const name of names) {
    const value = record?.[name];
    if (value !== null && value !== undefined && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return null;
}

function normalizePair(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s/_-]+/g, "-");
}

function symbolMatches(requested, record) {
  const symbol = stringField(record, ["symbol", "ticker", "code", "asset_symbol", "base_asset", "base"]);
  if (symbol && normalizePair(symbol) === normalizePair(requested)) return true;
  const pair = stringField(record, ["pair", "market", "instrument"]);
  if (!pair) return false;
  const requestedPair = normalizePair(requested);
  const returnedPair = normalizePair(pair);
  if (requestedPair.includes("-")) return returnedPair === requestedPair;
  return returnedPair.split("-")[0] === requestedPair;
}

function quoteCurrencyFromRecord(record, requestedSymbol) {
  const explicit = stringField(record, ["quote_currency", "quote_asset", "currency", "quote"]);
  if (explicit) return explicit.toUpperCase();
  const returnedPair = stringField(record, ["pair", "market", "instrument", "symbol", "ticker"]);
  if (!returnedPair || !requestedSymbol) return null;
  const requestedBase = normalizePair(requestedSymbol).split("-")[0];
  const normalizedReturned = normalizePair(returnedPair);
  const returnedParts = normalizedReturned.split("-");
  if (returnedParts.length > 1 && returnedParts[0] === requestedBase) {
    return returnedParts.slice(1).join("-");
  }
  const compactReturned = normalizedReturned.replaceAll("-", "");
  if (compactReturned.startsWith(requestedBase) && compactReturned.length > requestedBase.length) {
    return compactReturned.slice(requestedBase.length);
  }
  return null;
}

function contractMatches(requested, returned) {
  if (!returned) return false;
  if (/^0x[0-9a-f]{40}$/i.test(requested)) {
    return requested.toLowerCase() === returned.toLowerCase();
  }
  return requested === returned;
}

function assessIdentity(params, response) {
  const record = firstRecord(payloadData(response));
  if (!record) return { semantic_status: "rejected", semantic_issues: ["identity_payload_empty"] };
  const issues = [];
  if (params.contract_address) {
    const returnedContract = stringField(record, ["contract_address", "contract", "address", "token_address"]);
    if (!contractMatches(params.contract_address, returnedContract)) issues.push("identity_contract_mismatch");
    const returnedChain = stringField(record, ["chain", "network", "blockchain"]);
    if (!returnedChain || returnedChain.toLowerCase() !== params.chain.toLowerCase()) {
      issues.push("identity_chain_mismatch");
    }
  } else if (!symbolMatches(params.symbol, record)) {
    issues.push("identity_symbol_mismatch");
  }
  const assetType = stringField(record, ["asset_type", "type", "instrument_type"]);
  if (assetType && !/(?:crypto|digital|coin|token)/i.test(assetType)) {
    issues.push("identity_asset_type_mismatch");
  }
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: params.contract_address ? {
      contract_address: stringField(record, ["contract_address", "contract", "address", "token_address"]),
      chain: stringField(record, ["chain", "network", "blockchain"]),
      asset_type: stringField(record, ["asset_type", "type", "instrument_type"]),
    } : {
      symbol: stringField(record, ["symbol", "ticker", "code", "asset_symbol", "base_asset", "base", "pair", "instrument"]),
      asset_type: stringField(record, ["asset_type", "type", "instrument_type"]),
    },
  };
}

function assessSpot(params, response, maxAge, now) {
  const record = firstRecord(payloadData(response));
  if (!record) return { semantic_status: "rejected", semantic_issues: ["spot_payload_empty"] };
  const issues = [];
  const price = numberField(record, ["price", "last_price", "last", "close", "spot_price"]);
  if (price === null || price <= 0) issues.push("spot_price_invalid");
  const quoteCurrency = quoteCurrencyFromRecord(record, params.symbol);
  if (!quoteCurrency) issues.push("spot_quote_currency_missing");
  const freshness = freshnessIssue(record, maxAge.spot, now, "spot");
  if (freshness.issue) issues.push(freshness.issue);
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: {
      price,
      timestamp: freshness.timestamp,
      quote_currency: quoteCurrency ?? null,
      accepted_observations: issues.length === 0 ? 1 : 0,
    },
  };
}

function assessHistory(params, response, maxAge, now, requestedParams = params, requestedObservations = null) {
  const rows = records(payloadData(response));
  if (rows.length === 0) {
    return {
      semantic_status: "rejected",
      semantic_issues: ["history_payload_empty"],
      evidence: { accepted_observations: 0, timestamps: [], quote_currencies: [] },
    };
  }
  const issues = [];
  if (requestedParams.interval !== undefined
    && String(params.interval ?? "").toLowerCase() !== String(requestedParams.interval).toLowerCase()) {
    issues.push("history_interval_not_transmitted");
  }
  for (const name of ["start_date", "end_date"]) {
    if (requestedParams[name] !== undefined && params[name] !== requestedParams[name]) {
      issues.push(`history_${name}_not_transmitted`);
    }
  }
  const timestampValues = rows.map((row) => stringField(row, ["timestamp", "time", "datetime", "date"]));
  const timestamps = timestampValues.map((value) => value ? Date.parse(value) : Number.NaN);
  let chronologicalTimestampValues = timestampValues.filter(Boolean);
  if (timestamps.some(Number.isNaN)) {
    issues.push("history_timestamp_invalid");
  } else {
    if (new Set(timestamps).size !== timestamps.length) issues.push("history_duplicate_timestamps");
    const strictlyAscending = timestamps.every((value, index) => index === 0 || value > timestamps[index - 1]);
    const strictlyDescending = timestamps.every((value, index) => index === 0 || value < timestamps[index - 1]);
    if (!strictlyAscending && !strictlyDescending) {
      issues.push("history_not_strictly_ordered");
    }
    chronologicalTimestampValues = timestampValues
      .map((value, index) => ({ value, timestamp: timestamps[index] }))
      .sort((left, right) => left.timestamp - right.timestamp)
      .map(({ value }) => value);
  }
  let invalidOhlc = false;
  for (const row of rows) {
    const open = numberField(row, ["open", "o"]);
    const high = numberField(row, ["high", "h"]);
    const low = numberField(row, ["low", "l"]);
    const close = numberField(row, ["close", "c", "price"]);
    if (close === null || close <= 0) {
      invalidOhlc = true;
      continue;
    }
    if ([open, high, low].some((value) => value !== null)) {
      if ([open, high, low].some((value) => value === null || value <= 0)
        || high < Math.max(open, close)
        || low > Math.min(open, close)
        || high < low) {
        invalidOhlc = true;
      }
    }
  }
  if (invalidOhlc) issues.push("history_ohlc_invalid");
  const quoteCurrencies = [...new Set(rows
    .map((row) => quoteCurrencyFromRecord(row, requestedParams.symbol ?? params.symbol))
    .filter(Boolean)
    .map((value) => value.toUpperCase()))];
  if (quoteCurrencies.length === 0) issues.push("history_quote_currency_missing");
  if (quoteCurrencies.length > 1) issues.push("history_quote_currency_inconsistent");
  if (rows.length < 2) issues.push("history_too_thin");
  if (Number.isInteger(requestedObservations) && rows.length < requestedObservations) {
    issues.push("history_window_incomplete");
  }
  const finiteTimestamps = timestamps.filter(Number.isFinite);
  const latest = finiteTimestamps.length > 0 ? Math.max(...finiteTimestamps) : undefined;
  const earliest = finiteTimestamps.length > 0 ? Math.min(...finiteTimestamps) : undefined;
  if (earliest !== undefined && requestedParams.start_date
    && new Date(earliest).toISOString().slice(0, 10) > requestedParams.start_date) {
    issues.push("history_start_boundary_missing");
  }
  if (latest !== undefined && requestedParams.end_date
    && new Date(latest).toISOString().slice(0, 10) < requestedParams.end_date) {
    issues.push("history_end_boundary_missing");
  }
  const nowMs = Date.parse(now);
  if (latest !== undefined && !Number.isNaN(nowMs)) {
    if (latest - nowMs > MAX_FUTURE_CLOCK_SKEW_MS) {
      issues.push("history_timestamp_in_future");
    } else if (nowMs - latest > durationMilliseconds(maxAge.history, "maxAge.history")) {
      issues.push("history_stale");
    }
  }
  const acceptedRows = invalidOhlc || timestamps.some(Number.isNaN)
    ? 0
    : rows.length;
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: {
      accepted_observations: acceptedRows,
      timestamps: chronologicalTimestampValues,
      quote_currencies: quoteCurrencies,
      start: chronologicalTimestampValues.at(0) ?? null,
      end: chronologicalTimestampValues.at(-1) ?? null,
    },
  };
}

function analyticsSampleFloor(record) {
  const indicator = (stringField(record, ["indicator", "name", "type"]) ?? "").toUpperCase();
  const period = numberField(record, ["period", "lookback", "window", "length"]);
  if (indicator.includes("MACD") || Object.hasOwn(record, "macd")) {
    const slow = numberField(record, ["slow_period", "slow"]) ?? 26;
    const signal = numberField(record, ["signal_period", "signal"]) ?? 9;
    return slow + signal;
  }
  if (indicator.includes("RSI") || Object.hasOwn(record, "rsi")) return (period ?? 14) + 1;
  if (indicator.includes("ATR") || Object.hasOwn(record, "atr")) return (period ?? 14) + 1;
  if (indicator.includes("STOCH") || Object.hasOwn(record, "stoch")) return (period ?? 14) + 1;
  if (indicator.includes("CCI") || Object.hasOwn(record, "cci")) return period ?? 20;
  if (indicator.includes("BBAND") || Object.hasOwn(record, "bbands")) return period ?? 20;
  if (indicator.includes("SMA") || Object.hasOwn(record, "sma")) return period ?? 20;
  if (indicator.includes("EMA") || Object.hasOwn(record, "ema")) return period ?? 20;
  return null;
}

function assessAnalytics(response, maxAge, now) {
  const rows = records(payloadData(response));
  if (rows.length === 0) return { semantic_status: "rejected", semantic_issues: ["analytics_payload_empty"] };
  const issues = [];
  for (const row of rows) {
    const floor = analyticsSampleFloor(row);
    const sampleSize = numberField(row, ["sample_size", "observation_count", "observations", "valid_count"]);
    if (floor !== null && sampleSize === null) {
      issues.push("analytics_sample_size_missing");
    } else if (floor !== null && sampleSize < floor) {
      issues.push("analytics_sample_insufficient");
    }
  }
  const freshness = freshnessIssue(rows.at(-1), maxAge.history, now, "analytics");
  if (freshness.issue) issues.push(freshness.issue);
  const uniqueIssues = [...new Set(issues)];
  return {
    semantic_status: uniqueIssues.length === 0 ? "accepted" : "rejected",
    semantic_issues: uniqueIssues,
    evidence: { accepted_observations: uniqueIssues.length === 0 ? rows.length : 0, timestamp: freshness.timestamp },
  };
}

function freshnessIssue(record, maxAgeValue, now, prefix) {
  const timestamp = stringField(record, ["timestamp", "time", "datetime", "date", "as_of", "updated_at", "event_time", "published_at"]);
  const observedMs = timestamp ? Date.parse(timestamp) : Number.NaN;
  const nowMs = Date.parse(now);
  if (!timestamp || Number.isNaN(observedMs)) return { issue: `${prefix}_timestamp_invalid`, timestamp: null };
  if (!Number.isNaN(nowMs)) {
    if (observedMs - nowMs > MAX_FUTURE_CLOCK_SKEW_MS) {
      return { issue: `${prefix}_timestamp_in_future`, timestamp };
    }
    if (nowMs - observedMs > durationMilliseconds(maxAgeValue, `maxAge.${prefix}`)) {
      return { issue: `${prefix}_stale`, timestamp };
    }
  }
  return { issue: null, timestamp };
}

function assessRankings(params, response, maxAge, now) {
  const data = payloadData(response);
  const rows = records(data);
  if (rows.length === 0) return { semantic_status: "rejected", semantic_issues: ["rankings_payload_empty"] };
  const first = rows[0];
  const issues = [];
  if (numberField(first, ["rank", "position", "ranking"]) === null && !params.mode) issues.push("rankings_rank_missing");
  const dimension = stringField(first, ["ranking_dimension", "dimension", "metric", "sort_by", "basis"])
    ?? stringField(data, ["ranking_dimension", "dimension", "metric", "sort_by", "basis"])
    ?? params.mode;
  if (!dimension) issues.push("rankings_dimension_missing");
  const universe = stringField(first, ["universe", "scope", "market"])
    ?? stringField(data, ["universe", "scope", "market"])
    ?? params.market;
  if (!universe) issues.push("rankings_universe_missing");
  const freshness = freshnessIssue(first, maxAge.rankings, now, "rankings");
  if (freshness.issue) issues.push(freshness.issue);
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: {
      accepted_observations: issues.length === 0 ? rows.length : 0,
      timestamp: freshness.timestamp,
      ranking_dimension: dimension ?? null,
      universe: universe ?? null,
      quote_currency: params.quote_currency ?? null,
    },
  };
}

function assessMarketMood(params, response, maxAge, now) {
  const record = firstRecord(payloadData(response));
  if (!record) return { semantic_status: "rejected", semantic_issues: ["market_mood_payload_empty"] };
  const issues = [];
  const value = numberField(record, ["value", "score", "index"]);
  const label = stringField(record, ["label", "classification", "sentiment"]);
  if (value === null && !label) issues.push("market_mood_value_missing");
  const scale = stringField(record, ["scale", "range", "scale_label"]);
  if (!scale) issues.push("market_mood_scale_missing");
  const sourceWindow = stringField(record, ["window", "period", "source_window", "lookback"]);
  const requestedWindow = sourceWindow
    ?? (params.date ? "daily" : params.start_date && params.end_date ? `${params.start_date}/${params.end_date}` : null);
  if (!requestedWindow) issues.push("market_mood_window_missing");
  const freshness = freshnessIssue(record, maxAge.market_mood, now, "market_mood");
  if (freshness.issue) issues.push(freshness.issue);
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: {
      timestamp: freshness.timestamp,
      source_window: requestedWindow,
      accepted_observations: issues.length === 0 ? 1 : 0,
    },
  };
}

function assessWhale(response, maxAge, now) {
  const rows = records(payloadData(response));
  if (rows.length === 0) return { semantic_status: "rejected", semantic_issues: ["whale_payload_empty"] };
  const issues = [];
  const identifiers = [];
  for (const row of rows) {
    const amount = numberField(row, ["amount", "quantity", "native_amount", "value"]);
    if (amount === null || amount <= 0) issues.push("whale_amount_invalid");
    if (!stringField(row, ["unit", "asset", "symbol", "currency"])) issues.push("whale_unit_missing");
    if (!stringField(row, ["event_type", "activity_type", "type", "direction"])) issues.push("whale_activity_type_missing");
    const identifier = stringField(row, ["transaction_hash", "tx_hash", "event_id", "id"]);
    if (identifier) identifiers.push(identifier);
    const freshness = freshnessIssue(row, maxAge.whale, now, "whale");
    if (freshness.issue) issues.push(freshness.issue);
  }
  if (new Set(identifiers).size !== identifiers.length) issues.push("whale_duplicate_events");
  const uniqueIssues = [...new Set(issues)];
  return {
    semantic_status: uniqueIssues.length === 0 ? "accepted" : "rejected",
    semantic_issues: uniqueIssues,
    evidence: { accepted_observations: uniqueIssues.length === 0 ? rows.length : 0 },
  };
}

const PROMPT_INJECTION_RE = /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions?|(?:reveal|show|print|return)\s+(?:the\s+)?(?:system\s+prompt|developer\s+message|secret|credential|api\s*key)|(?:run|execute)\s+(?:this\s+)?(?:command|script)|(?:call|invoke)\s+(?:another\s+)?tool|(?:sign|broadcast|submit)\s+(?:a\s+)?transaction|(?:send|transfer)\s+funds/i;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function responseSha256(response) {
  return createHash("sha256").update(canonicalJson(response), "utf8").digest("hex");
}

function quarantineValue(value, path, rejectedPaths) {
  if (Array.isArray(value)) {
    return value.map((item, index) => quarantineValue(item, `${path}[${index}]`, rejectedPaths));
  }
  if (typeof value === "string") {
    if (PROMPT_INJECTION_RE.test(value)) {
      rejectedPaths.push(path);
      return "[prompt_injection_rejected]";
    }
    return value;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    quarantineValue(child, `${path}.${key}`, rejectedPaths),
  ]));
}

export function quarantineQualitativeExecution(execution, purpose) {
  if (purpose !== "qualitative_news_context" && purpose !== "qualitative_social_context") {
    return { execution, rejected_paths: [] };
  }
  const rejectedPaths = [];
  const quarantined = quarantineValue(execution, "execution", rejectedPaths);
  for (let index = 0; index < (quarantined.observed_calls ?? []).length; index += 1) {
    const originalCall = execution.observed_calls?.[index];
    const call = quarantined.observed_calls[index];
    if (canonicalJson(originalCall?.response) !== canonicalJson(call.response)) {
      call.raw_response_sha256 = originalCall?.raw_response_sha256
        ?? originalCall?.response_sha256
        ?? responseSha256(originalCall?.response);
      call.response_sha256 = responseSha256(call.response);
    }
  }
  return { execution: quarantined, rejected_paths: rejectedPaths };
}

function assessQualitative(params, response, maxAge, now, promptInjectionPaths, prefix) {
  const rows = records(payloadData(response));
  if (rows.length === 0) return { semantic_status: "rejected", semantic_issues: [`${prefix}_payload_empty`] };
  const issues = [];
  if (promptInjectionPaths.length > 0) issues.push("prompt_injection_rejected");
  const relevant = rows.some((row) => !params.symbol || symbolMatches(params.symbol, row));
  if (!relevant) issues.push(`${prefix}_asset_relevance_missing`);
  const freshness = freshnessIssue(rows[0], maxAge.news_social, now, prefix);
  if (freshness.issue) issues.push(freshness.issue);
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    semantic_issues: issues,
    evidence: { accepted_observations: issues.length === 0 ? rows.length : 0, timestamp: freshness.timestamp },
  };
}

export function assessCryptoExecution({
  purpose,
  params,
  requestedParams = params,
  requestedObservations = null,
  response,
  maxAge = DEFAULT_MAX_AGE,
  now,
  promptInjectionPaths = [],
}) {
  if (response?.success !== true) {
    return { semantic_status: "rejected", semantic_issues: ["transport_or_cap_failure"] };
  }
  if (purpose === "asset_identity" || purpose === "displayed_asset_identity") {
    return assessIdentity(params, response);
  }
  if (purpose === "spot_snapshot" || purpose === "displayed_asset_spot") {
    return assessSpot(params, response, maxAge, now);
  }
  if (purpose === "requested_window_history") {
    return assessHistory(params, response, maxAge, now, requestedParams, requestedObservations);
  }
  if (purpose === "descriptive_technical_context") {
    return assessAnalytics(response, maxAge, now);
  }
  if (purpose === "cross_sectional_rankings") {
    return assessRankings(params, response, maxAge, now);
  }
  if (purpose === "market_wide_mood") {
    return assessMarketMood(params, response, maxAge, now);
  }
  if (purpose === "whale_activity") {
    return assessWhale(response, maxAge, now);
  }
  if (purpose === "qualitative_news_context") {
    return assessQualitative(params, response, maxAge, now, promptInjectionPaths, "news");
  }
  if (purpose === "qualitative_social_context") {
    return assessQualitative(params, response, maxAge, now, promptInjectionPaths, "social");
  }
  return { semantic_status: "accepted", semantic_issues: [] };
}

export function assessCryptoWorkflow({ workflow, executions }) {
  const accepted = executions.filter((execution) => execution.semantic_status === "accepted");
  const quoteCurrencies = [...new Set(accepted.flatMap((execution) => [
    execution.evidence?.quote_currency,
    ...(execution.evidence?.quote_currencies ?? []),
  ]).filter(Boolean))];
  const issues = [];
  if (workflow === "multi_asset_comparison") {
    if (quoteCurrencies.length > 1) issues.push("comparison_quote_currency_mismatch");
    const historyWindows = accepted
      .filter((execution) => execution.purpose === "requested_window_history")
      .map((execution) => JSON.stringify(execution.evidence?.timestamps ?? []));
    if (new Set(historyWindows).size > 1) issues.push("comparison_window_misaligned");
  } else if (quoteCurrencies.length > 1) {
    issues.push("asset_quote_currency_mismatch");
  }
  return {
    semantic_status: issues.length === 0 ? "accepted" : "rejected",
    issues,
    quote_currencies: quoteCurrencies,
  };
}
