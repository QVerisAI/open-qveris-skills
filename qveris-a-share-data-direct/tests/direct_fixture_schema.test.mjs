import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

import { validateSchema } from "../../qveris-finance-common/schema-validator.mjs";

const skills = [
  "qveris-a-share-data-direct",
  "qveris-a-share-factor-screen-direct",
  "qveris-alphaear-market-intelligence-direct",
];

for (const skill of skills) {
  test(`${skill} fixtures satisfy their direct output schema`, async () => {
    const root = new URL(`../../${skill}/`, import.meta.url);
    const schema = JSON.parse(await readFile(new URL("schemas/output.schema.json", root), "utf8"));
    const fixtureRoot = new URL("fixtures/qveris/", root);
    const fixtures = (await readdir(fixtureRoot)).filter((name) => name.endsWith(".json"));
    assert.ok(fixtures.length > 0);
    for (const fixture of fixtures) {
      const value = JSON.parse(await readFile(new URL(fixture, fixtureRoot), "utf8"));
      assert.deepEqual(validateSchema(schema, value), [], fixture);
    }
  });
}
