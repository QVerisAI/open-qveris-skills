import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = [
  new URL("../scripts/qveris_direct_runtime.mjs", import.meta.url),
  new URL("../../qveris-a-share-factor-screen-direct/scripts/qveris_direct_runtime.mjs", import.meta.url),
  new URL("../../qveris-alphaear-market-intelligence-direct/scripts/qveris_direct_runtime.mjs", import.meta.url),
];

test("all direct finance skills ship the byte-identical audited runtime", async () => {
  const copies = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  assert.equal(copies[1], copies[0]);
  assert.equal(copies[2], copies[0]);
});
