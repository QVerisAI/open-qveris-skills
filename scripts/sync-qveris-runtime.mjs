#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const runtimeSource = path.join(repoRoot, "qveris-finance-common", "runner.mjs");
const validatorSource = path.join(repoRoot, "qveris-finance-common", "schema-validator.mjs");
const fixtureLoaderSource = path.join(repoRoot, "qveris-finance-common", "fixture-loader.mjs");

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function candidateDirs(parent) {
  if (!(await exists(parent))) return [];
  const entries = await fs.readdir(parent, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("qveris-") && entry.name !== "qveris-finance-common")
    .map((entry) => path.join(parent, entry.name));
}

async function resolveTargets(args) {
  if (args.includes("--all") || args.length === 0) {
    const roots = await candidateDirs(repoRoot);
    const installCopies = await candidateDirs(path.join(repoRoot, "skills"));
    const all = [...roots, ...installCopies];
    const runnable = [];
    for (const dir of all) {
      if (await exists(path.join(dir, "scripts", "run.mjs"))) runnable.push(dir);
    }
    return runnable;
  }

  return args.map((arg) => {
    if (path.isAbsolute(arg)) return arg;
    const direct = path.join(repoRoot, arg);
    return direct;
  });
}

async function syncOne(skillDir) {
  const runFile = path.join(skillDir, "scripts", "run.mjs");
  if (!(await exists(runFile))) throw new Error(`${skillDir} does not contain scripts/run.mjs`);
  const libDir = path.join(skillDir, "scripts", "lib");
  await fs.mkdir(libDir, { recursive: true });
  await fs.copyFile(runtimeSource, path.join(libDir, "qveris-runtime.mjs"));
  await fs.copyFile(validatorSource, path.join(libDir, "schema-validator.mjs"));
  await fs.copyFile(fixtureLoaderSource, path.join(libDir, "fixture-loader.mjs"));
  return path.relative(repoRoot, skillDir);
}

async function main() {
  for (const source of [runtimeSource, validatorSource, fixtureLoaderSource]) {
    if (!(await exists(source))) throw new Error(`Missing source file: ${source}`);
  }
  const targets = await resolveTargets(process.argv.slice(2));
  if (!targets.length) throw new Error("No runnable QVeris skill targets found");
  for (const target of targets) {
    const label = await syncOne(path.resolve(target));
    console.log(`synced ${label}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
