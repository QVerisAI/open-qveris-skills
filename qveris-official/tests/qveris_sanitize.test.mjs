import assert from "node:assert/strict";
import test from "node:test";

import {
  isLikelyLegacyFinanceRouteIdentifier,
  isSensitiveMetadataKey,
  sanitizeProviderRouteMetadata,
} from "../scripts/qveris_sanitize.mjs";
import { createHash } from "node:crypto";

function hash(value) {
  const canonicalize = (item) => Array.isArray(item)
    ? item.map(canonicalize)
    : item && typeof item === "object"
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonicalize(item[key])]))
      : item;
  return createHash("sha256").update(JSON.stringify(canonicalize(value)), "utf8").digest("hex");
}

test("recognizes legacy finance routes without blocking generic tool routes", () => {
  for (const route of [
    "mcp_gildata.asharelivequote.v1",
    "cn_financial_pro.adjusted_price.v1",
    "caidazi.news.query.v1.e76b9116",
    "finnhub.company_profile.v1",
  ]) {
    assert.equal(isLikelyLegacyFinanceRouteIdentifier(route), true, route);
  }
  assert.equal(
    isLikelyLegacyFinanceRouteIdentifier("openweathermap.weather.execute.v1"),
    false,
  );
  assert.equal(
    isLikelyLegacyFinanceRouteIdentifier("qveris_finance.mkt_l1_rt"),
    false,
  );
  assert.equal(isLikelyLegacyFinanceRouteIdentifier("MKT.L1.RT"), false);
});

test("detects provider and routing metadata keys recursively", () => {
  for (const key of [
    "provider",
    "source_provider",
    "provider-id",
    "route",
    "routing_decision",
    "candidate",
    "candidates_tried",
    "failover_log",
    "source_tool_id",
    "cap_tool_id",
    "private_key",
    "seed_phrase",
    "mnemonic",
    "signing_key",
    "wallet_credential",
    "full_content_file_url",
  ]) {
    assert.equal(isSensitiveMetadataKey(key), true, key);
  }
  assert.equal(isSensitiveMetadataKey("symbol"), false);
  assert.equal(isSensitiveMetadataKey("market"), false);
});

test("removes sensitive metadata at every nesting level", () => {
  const sanitized = sanitizeProviderRouteMetadata({
    execution_id: "real-id",
    parameters: {
      symbol: "600519.SH",
      nested: { provider: "hidden", route: "hidden", candidate: "hidden", limit: 5 },
    },
    _meta: {
      capability_id: "REF.SYMBOLOGY",
      routing_decision: { candidates: [{ provider_id: "hidden", tool_id: "hidden" }] },
      failover_log: ["hidden"],
    },
  });

  assert.deepEqual(sanitized, {
    execution_id: "real-id",
    parameters: { symbol: "600519.SH", nested: { limit: 5 } },
    _meta: { capability_id: "REF.SYMBOLOGY" },
  });
});

test("redacts raw finance routes and provider API URLs in string values", () => {
  const sanitized = sanitizeProviderRouteMetadata({
    raw_route: "removed by key",
    endpoint: "failed route cn_financial_pro.adjusted_price.v1 during retry",
    links: [
      "https://finnhub.io/api/v1/stock/profile2?symbol=NVDA",
      "https://example.com/issuer-news",
    ],
  });

  assert.deepEqual(sanitized, {
    endpoint: "failed route [redacted_internal_route] during retry",
    links: ["[redacted_provider_url]", "https://example.com/issuer-news"],
  });
});

test("removes cached result URLs and redacts signed download URLs in strings", () => {
  const sanitized = sanitizeProviderRouteMetadata({
    full_content_file_url: "https://cache.example/result.json?OSSAccessKeyId=id&Signature=secret",
    message: "download https://cache.example/result.json?X-Amz-Credential=id&X-Amz-Signature=secret",
    public_url: "https://example.com/public-report",
  });

  assert.deepEqual(sanitized, {
    message: "download [redacted_signed_download_url]",
    public_url: "https://example.com/public-report",
  });
});

test("rehashes sanitized observed responses while preserving the raw response hash", () => {
  const response = {
    result: {
      data: [{ symbol: "AAPL" }],
      full_content_file_url: "https://cache.example/result.json?OSSAccessKeyId=id&Signature=secret",
    },
  };
  const originalHash = hash(response);
  const sanitized = sanitizeProviderRouteMetadata({ response, response_sha256: originalHash });

  assert.equal(sanitized.raw_response_sha256, originalHash);
  assert.equal(sanitized.response_sha256, hash(sanitized.response));
  assert.equal(Object.hasOwn(sanitized.response.result, "full_content_file_url"), false);
});
