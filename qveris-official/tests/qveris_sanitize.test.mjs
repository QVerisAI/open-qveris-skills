import assert from "node:assert/strict";
import test from "node:test";

import {
  isLikelyLegacyFinanceRouteIdentifier,
  isSensitiveMetadataKey,
  sanitizeProviderRouteMetadata,
} from "../scripts/qveris_sanitize.mjs";

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
