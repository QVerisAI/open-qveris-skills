import assert from "node:assert/strict";
import test from "node:test";

import {
  listCapabilities,
  QVerisHttpError,
} from "../scripts/qveris_client.mjs";

test("HTTP failures preserve status and public error code for adapter decisions", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: { code: "invalid_capability", message: "not found" } }),
    { status: 404, headers: { "content-type": "application/json" } },
  );

  await assert.rejects(
    listCapabilities({ apiKey: "test-key", domain: "finance" }),
    (error) => {
      assert.ok(error instanceof QVerisHttpError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "invalid_capability");
      assert.equal(error.method, "GET");
      assert.equal(error.path, "/capabilities");
      return true;
    },
  );
});
