import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("news sentiment runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-news-"));
  const output = path.join(dir, "report.md");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-news-sentiment-radar/scripts/run.mjs",
    "--fixture",
    "qveris-news-sentiment-radar/fixtures/normal-news-sentiment.json",
    "--output",
    output,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const report = readFileSync(output, "utf8");
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  assert.match(report, /News Sentiment Radar/);
  assert.match(report, /Paid calls: 2/);
  assert.equal(traceJson.skill_id, "qveris-news-sentiment-radar");
});
