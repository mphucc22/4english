import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { R } from "../src/lib/rules.js";
import { fixture, klass } from "./helpers.js";

const dir = mkdtempSync(join(tmpdir(), "4english-public-"));
writeFileSync(join(dir, "index.html"), '<!doctype html><html><head><title>4ENGLISH</title><meta name="description" content="old description"><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>');
writeFileSync(join(dir, "photo.webp"), "image fixture");
const app = createApp({
  dbPath: ":memory:", dist: dir, demoMode: true,
  contact: { email: "care@example.org", hotline: "+84 901 234 567", hours: "Thứ 2 – Thứ 7", zaloUrl: "https://zalo.me/0901234567", facebookUrl: "https://www.facebook.com/4english.example" },
});
const production = createApp({
  dbPath: ":memory:", dist: dir, demoMode: false, publicUrl: "https://4english.example",
  contact: { email: "<script>@bad.test", hotline: "-------", zaloUrl: "javascript:alert(1)", facebookUrl: "https://facebook.com.evil.example/a" },
});
let base, live;
before(async () => {
  await Promise.all([app, production].map((instance) => new Promise((done) => instance.server.listen(0, "127.0.0.1", done))));
  base = `http://127.0.0.1:${app.server.address().port}`;
  live = `http://127.0.0.1:${production.server.address().port}`;
});
after(async () => {
  await Promise.all([app.close(), production.close()]);
  rmSync(dir, { recursive: true, force: true });
});
async function post(origin, path, body, session) {
  const response = await fetch(origin + "/api/" + path, {
    method: "POST", headers: {
      "content-type": "application/json",
      ...(session ? { cookie: session.cookie, "x-csrf-token": session.csrf } : {}),
    }, body: JSON.stringify(body),
  });
  return { status: response.status, cookie: response.headers.get("set-cookie")?.split(";")[0], data: await response.json() };
}

test("PUBLIC01: class consultation preserves selection and a stable staff snapshot", () => {
  const db = fixture(), selected = klass(db);
  const result = R.createLead(db, { name: "  Khách thử  ", phone: "090 123 4567", courseId: selected.courseId, classId: selected.id, contactTime: "evening", note: "Cần tư vấn lịch học" });
  assert.equal(typeof result, "string");
  const lead = db.leads.at(-1);
  assert.equal(lead.name, "Khách thử");
  assert.equal(lead.phone, "0901234567");
  assert.equal(lead.branchId, selected.branchId);
  assert.equal(lead.classId, selected.id);
  assert.equal(lead.classCode, selected.code);
  assert.equal(lead.contactTimeLabel, "Buổi tối");
  const snapshot = { branch: lead.branchName, schedule: lead.classSchedule, course: lead.course };
  db.branches[0].name = "Đổi tên sau khi nhận tư vấn";
  selected.start = "20:00";
  db.courses.find((course) => course.id === selected.courseId).name = "Tên mới";
  assert.deepEqual({ branch: lead.branchName, schedule: lead.classSchedule, course: lead.course }, snapshot);
});

test("PUBLIC02: tampered, unavailable or mismatched classes and oversized payloads cannot create leads", () => {
  const db = fixture(), selected = klass(db);
  const valid = { name: "Khách thử", phone: "0901234567", courseId: selected.courseId, branchId: selected.branchId, classId: selected.id };
  for (const patch of [
    { classId: "unknown" }, { courseId: "co3" }, { branchId: "br2" },
    { contactTime: "midnight" }, { classId: [] }, { note: "x".repeat(501) },
    { name: "x".repeat(121) }, { name: { toString: "bad" } },
  ]) {
    const beforeCount = db.leads.length;
    assert.throws(() => R.createLead(db, { ...valid, ...patch }));
    assert.equal(db.leads.length, beforeCount);
  }
  selected.status = "Đang học";
  assert.throws(() => R.createLead(db, valid), /ngừng nhận/);
  assert.equal(db.leads.length, 0);
});

test("PUBLIC03: public API returns only the new receipt and no staff or lead collection", async () => {
  const state = await (await fetch(base + "/api/state")).json();
  const selected = state.db.classes.find((item) => item.status === "Mở đăng ký");
  assert(selected);
  const response = await post(base, "leads", { name: "Biên nhận mới", phone: "0901234567", courseId: selected.courseId, branchId: selected.branchId, classId: selected.id, contactTime: "morning", note: "Ghi chú riêng" });
  assert.equal(response.status, 200);
  assert.equal(typeof response.data.result, "string");
  assert.equal(response.data.receipt.classId, selected.id);
  assert.equal(response.data.receipt.branchId, selected.branchId);
  assert.equal(response.data.receipt.contactTimeLabel, "Buổi sáng");
  assert(response.data.receipt.id);
  assert.deepEqual(Object.keys(response.data).sort(), ["receipt", "result"]);
  assert(!JSON.stringify(response.data).includes("Ghi chú riêng"));
  const afterState = await (await fetch(base + "/api/state")).json();
  assert.deepEqual(afterState.db.leads, []);
  assert.deepEqual(afterState.db.users, []);
  const saved = app.database.load().leads.find((item) => item.id === response.data.receipt.id);
  assert.equal(saved.note, "Ghi chú riêng");
  assert.equal(saved.classCode, selected.code);
});

test("PUBLIC04: invalid public consultation context is rejected without changing persisted data", async () => {
  const count = app.database.load().leads.length;
  const selected = app.database.load().classes.find((item) => item.status === "Mở đăng ký");
  const response = await post(base, "leads", { name: "Sai cơ sở", phone: "0901234567", courseId: selected.courseId, branchId: selected.branchId === "br1" ? "br2" : "br1", classId: selected.id });
  assert.equal(response.status, 422);
  assert.equal(app.database.load().leads.length, count);
});

test("PUBLIC05: site mode and configured contacts are public, unsafe external links are discarded", async () => {
  const demo = await (await fetch(base + "/api/state")).json();
  assert.equal(demo.site.demoMode, true);
  assert.equal(demo.site.contact.email, "care@example.org");
  assert.equal(demo.site.contact.zaloUrl, "https://zalo.me/0901234567");
  assert.equal(demo.site.contact.hours, "Thứ 2 – Thứ 7");
  const state = await (await fetch(live + "/api/state")).json();
  assert.equal(state.site.demoMode, false);
  assert.deepEqual(state.site.contact, { email: "", hotline: "", hours: "", zaloUrl: "", facebookUrl: "" });
});

test("PUBLIC06: production reset is refused on the server and leaves data unchanged", async () => {
  const logged = await post(live, "login", { username: "quanly", password: "123456" });
  assert.equal(logged.status, 200);
  assert.equal(logged.data.site.demoMode, false);
  const beforeData = production.database.load();
  const response = await post(live, "reset", { confirm: "RESET DEMO", revision: beforeData.meta.revision }, { ...logged.data, cookie: logged.cookie });
  assert.equal(response.status, 403);
  assert.deepEqual(production.database.load(), beforeData);
});

test("PUBLIC07: clean public routes serve the app, missing assets stay 404 and maps have explicit CSP", async () => {
  for (const route of ["/co-so", "/khoa-hoc", "/co-so/br1", "/khoa-hoc/co2", "/tu-van", "/tu-van/co2", "/kiem-tra-dau-vao", "/lien-he", "/chinh-sach-bao-mat", "/dieu-khoan", "/dang-nhap"]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(response.headers.get("content-security-policy"), /frame-src https:\/\/www.google.com https:\/\/maps.google.com/);
    assert.match(await response.text(), /4ENGLISH/);
  }
  for (const route of ["/missing.js", "/co-so/../missing.js", "/api/no-such-endpoint", "/unknown-page"]) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
  const image = await fetch(base + "/photo.webp");
  assert.equal(image.headers.get("content-type"), "image/webp");
});

test("PUBLIC08: clean pages contain specific, escaped SEO metadata before JavaScript", async () => {
  const branch = production.database.load().branches[0];
  const branchHtml = await (await fetch(live + "/co-so/" + branch.id)).text();
  assert(branchHtml.includes(`<title>${branch.name} | Địa chỉ và lịch lớp</title>`));
  assert.match(branchHtml, /name="robots" content="index, follow"/);
  assert.match(branchHtml, /rel="canonical" href="https:\/\/4english.example\/co-so\/br1"/);
  assert.match(branchHtml, /property="og:image" content="https:\/\/4english.example\/images\/4english-study-space-1448.webp"/);
  assert.equal((branchHtml.match(/name="description"/g) || []).length, 1);
  assert(branchHtml.includes('<script type="module" src="/assets/app.js"></script>'));
  assert(branchHtml.includes('<link rel="stylesheet" href="/assets/app.css">'));
  const original = production.database.load();
  try {
    const changed = structuredClone(original);
    changed.courses.find((item) => item.id === "co2").name = 'Tên <img src=x onerror="alert(1)"> $&';
    changed.courses.find((item) => item.id === "co2").desc = 'Mô tả "đặc biệt" </head><script>alert(1)</script>';
    production.database.save(changed);
    const html = await (await fetch(live + "/khoa-hoc/co2")).text();
    assert(html.includes('Tên &lt;img src=x onerror=&quot;alert(1)&quot;&gt; $&amp;'));
    assert(!html.includes('<img src=x'));
    assert(!html.includes('<script>alert(1)</script>'));
    assert.equal((html.match(/<\/head>/g) || []).length, 1);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.match(html, /property="og:url" content="https:\/\/4english.example\/khoa-hoc\/co2"/);
  } finally {
    production.database.save(original);
  }
  const missing = await fetch(live + "/co-so/unknown");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /name="robots" content="noindex, nofollow"/);
});

test("PUBLIC09: robots and sitemap distinguish demo from production and contain only public URLs", async () => {
  const demoRobots = await (await fetch(base + "/robots.txt")).text();
  assert.equal(demoRobots, "User-agent: *\nDisallow: /\n");
  const demoMap = await (await fetch(base + "/sitemap.xml")).text();
  assert(!demoMap.includes("<loc>"));
  const robotsResponse = await fetch(live + "/robots.txt");
  assert.match(robotsResponse.headers.get("content-type"), /text\/plain/);
  const robots = await robotsResponse.text();
  for (const path of ["/api/", "/app/", "/dang-nhap", "/tu-van"])
    assert(robots.includes("Disallow: " + path));
  assert(robots.includes("Sitemap: https://4english.example/sitemap.xml"));
  const mapResponse = await fetch(live + "/sitemap.xml");
  assert.match(mapResponse.headers.get("content-type"), /application\/xml/);
  const sitemap = await mapResponse.text();
  assert(sitemap.includes("https://4english.example/co-so/br1"));
  assert(sitemap.includes("https://4english.example/khoa-hoc/co2"));
  for (const privatePath of ["/app", "/api", "/dang-nhap", "/tu-van", "student", "username", "123456"])
    assert(!sitemap.includes(privatePath), privatePath);
});
