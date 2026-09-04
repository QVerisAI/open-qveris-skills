import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = [
  /(?:\d[\d,]*\+\s+(?:(?:real-world|verified|API)[,\s]+)*(?:tools|capabilities|categories)|thousands of tools|真实已验证)/i,
  /(?:verified (?:tools|capabilities)|verified in production|99\.99%|<\s*500ms\s+average latency)/i,
  /(?:failures are almost always|past failures usually indicate parameter issues|more accurate than web pages|provide complete structured datasets)/i,
  /(?:available in all OpenClaw environments|comparable cost)/i,
  /(?:(?:free tier|signup|注册|免费版)[^\n]{0,80}\b100\s*(?:credits|积分)|26,250\+?\s*credits|zero prompt tokens)/i,
];

function publicCopy(source) {
  // The permission allowlist is machine metadata, not public navigation copy.
  // Keep permitted production/test hosts accurate without treating the
  // machine allowlist as user-facing navigation between sites.
  return source.replace(/^network:\n  outbound_hosts:\n(?:    - [^\n]+\n)+/m, "")
    .replace(/[`*]/g, "");
}

function violations(source, file) {
  const text = publicCopy(source);
  const hits = rules.filter((rule) => rule.test(text)).map(String);
  if (/qveris\.ai/.test(text) && /qveris\.cn/.test(text)) hits.push("mixed site references");
  if (file.startsWith("qveris-cn/") && /qveris\.ai/.test(text)) hits.push("wrong site");
  if (file.startsWith("qveris-official/") && /qveris\.cn/.test(text)) hits.push("wrong site");
  return hits;
}

test("rejects unsupported catalog, service, and fallback promises", () => {
  for (const text of ["**10,000+** verified tools", "thousands of tools", "99.99% call availability", "<500ms average latency", "Failures are almost always caused by parameters", "Available in all OpenClaw environments", "Free tier: 100 credits"]) {
    assert.ok(violations(text, "README.md").length, text);
  }
  assert.deepEqual(violations("Node.js 18+; sample success rate: 99.8%; 1,000 credits; has_last_execution; live call budget: 100 credits", "README.md"), []);
});

test("site boundaries apply to public copy without falsifying permission metadata", () => {
  assert.ok(violations("https://qveris.cn/api/v1", "qveris-official/SKILL.md").length);
  assert.ok(violations("https://qveris.ai/api/v1", "qveris-cn/skill.md").length);
  assert.ok(violations("qveris.ai and qveris.cn", "README.md").length);
  assert.deepEqual(violations("network:\n  outbound_hosts:\n    - qveris.ai\n    - qveris.cn\n\nUse https://qveris.ai", "qveris-official/SKILL.md"), []);
});

test("current public skill sources pass the copy guard", async () => {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0").filter((file) => /\.(?:md|txt)$/.test(file)
      && !/(?:^|\/)(?:dev-infra|tests?|fixtures?|historical|\.evolution)\//.test(file));
  assert.ok(files.length > 10);
  for (const file of files) assert.deepEqual(violations(await readFile(path.join(root, file), "utf8"), file), [], file);
});

test("execution history is a quality signal, not certification", async () => {
  for (const file of ["qveris-official/SKILL.md", "qveris-cn/skill.md"]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /has_last_execution.*not certification of correctness or reliability/);
    assert.match(source, /Before retrying a call that may have executed, check its outcome/);
  }
});

test("documented outbound permissions retain the pinned clients' supported hosts", async (t) => {
  const official = await import("../qveris-official/scripts/qveris_client.mjs");
  const cn = await import("../qveris-cn/scripts/qveris_client.mjs");
  const original = { ...process.env };
  t.after(() => {
    for (const key of ["QVERIS_API_KEY", "QVERIS_BASE_URL", "QVERIS_REGION"]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  delete process.env.QVERIS_BASE_URL;
  delete process.env.QVERIS_REGION;
  const source = await readFile(path.join(root, "qveris-official/SKILL.md"), "utf8");
  for (const key of ["test-key", "sk-cn-test-key"]) {
    process.env.QVERIS_API_KEY = key;
    const host = new URL(official.getBaseUrl()).hostname;
    assert.ok(source.includes(`    - ${host}\n`));
    assert.equal(host, "qveris.ai");
  }
  process.env.QVERIS_BASE_URL = "https://api.qveris.cloud/api/v1";
  assert.ok(source.includes(`    - ${new URL(official.getBaseUrl()).hostname}\n`));
  assert.equal(new URL(cn.getBaseUrl()).hostname, "qveris.cn");
});
