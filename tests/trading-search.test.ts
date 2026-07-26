import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackFilters,
  normalizeFilters,
} from "../app/api/ai/trading-search/route";

test("fallback routes physical delivery to the protected market", () => {
  const result = fallbackFilters("physical product with delivery");
  assert.equal(result.marketType, "PROTECTED");
  assert.equal(result.fulfillmentType, "PHYSICAL_GOOD");
});

test("fallback recognizes a local fitness service in Kyiv", () => {
  const result = fallbackFilters("fitness trainer in Kyiv");
  assert.equal(result.marketType, "PROTECTED");
  assert.equal(result.fulfillmentType, "LOCAL_SERVICE");
  assert.equal(result.category, "Health & Wellness");
  assert.equal(result.serviceCity, "Kyiv");
});

test("normalizer rejects unsafe enums and non-integer wei strings", () => {
  const result = normalizeFilters({
    marketType: "admin",
    fulfillmentType: "release_escrow",
    minPriceWei: "1.2",
    maxPriceWei: "-1",
    sort: "random",
  });

  assert.equal(result.marketType, null);
  assert.equal(result.fulfillmentType, null);
  assert.equal(result.minPriceWei, null);
  assert.equal(result.maxPriceWei, null);
  assert.equal(result.sort, null);
});
