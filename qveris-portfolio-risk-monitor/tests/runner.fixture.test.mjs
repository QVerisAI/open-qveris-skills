import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("portfolio risk runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-portfolio-"));
  const output = path.join(dir, "report.md");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-portfolio-risk-monitor/scripts/run.mjs",
    "--fixture",
    "qveris-portfolio-risk-monitor/fixtures/normal-portfolio-risk.json",
    "--output",
    output,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const report = readFileSync(output, "utf8");
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  assert.match(report, /Portfolio Risk Monitor/);
  assert.match(report, /Largest non-cash holding/);
  assert.equal(traceJson.skill_id, "qveris-portfolio-risk-monitor");
});
