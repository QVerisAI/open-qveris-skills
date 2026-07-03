import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchema } from "../../qveris-finance-common/schema-validator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("quant factor runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-factor-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-quant-factor-screen/scripts/run.mjs",
    "--fixture",
    "qveris-quant-factor-screen/fixtures/normal-factor-screen.json",
    "--output",
    output,
    "--json-output",
    jsonOutput,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-quant-factor-screen/schemas/output.schema.json"), "utf8"));
  assert.match(report, /Quant Factor Screen/);
  assert.match(report, /factor_set/);
  assert.equal(traceJson.skill_id, "qveris-quant-factor-screen");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-quant-factor-screen");
  assert.equal(businessOutput.result.ranking_ready, false);
});
