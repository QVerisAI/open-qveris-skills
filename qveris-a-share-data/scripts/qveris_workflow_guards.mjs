import { pathToFileURL } from "node:url";

export const WORKFLOW_GUARD_VERSION = "qveris.finance-workflow-guards.v1";

const DAY_MS = 86_400_000;

export function effectiveCutoff(input = {}) {
  const t0 = input.t0 ?? input.T0;
  const cut_off = input.cut_off ?? input.cutoff ?? input.CUT_OFF;
  const as_of_date = input.as_of_date ?? input.AS_OF;
  const primary = [
    ["T0", t0],
    ["CUT_OFF", cut_off],
  ].filter(([, value]) => present(value));
  const candidates = (primary.length > 0 ? primary : [["AS_OF", as_of_date]])
    .filter(([, value]) => present(value))
    .map(([source, value]) => ({
      source,
      value,
      time: inclusiveContextTime(value),
      intraday: hasIntradayPrecision(value),
    }));
  if (candidates.length === 0 || candidates.some((entry) => !Number.isFinite(entry.time))) {
    return rejected("temporal_context_missing", "T0/CUT_OFF is missing or invalid");
  }
  const earliest = candidates.reduce((left, right) => left.time <= right.time ? left : right);
  return accepted({
    effective_cutoff: new Date(earliest.time).toISOString(),
    effective_cutoff_ms: earliest.time,
    source: earliest.source,
    intraday: earliest.intraday,
  });
}

export function validateTemporalEvidence(input = {}) {
  const timestamps = input.timestamps ?? [];
  const t0 = input.t0 ?? input.T0;
  const cut_off = input.cut_off ?? input.cutoff ?? input.CUT_OFF;
  const as_of_date = input.as_of_date ?? input.AS_OF;
  const allow_future_through = input.allow_future_through;
  const require_intraday_timestamp = input.require_intraday_timestamp === true;
  const context = effectiveCutoff({ t0, cut_off, as_of_date });
  if (context.status !== "accepted") return context;
  const records = timestamps.map((entry, index) => normalizeTimestampEntry(entry, index));
  if (records.length === 0) return rejected("semantic_date_missing", "evidence has no verifiable timestamp");
  const invalid = records.filter((record) => !Number.isFinite(record.time));
  if (invalid.length > 0) {
    return rejected("semantic_date_invalid", "evidence contains an invalid timestamp", {
      invalid_fields: invalid.map((record) => record.field),
    });
  }
  if (require_intraday_timestamp && context.intraday && !records.some((record) => record.intraday)) {
    return rejected(
      "semantic_timestamp_missing",
      "intraday cutoff cannot be enforced from date-only evidence",
      { effective_cutoff: context.effective_cutoff },
    );
  }
  const horizon = present(allow_future_through) ? inclusiveContextTime(allow_future_through) : NaN;
  const allowedEnd = Number.isFinite(horizon)
    ? Math.max(context.effective_cutoff_ms, horizon)
    : context.effective_cutoff_ms;
  const future = records.filter((record) => record.time > allowedEnd);
  if (future.length > 0) {
    return rejected("semantic_future_data", "evidence is later than the effective cutoff", {
      effective_cutoff: context.effective_cutoff,
      future_fields: future.map((record) => ({ field: record.field, value: record.value })),
    });
  }
  return accepted({
    effective_cutoff: context.effective_cutoff,
    timestamp_count: records.length,
    latest_timestamp: new Date(Math.max(...records.map((record) => record.time))).toISOString(),
  });
}

export function validateIdentityEvidence({ expected_symbol, expected_name, expected_market, records = [] } = {}) {
  if (!present(expected_symbol) && !present(expected_name)) {
    return rejected("semantic_entity_context_missing", "expected symbol or issuer name is required");
  }
  if (!Array.isArray(records) || records.length === 0) {
    return rejected("semantic_entity_missing", "entity-scoped evidence is empty");
  }
  const expectedName = normalizeIdentity(expected_name);
  const failures = [];
  for (const [index, record] of records.entries()) {
    const symbol = firstPresent(record, ["symbol", "ticker", "code", "security_code"]);
    const name = firstPresent(record, ["name", "company_name", "issuer_name", "security_name"]);
    const market = firstPresent(record, ["market", "market_code", "country", "exchange"]);
    const symbolMatches = present(expected_symbol) && present(symbol) && symbolsEquivalent(symbol, expected_symbol);
    const nameMatches = expectedName && present(name) && normalizeIdentity(name) === expectedName;
    if (!symbolMatches && !nameMatches) {
      failures.push({ index, reason_code: present(symbol) || present(name) ? "semantic_entity_mismatch" : "semantic_entity_missing" });
      continue;
    }
    if (present(expected_market) && !marketMatches(market, symbol, expected_market)) {
      failures.push({ index, reason_code: present(market) ? "semantic_market_mismatch" : "semantic_market_missing" });
    }
  }
  if (failures.length > 0) {
    return rejected(failures[0].reason_code, "one or more evidence rows lack matching entity/market proof", { failures });
  }
  return accepted({ record_count: records.length, expected_symbol: expected_symbol ?? null, expected_market: expected_market ?? null });
}

export function validateFiscalEvidence({ fiscal_year, fiscal_period, statement_basis, records = [] } = {}) {
  if (!present(fiscal_year) && !present(fiscal_period) && !present(statement_basis)) {
    return rejected("semantic_period_context_missing", "requested fiscal year/period/basis is required");
  }
  if (!Array.isArray(records) || records.length === 0) {
    return rejected("semantic_period_missing", "financial evidence is empty");
  }
  const failures = [];
  for (const [index, record] of records.entries()) {
    const labels = ["period", "fiscal_period", "reporting_period", "period_type"]
      .map((field) => record?.[field]).filter(present).map(normalizePeriod);
    const ends = [record?.period_end, record?.report_date, record?.end_date].filter(present).map(String);
    const years = [record?.fiscal_year, ...labels, ...ends]
      .map((value) => String(value).match(/(?:19|20)\d{2}/)?.[0]).filter(Boolean);
    if (present(fiscal_year) && (years.length === 0 || years.some((year) => year !== String(fiscal_year)))) {
      failures.push({ index, reason_code: years.length === 0 ? "semantic_period_missing" : "semantic_period_mismatch" });
      continue;
    }
    if (present(fiscal_period) && !periodProofMatches({ fiscal_period, fiscal_year, labels, ends })) {
      failures.push({ index, reason_code: labels.length === 0 && ends.length === 0 ? "semantic_period_missing" : "semantic_period_mismatch" });
      continue;
    }
    if (present(statement_basis)) {
      const actual = firstPresent(record, ["statement_basis", "period_basis", "basis", "accumulation_basis"]);
      if (!present(actual)) {
        failures.push({ index, reason_code: "semantic_period_basis_missing" });
        continue;
      }
      if (normalizeBasis(actual) !== normalizeBasis(statement_basis)) {
        failures.push({ index, reason_code: "semantic_period_basis_mismatch" });
      }
    }
  }
  if (failures.length > 0) {
    return rejected(failures[0].reason_code, "financial rows do not prove the requested period and basis", { failures });
  }
  return accepted({ record_count: records.length, fiscal_year: fiscal_year ?? null, fiscal_period: fiscal_period ?? null });
}

export function adjacentReturns({ prices = [] } = {}) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return rejected("insufficient_observations", "at least two price observations are required");
  }
  const rows = prices.map((entry, index) => typeof entry === "number"
    ? { index, date: null, close: entry }
    : { index, date: entry?.date ?? entry?.trade_date ?? null, close: Number(entry?.close ?? entry?.price) });
  if (rows.some((row) => !Number.isFinite(row.close) || row.close <= 0)) {
    return rejected("invalid_price_observation", "all prices must be finite and positive");
  }
  const datedRows = rows.filter((row) => present(row.date));
  if (datedRows.length > 0 && datedRows.length !== rows.length) {
    return rejected("invalid_price_dates", "price dates must be present on every observation or omitted from every observation");
  }
  if (datedRows.length === rows.length) {
    rows.sort((left, right) => parseTime(left.date) - parseTime(right.date));
    const dates = rows.map((row) => String(row.date));
    if (new Set(dates).size !== dates.length || rows.some((row) => !Number.isFinite(parseTime(row.date)))) {
      return rejected("invalid_price_dates", "price dates must be valid and unique");
    }
  }
  const returns = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    returns.push({
      from: previous.date,
      to: current.date,
      value: current.close / previous.close - 1,
    });
  }
  return accepted({ observation_count: rows.length, return_count: returns.length, returns });
}

export function validateComparableRanking({ rows = [], required_factors = [], minimum_rows = 2, required_window } = {}) {
  if (!Array.isArray(rows) || rows.length < minimum_rows) {
    return rejected("insufficient_ranking_universe", `at least ${minimum_rows} comparable rows are required`);
  }
  const factors = required_factors.map((factor) => typeof factor === "string"
    ? { name: factor, denominator_required: false }
    : { name: factor?.name, denominator_required: factor?.denominator_required === true });
  if (factors.length === 0 || factors.some((factor) => !present(factor.name))) {
    return rejected("ranking_factor_context_missing", "required_factors must be explicit");
  }
  const seen = new Set();
  const gaps = [];
  const windows = [];
  for (const [index, row] of rows.entries()) {
    const id = row?.symbol ?? row?.id ?? row?.name;
    if (!present(id) || seen.has(String(id))) gaps.push({ index, reason_code: "ranking_entity_invalid" });
    else seen.add(String(id));
    const window = row?.window ?? {
      start: row?.window_start ?? row?.start_date,
      end: row?.window_end ?? row?.end_date ?? row?.as_of,
    };
    if (!present(window?.start) || !present(window?.end)) gaps.push({ index, reason_code: "ranking_window_missing" });
    else windows.push(`${window.start}|${window.end}`);
    for (const factor of factors) {
      const raw = row?.factors?.[factor.name] ?? row?.[factor.name];
      const record = typeof raw === "number" ? { value: raw } : raw;
      if (!record || !Number.isFinite(Number(record.value)) || (present(record.status) && !["valid", "accepted"].includes(String(record.status)))) {
        gaps.push({ index, factor: factor.name, reason_code: "ranking_factor_missing" });
        continue;
      }
      if (factor.denominator_required && (!Number.isFinite(Number(record.denominator)) || Number(record.denominator) === 0)) {
        gaps.push({ index, factor: factor.name, reason_code: "ranking_denominator_invalid" });
      }
    }
  }
  const expectedWindow = required_window
    ? `${required_window.start}|${required_window.end}`
    : windows[0];
  if (windows.some((window) => window !== expectedWindow)) gaps.push({ reason_code: "ranking_window_mismatch" });
  if (gaps.length > 0) {
    return rejected("ranking_unsupported", "do not rank: the common universe, window, factors, or denominators are incomplete", { gaps });
  }
  return accepted({ rankable: true, row_count: rows.length, common_window: expectedWindow, factors: factors.map((factor) => factor.name) });
}

export function validateNewsSentiment(input = {}) {
  const sources = input.sources ?? [];
  const t0 = input.t0 ?? input.T0;
  const cut_off = input.cut_off ?? input.cutoff ?? input.CUT_OFF;
  const as_of_date = input.as_of_date ?? input.AS_OF;
  const acceptedSources = [];
  const excluded = [];
  for (const [index, source] of sources.entries()) {
    const finalUrl = source?.final_url ?? source?.url;
    const required = [finalUrl, source?.publisher, source?.published_at, source?.accessed_at, source?.body_sha256];
    if (required.some((value) => !present(value)) || source?.issuer_match !== true || source?.window_match !== true) {
      excluded.push({ index, reason_code: "news_source_gate_failed" });
      continue;
    }
    if (!/^https:\/\//i.test(String(finalUrl))) {
      excluded.push({ index, reason_code: "news_final_url_invalid" });
      continue;
    }
    if (!/^(?:sha256:)?[a-f0-9]{64}$/i.test(String(source.body_sha256))) {
      excluded.push({ index, reason_code: "news_body_hash_invalid" });
      continue;
    }
    const temporal = validateTemporalEvidence({
      timestamps: [{ field: "published_at", value: source.published_at }],
      t0,
      cut_off,
      as_of_date,
    });
    if (temporal.status !== "accepted") {
      excluded.push({ index, reason_code: temporal.reason_code });
      continue;
    }
    const label = String(source.sentiment ?? source.label ?? "").toLowerCase();
    if (!["positive", "negative", "mixed"].includes(label) || !present(source.text_cue ?? source.cue)) {
      excluded.push({ index, reason_code: "news_sentiment_cue_missing" });
      continue;
    }
    acceptedSources.push({
      index,
      publisher_key: normalizeIdentity(source.publisher_owner ?? source.publisher),
      body_key: String(source.body_sha256).toLowerCase().replace(/^sha256:/, ""),
      label,
      cue: source.text_cue ?? source.cue,
    });
  }
  const independent = new Map();
  const seenBodies = new Set();
  for (const source of acceptedSources) {
    if (independent.has(source.publisher_key) || seenBodies.has(source.body_key)) continue;
    independent.set(source.publisher_key, source);
    seenBodies.add(source.body_key);
  }
  if (independent.size < 2) {
    return {
      ...accepted({
        sentiment: "insufficient",
        claim_scope: "qualifying_source_sample",
        market_wide: false,
        independent_source_count: independent.size,
        excluded,
      }),
      reason_code: "insufficient_independent_news_sources",
    };
  }
  const labels = [...independent.values()].map((source) => source.label);
  const sentiment = labels.every((label) => label === "positive")
    ? "positive"
    : labels.every((label) => label === "negative") ? "negative" : "mixed";
  return accepted({
    sentiment,
    claim_scope: "qualifying_source_sample",
    market_wide: false,
    independent_source_count: independent.size,
    cues: [...independent.values()].map((source) => source.cue),
    excluded,
  });
}

function normalizeTimestampEntry(entry, index) {
  const field = typeof entry === "object" && entry !== null ? entry.field ?? `timestamp_${index}` : `timestamp_${index}`;
  const value = typeof entry === "object" && entry !== null ? entry.value : entry;
  return { field, value, time: parseTime(value), intraday: hasIntradayPrecision(value) };
}

function periodProofMatches({ fiscal_period, fiscal_year, labels, ends }) {
  const expected = normalizePeriod(fiscal_period);
  const year = String(fiscal_year ?? expected.match(/(?:19|20)\d{2}/)?.[0] ?? "");
  if (["FY", "ANNUAL", "YEAR", "YEARLY"].includes(expected) || /^FY\d{4}$/.test(expected)) {
    return labels.some((label) => ["FY", "ANNUAL", "YEAR", "YEARLY", `FY${year}`, year].includes(label))
      || ends.some((value) => new RegExp(`^${year}-12-31`).test(value));
  }
  const quarter = expected.match(/(?:((?:19|20)\d{2}))?Q([1-4])/);
  if (quarter) {
    const quarterYear = quarter[1] ?? year;
    const endByQuarter = { 1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31" };
    return labels.some((label) => label === `Q${quarter[2]}` || label === `${quarterYear}Q${quarter[2]}`)
      || ends.some((value) => value.startsWith(`${quarterYear}-${endByQuarter[quarter[2]]}`));
  }
  return labels.includes(expected) || ends.some((value) => normalizePeriod(value) === expected);
}

function firstPresent(record, fields) {
  for (const field of fields) if (present(record?.[field])) return record[field];
  return undefined;
}

function symbolsEquivalent(left, right) {
  const normalize = (value) => String(value ?? "").trim().toUpperCase().replace(/\.SS$/, ".SH");
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return true;
  const aMatch = a.match(/^(\d{6})(?:\.(SH|SZ|BJ))?$/);
  const bMatch = b.match(/^(\d{6})(?:\.(SH|SZ|BJ))?$/);
  return Boolean(aMatch && bMatch && aMatch[1] === bMatch[1] && (!aMatch[2] || !bMatch[2] || aMatch[2] === bMatch[2]));
}

function marketMatches(market, symbol, expected) {
  const normalize = (value) => {
    const text = String(value ?? "").trim().toUpperCase();
    const aliases = { CHINA: "CN", A: "CN", ASHARE: "CN", "A-SHARE": "CN", SSE: "CN", SZSE: "CN", SH: "CN", SZ: "CN", BJ: "CN" };
    return aliases[text] ?? text;
  };
  if (present(market)) return normalize(market) === normalize(expected);
  return normalize(expected) === "CN" && /\.(?:SH|SS|SZ|BJ)$/i.test(String(symbol ?? ""));
}

function normalizeIdentity(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function normalizePeriod(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeBasis(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
  if (["cumulative", "ytd", "累计", "年初至今"].includes(normalized)) return "cumulative";
  if (["singlequarter", "quarteronly", "单季", "单季度"].includes(normalized)) return "single_quarter";
  if (["annual", "fy", "year", "yearly", "年度"].includes(normalized)) return "annual";
  return normalized;
}

function parseTime(value) {
  const text = String(value ?? "").trim();
  if (/^\d{10}(?:\d{3})?$/.test(text)) {
    const numeric = Number(text);
    return text.length === 10 ? numeric * 1000 : numeric;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(`${text}T00:00:00+08:00`);
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) {
    return Date.parse(`${text.replace(" ", "T")}+08:00`);
  }
  return Date.parse(text);
}

function inclusiveContextTime(value) {
  const time = parseTime(value);
  return Number.isFinite(time) && /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? time + DAY_MS - 1 : time;
}

function hasIntradayPrecision(value) {
  return /^\d{10}(?:\d{3})?$/.test(String(value ?? "").trim())
    || /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(String(value ?? "").trim());
}

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function accepted(extra = {}) {
  return { guard_version: WORKFLOW_GUARD_VERSION, status: "accepted", reason_code: "accepted", ...extra };
}

function rejected(reason_code, reason, extra = {}) {
  return { guard_version: WORKFLOW_GUARD_VERSION, status: "rejected", reason_code, reason, ...extra };
}

const COMMANDS = {
  cutoff: effectiveCutoff,
  temporal: validateTemporalEvidence,
  identity: validateIdentityEvidence,
  fiscal: validateFiscalEvidence,
  returns: adjacentReturns,
  ranking: validateComparableRanking,
  sentiment: validateNewsSentiment,
};

async function main(argv) {
  const command = argv[0];
  const inputIndex = argv.indexOf("--input-json");
  if (!COMMANDS[command] || inputIndex < 0 || !present(argv[inputIndex + 1])) {
    throw new Error("usage: qveris_workflow_guards.mjs <cutoff|temporal|identity|fiscal|returns|ranking|sentiment> --input-json <JSON>");
  }
  const input = JSON.parse(argv[inputIndex + 1]);
  process.stdout.write(`${JSON.stringify(COMMANDS[command](input))}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
