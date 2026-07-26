import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fallbackFilters } from "../app/api/ai/trading-search/route";

type Fixture = {
  id: string;
  query: string;
  expected: Record<string, string | null>;
};

async function main() {
  const fixturePath = resolve(
    process.cwd(),
    "evals/trading-search-fallback.json"
  );
  const fixtures = JSON.parse(
    await readFile(fixturePath, "utf8")
  ) as Fixture[];

  let passed = 0;
  for (const fixture of fixtures) {
    const actual = fallbackFilters(fixture.query) as Record<
      string,
      string | null
    >;

    try {
      for (const [key, value] of Object.entries(fixture.expected)) {
        assert.equal(actual[key], value, `${fixture.id}: ${key}`);
      }
      passed += 1;
      console.log(`PASS ${fixture.id}`);
    } catch (error) {
      console.error(`FAIL ${fixture.id}`);
      console.error(error);
    }
  }

  const rate = fixtures.length ? passed / fixtures.length : 0;
  console.log(
    `\n${passed}/${fixtures.length} passed (${(rate * 100).toFixed(1)}%)`
  );

  if (passed !== fixtures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
