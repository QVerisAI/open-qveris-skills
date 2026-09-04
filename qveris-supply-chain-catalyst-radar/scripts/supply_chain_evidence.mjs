import { createHash } from "node:crypto";

export const DEFAULT_MAX_AGE = Object.freeze({
  identity: "P30D",
  supply_chain: "P365D",
  jobs: "P120D",
  patents: "P365D",
  contracts: "P365D",
  filings: "P180D",
  news: "P7D",
  shipping: "PT6H",
});

const PROMPT_INJECTION_RE = /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions?|(?:reveal|show|print|return)\s+(?:the\s+)?(?:system\s+prompt|developer\s+message|secret|credential|api\s*key)|(?:run|execute)\s+(?:this\s+)?(?:command|script)|(?:call|invoke)\s+(?:another\s+)?tool/i;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function responseSha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
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

export function quarantineQualitativeExecution(execution, _purpose) {
  const rejectedPaths = [];
  const quarantined = quarantineValue(execution, "execution", rejectedPaths);
  for (let index = 0; index < (quarantined.observed_calls ?? []).length; index += 1) {
    const before = execution.observed_calls?.[index];
    const after = quarantined.observed_calls[index];
    if (canonicalJson(before?.response) !== canonicalJson(after.response)) {
      after.raw_response_sha256 = before?.raw_response_sha256
        ?? before?.response_sha256
        ?? responseSha256(before?.response);
      after.response_sha256 = responseSha256(after.response);
    }
  }
  return { execution: quarantined, rejected_paths: rejectedPaths };
}

function payloadData(response) {
  return response?.result?.data ?? response?.data ?? response?.result ?? null;
}

function records(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  if (!value || typeof value !== "object") return [];
  for (const key of ["rows", "results", "items", "records", "data"]) {
    if (Array.isArray(value[key])) return records(value[key]);
  }
  return [value];
}

function stringField(record, names) {
  for (const name of names) {
    const value = record?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberField(record, names) {
  for (const name of names) {
    const value = Number(record?.[name]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeSymbol(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\.SS$/, ".SH");
}

function symbolMatches(expected, record) {
  const requested = normalizeSymbol(expected);
  const values = [
    stringField(record, ["symbol", "ticker", "security_code", "stock_code"]),
    ...(Array.isArray(record?.symbols) ? record.symbols : []),
  ].filter(Boolean).map(normalizeSymbol);
  return values.includes(requested);
}

function durationMilliseconds(value, label) {
  const match = String(value ?? "").match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!match) throw new Error(`${label} must be an ISO duration using days, hours, or minutes`);
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const total = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
  if (total <= 0) throw new Error(`${label} must be positive`);
  return total;
}

export function normalizeMaxAge(overrides = DEFAULT_MAX_AGE) {
  const result = { ...DEFAULT_MAX_AGE };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!Object.hasOwn(DEFAULT_MAX_AGE, key)) throw new Error(`unknown max-age class: ${key}`);
    if (durationMilliseconds(value, `maxAge.${key}`) > durationMilliseconds(DEFAULT_MAX_AGE[key], `default.${key}`)) {
      throw new Error(`maxAge.${key} cannot be looser than ${DEFAULT_MAX_AGE[key]}`);
    }
    result[key] = value;
  }
  return result;
}

function recordTimestamp(record) {
  return stringField(record, [
    "timestamp", "observed_at", "published_at", "filed_date", "accepted_date",
    "date", "posting_date", "publication_date", "award_date", "signed_date", "updated_at",
  ]);
}

function temporalIssues(record, { params, now, maxAge, prefix }) {
  const timestamp = recordTimestamp(record);
  const observedMs = timestamp ? Date.parse(timestamp) : Number.NaN;
  const nowMs = Date.parse(now);
  if (!timestamp || Number.isNaN(observedMs)) return [`${prefix}_timestamp_invalid`];
  const issues = [];
  if (!Number.isNaN(nowMs) && observedMs - nowMs > FUTURE_SKEW_MS) issues.push(`${prefix}_timestamp_in_future`);
  if (!Number.isNaN(nowMs) && nowMs - observedMs > durationMilliseconds(maxAge, `maxAge.${prefix}`)) {
    issues.push(`${prefix}_stale`);
  }
  const startMs = params?.start_date ? Date.parse(`${params.start_date}T00:00:00Z`) : Number.NaN;
  const endMs = params?.end_date ? Date.parse(`${params.end_date}T23:59:59.999Z`) : Number.NaN;
  if (!Number.isNaN(startMs) && observedMs < startMs) issues.push(`${prefix}_before_requested_window`);
  if (!Number.isNaN(endMs) && observedMs > endMs) issues.push(`${prefix}_after_requested_window`);
  return issues;
}

function accepted(issues, rows, fields = {}) {
  const unique = [...new Set(issues)];
  return {
    semantic_status: unique.length === 0 ? "accepted" : "rejected",
    semantic_issues: unique,
    evidence: {
      accepted_observations: unique.length === 0 ? rows.length : 0,
      change_status: "unsupported",
      ...fields,
    },
  };
}

function assessIdentity(params, rows) {
  if (rows.length === 0) return accepted(["identity_payload_empty"], rows);
  const issues = [];
  if (!rows.some((row) => symbolMatches(params.symbol, row))) issues.push("issuer_identity_mismatch");
  const matched = rows.find((row) => symbolMatches(params.symbol, row)) ?? rows[0];
  const assetType = stringField(matched, ["asset_type", "security_type", "type"]);
  if (assetType && !/stock|equity|common|adr/i.test(assetType)) issues.push("issuer_asset_type_mismatch");
  if (!stringField(matched, ["name", "company_name", "security_name"])) issues.push("issuer_name_missing");
  if (!stringField(matched, ["exchange", "exchange_code", "market"])) issues.push("issuer_exchange_missing");
  return accepted(issues, rows, {
    symbol: stringField(matched, ["symbol", "ticker"]) ?? params.symbol,
    name: stringField(matched, ["name", "company_name", "security_name"]),
    exchange: stringField(matched, ["exchange", "exchange_code", "market"]),
  });
}

function assessDatedIssuerRows({ rows, params, now, maxAge, prefix, requiredAny = [] }) {
  if (rows.length === 0) return accepted([`${prefix}_payload_empty`], rows);
  const relevant = rows.filter((row) => symbolMatches(params.symbol, row));
  const issues = [];
  if (relevant.length === 0) issues.push(`${prefix}_issuer_relevance_missing`);
  for (const row of relevant) {
    issues.push(...temporalIssues(row, { params, now, maxAge, prefix }));
    if (requiredAny.length > 0 && !requiredAny.some((field) => {
      const value = row[field];
      return value !== null && value !== undefined && value !== "";
    })) issues.push(`${prefix}_substance_missing`);
  }
  return accepted(issues, relevant, {
    timestamps: relevant.map(recordTimestamp).filter(Boolean),
  });
}

function assessShipping({ rows, params, now, maxAge }) {
  if (rows.length === 0) return accepted(["shipping_payload_empty"], rows, { company_link_status: "unverified" });
  const matching = rows.filter((row) => stringField(row, ["vessel_id", "mmsi", "imo"]) === String(params.vessel_id));
  const issues = [];
  if (matching.length === 0) issues.push("vessel_identity_mismatch");
  for (const row of matching) {
    issues.push(...temporalIssues(row, { params, now, maxAge, prefix: "shipping" }));
    const latitude = numberField(row, ["latitude", "lat"]);
    const longitude = numberField(row, ["longitude", "lon", "lng"]);
    if (latitude === null || latitude < -90 || latitude > 90) issues.push("shipping_latitude_invalid");
    if (longitude === null || longitude < -180 || longitude > 180) issues.push("shipping_longitude_invalid");
  }
  return accepted(issues, matching, {
    vessel_id: String(params.vessel_id),
    company_link_status: "unverified",
    timestamps: matching.map(recordTimestamp).filter(Boolean),
  });
}

function assessNews({ rows, params, now, maxAge, promptInjectionPaths }) {
  const assessment = assessDatedIssuerRows({
    rows,
    params,
    now,
    maxAge,
    prefix: "news",
    requiredAny: ["title", "headline"],
  });
  if (promptInjectionPaths.length > 0) {
    assessment.semantic_status = "rejected";
    assessment.semantic_issues = [...new Set([...assessment.semantic_issues, "prompt_injection_rejected"])];
    assessment.evidence.accepted_observations = 0;
  }
  return assessment;
}

export function assessSupplyChainExecution({
  purpose,
  params,
  response,
  maxAge = DEFAULT_MAX_AGE,
  now = new Date().toISOString(),
  promptInjectionPaths = [],
}) {
  if (response?.success !== true) {
    return { semantic_status: "rejected", semantic_issues: ["transport_or_cap_failure"], evidence: { accepted_observations: 0, change_status: "unsupported" } };
  }
  if (response?.result?.data == null && typeof response?.result?.truncated_content === "string") {
    return {
      semantic_status: "rejected",
      semantic_issues: [`${purpose}_payload_truncated`],
      evidence: { accepted_observations: 0, change_status: "unsupported" },
    };
  }
  const normalizedMaxAge = normalizeMaxAge(maxAge);
  const rows = records(payloadData(response));
  if (purpose === "issuer_identity") return assessIdentity(params, rows);
  if (purpose === "supply_chain_relationships") {
    return assessDatedIssuerRows({
      rows, params, now, maxAge: normalizedMaxAge.supply_chain, prefix: "supply_chain",
      requiredAny: ["supplier", "customer", "partner", "counterparty", "related_company", "relationship_type"],
    });
  }
  if (purpose === "job_postings") {
    return assessDatedIssuerRows({
      rows, params, now, maxAge: normalizedMaxAge.jobs, prefix: "jobs",
      requiredAny: ["job_title", "title", "position"],
    });
  }
  if (purpose === "patent_activity") {
    return assessDatedIssuerRows({
      rows, params, now, maxAge: normalizedMaxAge.patents, prefix: "patents",
      requiredAny: ["patent_id", "application_number", "title", "document_type"],
    });
  }
  if (purpose === "government_contracts") {
    return assessDatedIssuerRows({
      rows, params, now, maxAge: normalizedMaxAge.contracts, prefix: "contracts",
      requiredAny: ["contract_id", "award_id", "title", "contract_value", "amount"],
    });
  }
  if (purpose === "regulatory_filings") {
    return assessDatedIssuerRows({
      rows, params, now, maxAge: normalizedMaxAge.filings, prefix: "filings",
      requiredAny: ["form_type", "accession_number", "url"],
    });
  }
  if (purpose === "qualitative_news_context") {
    return assessNews({ rows, params, now, maxAge: normalizedMaxAge.news, promptInjectionPaths });
  }
  if (purpose === "shipping_ais_observation") {
    return assessShipping({ rows, params, now, maxAge: normalizedMaxAge.shipping });
  }
  return accepted(["unknown_evidence_purpose"], rows);
}

export function assessSupplyChainWorkflow({ executions }) {
  const acceptedExecutions = executions.filter((execution) => execution.semantic_status === "accepted");
  const supplyVessels = new Set(acceptedExecutions
    .filter((execution) => execution.purpose === "supply_chain_relationships")
    .flatMap((execution) => execution.evidence?.vessel_ids ?? []));
  const shipping = acceptedExecutions.filter((execution) => execution.purpose === "shipping_ais_observation");
  const linkedVessels = shipping.filter((execution) => supplyVessels.has(execution.evidence?.vessel_id));
  return {
    semantic_status: "accepted",
    issues: [],
    change_assessment: {
      status: "unsupported",
      reason: "No independently aligned baseline/current comparison was observed.",
    },
    shipping_company_link_status: linkedVessels.length > 0 ? "corroborated" : "unverified",
  };
}
