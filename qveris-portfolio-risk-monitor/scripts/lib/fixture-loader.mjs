import { promises as fs } from "node:fs";

export async function loadFixture(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}
