import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCredits, getUsageHistory, getCreditsLedger } from "../scripts/qveris_client.mjs";

const cli = new URL("../scripts/qveris_tool.mjs", import.meta.url).href;

function runCli(args, payload = {}) {
  const script = `
    globalThis.fetch = async () => new Response(${JSON.stringify(JSON.stringify(payload))});
    process.argv = [process.execPath, 'qveris_tool.mjs', ...${JSON.stringify(args)}];
    await import(${JSON.stringify(cli)});
  `;
  return spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { ...process.env, QVERIS_API_KEY: "test-key", QVERIS_BASE_URL: "https://qveris.ai/api/v1" },
  });
}

test("help distinguishes external audit commands and preserves CAP commands", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /cap-list/);
  assert.match(result.stdout, /cap-query/);
  assert.match(result.stdout, /this script has no usage-history, ledger, or export commands/);
  assert.match(result.stdout, /separate QVeris CLI: qveris usage --mode search --execution-id/);
});

test("call keeps pre-settlement billing and names the external settlement audit command", () => {
  const result = runCli(["call", "weather.sample", "--discovery-id", "search-1"], {
    success: true, execution_id: "exec-1", elapsed_time_ms: 10,
    billing: { list_amount_credits: 3 }, result: { weather: "sunny" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 credits pre-settlement/);
  assert.match(result.stdout, /separate QVeris CLI: qveris usage --mode search --execution-id exec-1 --json/);
});

test("audit library helpers coexist with the mainline client and keep request filters", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: new URL(url), options });
    return new Response(JSON.stringify({ ok: true }));
  });
  await getCredits({ apiKey: "test-key" });
  await getUsageHistory({ apiKey: "test-key", query: { execution_id: "exec-1", limit: 5 } });
  await getCreditsLedger({ apiKey: "test-key", query: { direction: "consume", limit: 5 } });
  assert.deepEqual(requests.map(r => r.url.pathname), ["/api/v1/auth/credits", "/api/v1/auth/usage/history/v2", "/api/v1/auth/credits/ledger"]);
  assert.ok(requests.every(r => r.options.method === "GET"));
  assert.equal(requests[1].url.searchParams.get("execution_id"), "exec-1");
  assert.equal(requests[2].url.searchParams.get("direction"), "consume");
});

test("audit guidance does not grant local filesystem access or promise bundled exports", async () => {
  const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(skill, /filesystem_write: false/);
  assert.match(skill, /filesystem_read: false/);
  for (const source of [skill, readme]) {
    assert.match(source, /qveris usage --mode search --execution-id/);
    assert.match(source, /(?:does not expose|has no) usage-history, ledger, or export commands/);
    assert.match(source, /(?:already authorizes|host-authorized|host already authorizes)/);
  }
});
