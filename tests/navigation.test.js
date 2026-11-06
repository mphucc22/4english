import test from "node:test";
import assert from "node:assert/strict";
import { parseLocation, canonicalPath } from "../src/lib/navigation.js";
import { pageMeta } from "../src/lib/page-meta.js";

test("public and legacy consultation links preserve course, branch and class independently", () => {
  const clean = parseLocation({ pathname: "/tu-van/co2", search: "?branch=br2&class=cl2" });
  const legacy = parseLocation({ pathname: "/", hash: "#/consult/co2?branch=br2&class=cl2" });
  assert.deepEqual(clean.segments, legacy.segments);
  assert.equal(clean.params.get("branch"), "br2");
  assert.equal(legacy.params.get("class"), "cl2");
  assert.equal(clean.segments[1], "co2");
});
test("public section and deep links have stable paths while hash administration remains compatible", () => {
  assert.deepEqual(parseLocation({ pathname: "/co-so" }).segments, ["section", "chi-nhanh"]);
  assert.deepEqual(parseLocation({ pathname: "/", hash: "#lo-trinh" }).segments, ["section", "lo-trinh"]);
  assert.deepEqual(parseLocation({ pathname: "/", hash: "#/app/class/cl1" }).segments, ["app", "class", "cl1"]);
  const route = parseLocation({ pathname: "/co-so/b%26one" });
  assert.equal(canonicalPath(route.segments), "/co-so/b%26one");
});
test("invalid routes cannot inherit object keys or advertise a private page to crawlers", () => {
  const db = { courses: [], branches: [] };
  assert.deepEqual(parseLocation({ pathname: "/constructor" }).segments, ["not-found"]);
  assert.equal(canonicalPath(["constructor"]), "/");
  for (const route of [["constructor"], ["branch", "missing"], ["app"], ["login"], ["consult"]])
    assert.equal(pageMeta(route, db, { demoMode: false }).noindex, true);
  assert.equal(pageMeta([], db, { demoMode: false }).noindex, false);
  assert.equal(pageMeta([], db, { demoMode: true }).noindex, true);
});
