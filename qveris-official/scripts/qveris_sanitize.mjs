const SENSITIVE_METADATA_TOKENS = new Set([
  "provider",
  "route",
  "routing",
  "candidate",
  "candidates",
  "failover",
  "credential",
  "api_key",
  "private_key",
  "seed_phrase",
  "mnemonic",
  "signing_key",
  "wallet_credential",
  "source_tool_id",
  "tool_id",
  "cap_tool_id",
  "original_order",
  "final_order",
  "full_content_file_url",
]);

const RAW_ROUTE_IDENTIFIER_RE = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+\.v\d+(?:\.[a-z0-9_-]+)*$/i;
const RAW_ROUTE_TOKEN_RE = /\b[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+\.v\d+(?:\.[a-z0-9_-]+)*\b/gi;
const FINANCE_ROUTE_HINT_RE = /(?:^|[._-])(?:mcp_gildata|gildata|cn_financial|caidazi|finnhub|yfinance|yahoo|polygon|fmp|eodhd|a_?share|ashare|stock|equity|security|quote|ohlcv|bars?|kline|market_data|fundamental|financial|valuation|earnings|cash_?flow|balance_?sheet|income_?statement|sector|concept|dragon_?tiger|northbound|top_?mover)(?:[._-]|$)/i;
const PROVIDER_API_URL_RE = /https?:\/\/[^\s|)`]*(?:finnhub|polygon|alphavantage|eodhd|financialmodelingprep|yahoo|yfinance|akshare|snowball|xueqiu|sina|alpaca|longbridge|finviz)[^\s|)`]*/gi;
const SIGNED_DOWNLOAD_URL_RE = /https?:\/\/[^\s|)`]*(?:OSSAccessKeyId|X-Amz-(?:Credential|Signature)|[?&](?:Signature|access_token|token)=)[^\s|)`]*/gi;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function responseSha256(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value)), "utf8").digest("hex");
}

export function normalizeMetadataKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isSensitiveMetadataKey(key) {
  const normalized = normalizeMetadataKey(key);
  if (SENSITIVE_METADATA_TOKENS.has(normalized)) {
    return true;
  }
  return /(^|_)(provider|route|routing|candidate|candidates|failover|credential)($|_)/.test(normalized)
    || /(^|_)(api_key|private_key|seed_phrase|mnemonic|signing_key|wallet_credential)($|_)/.test(normalized)
    || /(^|_)(source_tool_id|tool_id|cap_tool_id|original_order|final_order)($|_)/.test(normalized);
}

export function isLikelyLegacyFinanceRouteIdentifier(value) {
  const identifier = String(value ?? "").trim();
  if (!RAW_ROUTE_IDENTIFIER_RE.test(identifier)) {
    return false;
  }
  if (identifier.toLowerCase().startsWith("qveris_finance.")) {
    return false;
  }
  return FINANCE_ROUTE_HINT_RE.test(identifier);
}

export function sanitizeProviderRouteMetadata(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProviderRouteMetadata(item));
  }
  if (typeof value === "string") {
    return value
      .replace(
        RAW_ROUTE_TOKEN_RE,
        (identifier) => isLikelyLegacyFinanceRouteIdentifier(identifier)
          ? "[redacted_internal_route]"
          : identifier,
      )
      .replace(PROVIDER_API_URL_RE, "[redacted_provider_url]")
      .replace(SIGNED_DOWNLOAD_URL_RE, "[redacted_signed_download_url]");
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveMetadataKey(key)) {
      continue;
    }
    sanitized[key] = sanitizeProviderRouteMetadata(child);
  }
  if (typeof value.response_sha256 === "string" && value.response && typeof value.response === "object") {
    const sanitizedHash = responseSha256(sanitized.response);
    if (sanitizedHash !== value.response_sha256) {
      sanitized.raw_response_sha256 = value.raw_response_sha256 ?? value.response_sha256;
      sanitized.response_sha256 = sanitizedHash;
    }
  }
  return sanitized;
}
import { createHash } from "node:crypto";
