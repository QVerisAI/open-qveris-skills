const DATE_FIELDS = ["date", "observation_date", "timestamp", "published_at", "as_of"];
const VALUE_FIELDS = ["value", "close", "level", "rate", "price", "index_value"];
const NAME_FIELDS = ["indicator_name", "name", "series_name", "benchmark", "metric", "symbol"];
const INDEX_ALIASES = Object.freeze({
  SPX: new Set(["SPX", "GSPCINDX", "GSPC"]),
  CSI300: new Set(["CSI300", "000300SH", "000300"]),
});
const COUNTRY_ALIASES = Object.freeze({
  US: new Set(["US", "USA", "UNITEDSTATES", "UNITEDSTATESOFAMERICA"]),
  CN: new Set(["CN", "CHN", "CHINA", "中国"]),
  HK: new Set(["HK", "HKG", "HONGKONG", "香港"]),
  EU: new Set(["EU", "EUROAREA", "EUROZONE"]),
  GB: new Set(["GB", "UK", "GBR", "UNITEDKINGDOM"]),
  JP: new Set(["JP", "JPN", "JAPAN", "日本"]),
});
const COUNTRY_CURRENCY = Object.freeze({ US: "USD", CN: "CNY", HK: "HKD", EU: "EUR", GB: "GBP", JP: "JPY", SG: "SGD" });

export const DEFAULT_MAX_AGE = Object.freeze({
  macro: "P400D",
  rates: "P120D",
  market: "P7D",
});

export function normalizeMaxAge(value = DEFAULT_MAX_AGE) {
  const merged = { ...DEFAULT_MAX_AGE, ...(value ?? {}) };
  for (const [key, duration] of Object.entries(merged)) {
    if (!/^P(?=\d|T)(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?)?$/.test(String(duration))) {
      throw new Error(`maxAge.${key} must be a simple ISO-8601 duration`);
    }
  }
  return merged;
}

function durationMs(value) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(value);
  if (!match) return Number.NaN;
  return ((Number(match[1] ?? 0) * 24 + Number(match[2] ?? 0)) * 60 + Number(match[3] ?? 0)) * 60 * 1000;
}

function payloadData(response) {
  return response?.result?.data ?? response?.data ?? null;
}

function records(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
  if (!value || typeof value !== "object") return [];
  for (const key of ["rows", "items", "records", "results", "data"]) {
    if (Array.isArray(value[key])) return records(value[key]);
  }
  return [value];
}

function first(row, fields) {
  for (const field of fields) {
    if (row?.[field] !== undefined && row[field] !== null && row[field] !== "") return row[field];
  }
  return null;
}

function observationDate(row) {
  const value = first(row, DATE_FIELDS);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function numericValue(row) {
  const raw = first(row, VALUE_FIELDS);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return null;
}

function normalizedText(value) {
  return value == null ? "" : String(value).trim().toUpperCase();
}

function compactText(value) {
  return normalizedText(value).replace(/[^A-Z0-9\u4e00-\u9fff]/g, "");
}

function filterRequestedRows(inputRows, purpose, params) {
  let filtered = [...inputRows];
  const country = normalizedText(params.country ?? params.geography ?? params.region);
  if (country) {
    const aliases = COUNTRY_ALIASES[country] ?? new Set([compactText(country)]);
    const withCountry = filtered.filter((row) => row.country != null || row.region != null);
    if (withCountry.length > 0) filtered = withCountry.filter((row) => aliases.has(compactText(row.country ?? row.region)));
    else {
      const expectedCurrency = COUNTRY_CURRENCY[country];
      const withCurrency = filtered.filter((row) => row.currency != null);
      if (expectedCurrency && withCurrency.length > 0) filtered = withCurrency.filter((row) => normalizedText(row.currency) === expectedCurrency);
    }
  }
  const requestedIndicator = compactText(params.indicator_name);
  if (requestedIndicator) {
    const aliases = requestedIndicator === "CPI" ? ["CPI", "CONSUMERPRICE"] : [requestedIndicator];
    filtered = filtered.filter((row) => {
      const name = compactText(first(row, NAME_FIELDS));
      return aliases.some((alias) => name.includes(alias));
    });
  }
  if (purpose === "commodity" && params.commodity_name) {
    const requested = compactText(params.commodity_name);
    filtered = filtered.filter((row) => {
      const name = compactText(first(row, NAME_FIELDS) ?? row.symbol);
      return name.includes(requested) || requested.includes(name);
    });
  }
  const exact = params.date ? Date.parse(params.date) : null;
  const start = params.start_date ? Date.parse(params.start_date) : null;
  const end = params.end_date ? Date.parse(params.end_date) + 86400000 - 1 : null;
  if (exact !== null || start !== null || end !== null) {
    filtered = filtered.filter((row) => {
      const date = observationDate(row);
      if (!date) return false;
      const timestamp = Date.parse(date);
      if (exact !== null) return timestamp >= exact && timestamp < exact + 86400000;
      return (start === null || timestamp >= start) && (end === null || timestamp <= end);
    });
  }
  return filtered;
}

function seriesKey(row) {
  return [
    normalizedText(first(row, NAME_FIELDS)),
    normalizedText(row.country ?? row.region),
    normalizedText(row.frequency ?? row.interval),
    normalizedText(row.unit),
  ].join("|");
}

function normalizedRowsForPurpose(rows, purpose, params) {
  if (purpose === "employment") {
    return rows.flatMap((row) => [
      ["unemployment_rate", "decimal"],
      ["total_employment", "reported_count"],
      ["participation_rate", "decimal"],
    ].filter(([field]) => Number.isFinite(Number(row[field]))).map(([field, unit]) => ({
      ...row, indicator_name: field, value: Number(row[field]), unit: row.unit ?? unit,
    })));
  }
  if (purpose === "real_estate") {
    return rows.flatMap((row) => [
      ["home_price_index", "index"],
      ["housing_starts", "reported_count"],
      ["home_sales", "reported_count"],
      ["housing_inventory", "reported_count"],
      ["mortgage_rate", "decimal"],
      ["price_to_income_ratio", "ratio"],
    ].filter(([field]) => Number.isFinite(Number(row[field]))).map(([field, unit]) => ({
      ...row, indicator_name: field, value: Number(row[field]), unit: row.unit ?? unit,
    })));
  }
  if (purpose === "fx_context") {
    const unit = params.base_currency && params.quote_currency ? `${params.quote_currency}/${params.base_currency}` : "spot_rate";
    return rows.map((row) => ({ ...row, indicator_name: row.symbol ?? row.name ?? "fx_spot", value: numericValue(row), unit: row.unit ?? unit }));
  }
  if (purpose === "index_context") {
    return rows.map((row) => ({ ...row, indicator_name: row.symbol ?? "index_level", value: numericValue(row), unit: row.unit ?? "index_points" }));
  }
  return rows;
}

export function compareSeries(inputRows) {
  const usable = records(inputRows)
    .map((row) => ({ row, date: observationDate(row), value: numericValue(row), key: seriesKey(row) }))
    .filter((item) => item.date && item.value !== null && item.key.split("|")[0]);
  const groups = new Map();
  for (const item of usable) groups.set(item.key, [...(groups.get(item.key) ?? []), item]);
  const comparable = [...groups.entries()]
    .map(([key, items]) => [key, items.sort((a, b) => a.date.localeCompare(b.date))])
    .filter(([, items]) => new Set(items.map((item) => item.date)).size >= 2)
    .sort((a, b) => b[1].at(-1).date.localeCompare(a[1].at(-1).date));
  if (comparable.length === 0) {
    return { status: usable.length === 1 ? "snapshot" : "unsupported", reason: "No two aligned observations with matching series, geography, frequency, and unit." };
  }
  const [key, items] = comparable[0];
  const current = items.at(-1);
  const baseline = [...items].reverse().find((item) => item.date !== current.date);
  const status = current.value > baseline.value ? "increased" : current.value < baseline.value ? "decreased" : "unchanged";
  return {
    status,
    reason: "Descriptive comparison only; direction does not imply improvement, deterioration, or causality.",
    series_basis: key,
    baseline_as_of: baseline.date,
    baseline_value: baseline.value,
    current_as_of: current.date,
    current_value: current.value,
  };
}

export function assessCurveProxy(inputRows) {
  const usable = records(inputRows).map((row) => ({
    row,
    date: observationDate(row),
    tenor: normalizedText(row.tenor ?? row.maturity ?? row.term),
    value: numericValue(row),
    basis: [normalizedText(row.country), normalizedText(row.currency), normalizedText(row.unit), normalizedText(row.benchmark)].join("|"),
  })).filter((item) => item.date && item.tenor && item.value !== null);
  const groups = new Map();
  for (const item of usable) {
    const key = `${item.date}|${item.basis}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const match = [...groups.values()].find((items) => new Set(items.map((item) => item.tenor)).size >= 2);
  if (!match) return { status: "unsupported", reason: "At least two distinct tenors on the same date and measurement basis are required." };
  return {
    status: "observed",
    as_of: match[0].date,
    points: match.map((item) => ({ tenor: item.tenor, value: item.value })),
    reason: "Observed benchmark-tenor proxy only; it is not a complete sovereign yield curve.",
  };
}

function freshnessIssue(rows, now, maxAge) {
  const nowMs = Date.parse(now);
  const limit = durationMs(maxAge);
  if (Number.isNaN(nowMs) || Number.isNaN(limit)) return "freshness_not_evaluable";
  const dates = rows.map(observationDate).filter(Boolean).map(Date.parse);
  if (dates.length === 0) return "observation_date_missing";
  if (nowMs - Math.max(...dates) > limit) return "latest_observation_stale";
  return null;
}

function geographyMismatch(rows, params) {
  const expected = normalizedText(params.country ?? params.geography ?? params.region);
  if (!expected) return false;
  const observed = rows.map((row) => normalizedText(row.country ?? row.region)).filter(Boolean);
  return observed.length > 0 && !observed.some((value) => value === expected || value.includes(expected) || expected.includes(value));
}

function reject(issues, extra = {}) {
  return { semantic_status: "rejected", semantic_issues: [...new Set(issues)], evidence: { accepted_observations: 0, comparison: { status: "unsupported" }, change_claim: "unsupported", ...extra } };
}

export function assessMacroExecution({
  purpose,
  params = {},
  response,
  maxAge = DEFAULT_MAX_AGE,
  now = new Date().toISOString(),
} = {}) {
  if (response?.success !== true) return reject(["transport_or_cap_failure"]);
  if (response?.result?.data == null && (typeof response?.result?.truncated_content === "string" || response?.result?.full_content_file_url)) {
    return reject([`${purpose}_payload_truncated`]);
  }
  const rawRows = records(payloadData(response));
  if (rawRows.length === 0) return reject([`${purpose}_payload_empty`]);
  const requestedRows = filterRequestedRows(rawRows, purpose, params);
  if (requestedRows.length === 0) return reject([`${purpose}_requested_slice_empty`]);
  const rows = normalizedRowsForPurpose(requestedRows, purpose, params);
  const issues = [];
  if (geographyMismatch(rows, params)) issues.push(`${purpose}_geography_mismatch`);
  const normalizedAge = normalizeMaxAge(maxAge);
  const ageClass = ["policy_rate", "government_rates", "interbank_rates"].includes(purpose) ? "rates"
    : ["fx_context", "index_context"].includes(purpose) ? "market" : "macro";
  const stale = freshnessIssue(rows, now, normalizedAge[ageClass]);
  if (stale) issues.push(`${purpose}_${stale}`);
  const substantive = rows.filter((row) => observationDate(row) && numericValue(row) !== null);
  if (substantive.length === 0) issues.push(`${purpose}_dated_numeric_observation_missing`);
  if (purpose === "macro_indicators" && !rows.some((row) => first(row, NAME_FIELDS))) issues.push("macro_indicator_name_missing");
  if (purpose === "commodity" && params.commodity_name) {
    const requested = normalizedText(params.commodity_name);
    const names = rows.map((row) => normalizedText(first(row, NAME_FIELDS) ?? row.symbol)).filter(Boolean);
    if (names.length > 0 && !names.some((name) => name.includes(requested) || requested.includes(name))) issues.push("commodity_identity_mismatch");
  }
  if (purpose === "interbank_rates" && params.rate_type) {
    const requested = normalizedText(params.rate_type);
    const names = rows.map((row) => normalizedText(row.name ?? row.rate_type ?? row.benchmark)).filter(Boolean);
    if (names.length > 0 && !names.some((name) => name.includes(requested))) issues.push("interbank_rate_type_mismatch");
  }
  if (purpose === "fx_context") {
    const requested = normalizedText(`${params.base_currency ?? ""}${params.quote_currency ?? ""}`).replace(/[^A-Z]/g, "");
    const symbols = rows.map((row) => normalizedText(row.symbol ?? row.name)).map((value) => value.replace(/[^A-Z]/g, "")).filter(Boolean);
    if (requested && symbols.length > 0 && !symbols.some((symbol) => symbol.includes(requested))) issues.push("fx_pair_mismatch");
  }
  if (purpose === "index_context") {
    const requested = normalizedText(params.symbol).replace(/[^A-Z0-9]/g, "");
    const symbols = rows.map((row) => normalizedText(row.symbol ?? row.ticker)).map((value) => value.replace(/[^A-Z0-9]/g, "")).filter(Boolean);
    const acceptedAliases = INDEX_ALIASES[requested] ?? new Set([requested]);
    if (requested && symbols.length > 0 && !symbols.some((symbol) => acceptedAliases.has(symbol))) issues.push("index_symbol_mismatch");
    const types = rows.map((row) => normalizedText(row.asset_type ?? row.security_type ?? row.instrument_type)).filter(Boolean);
    if (types.length > 0 && !types.some((value) => value.includes("INDEX"))) issues.push("index_asset_type_mismatch");
  }
  if (issues.length > 0) return reject(issues);
  const comparison = compareSeries(substantive);
  return {
    semantic_status: "accepted",
    semantic_issues: [],
    evidence: {
      accepted_observations: substantive.length,
      latest_observation: substantive.map(observationDate).sort().at(-1),
      comparison,
      change_claim: ["increased", "decreased", "unchanged"].includes(comparison.status) ? "descriptive_only" : "unsupported",
      improvement_claim: "unsupported",
      deterioration_claim: "unsupported",
      ...(purpose === "government_rates" ? { curve_proxy: assessCurveProxy(substantive) } : {}),
    },
  };
}

export function assessMacroWorkflow({ executions = [] } = {}) {
  const accepted = executions.filter((item) => item.semantic_status === "accepted");
  const macroPurposes = new Set(["macro_indicators", "employment", "real_estate", "commodity"]);
  const ratePurposes = new Set(["policy_rate", "government_rates", "interbank_rates"]);
  const macroAccepted = accepted.filter((item) => macroPurposes.has(item.purpose));
  const ratesAccepted = accepted.filter((item) => ratePurposes.has(item.purpose));
  const broadMacroAccepted = macroAccepted.some((item) => item.purpose === "macro_indicators");
  let fallbackMode = "limited";
  if (macroAccepted.length > 0 && ratesAccepted.length > 0) fallbackMode = broadMacroAccepted ? "complete" : "complete_with_macro_fallback";
  else if (macroAccepted.length > 0) fallbackMode = "macro_only";
  else if (ratesAccepted.length > 0) fallbackMode = "rates_only";
  const curve = ratesAccepted.find((item) => item.purpose === "government_rates")?.evidence?.curve_proxy ?? { status: "unsupported", reason: "No accepted same-basis multi-tenor rate evidence." };
  return {
    semantic_status: accepted.length > 0 ? "accepted" : "rejected",
    fallback_mode: fallbackMode,
    macro_layers_accepted: macroAccepted.map((item) => item.purpose),
    rates_layers_accepted: ratesAccepted.map((item) => item.purpose),
    curve_proxy: curve,
    policy_transmission: {
      status: "unsupported",
      reason: ratesAccepted.length === 0
        ? "No accepted rates evidence; policy transmission cannot be assessed."
        : "The available observations do not identify a causal policy-transmission effect; report co-movement context only.",
    },
    regime_label: {
      status: "unsupported",
      reason: "No hard-coded semantic map converts heterogeneous macro directions into improvement, deterioration, risk-on, or risk-off.",
    },
  };
}
