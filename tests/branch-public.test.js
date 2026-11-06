import test from "node:test";
import assert from "node:assert/strict";
import { branchMapUrls, branchPublicData, consultHref, phoneHref, googleMapsEmbedUrl } from "../src/lib/branch-public.js";

test("map links safely encode the stored address and never substitute an invented location", () => {
  const address = "15 Quang Trung, Hà Đông, Hà Nội & cổng số 2";
  const links = branchMapUrls({ address });
  assert.equal(new URL(links.embed).searchParams.get("q"), address);
  assert.equal(new URL(links.search).searchParams.get("query"), address);
  assert.equal(new URL(links.directions).searchParams.get("destination"), address);
  assert.equal(new URL(links.embed).hostname, "www.google.com");
  assert.equal(branchMapUrls({ address: " " }), null);
});

test("verified Google share embeds override only the iframe, while directions keep the branch address", () => {
  const address = "88 Xuân Thủy, Cầu Giấy, Hà Nội";
  const mapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!2m3!3d21.1";
  const links = branchMapUrls({ address, mapEmbedUrl });
  assert.equal(links.embed, mapEmbedUrl);
  assert.equal(new URL(links.directions).searchParams.get("destination"), address);
  assert.equal(new URL(links.search).searchParams.get("query"), address);
  assert.equal(googleMapsEmbedUrl("https://maps.google.com/maps/embed?pb=selected"), "https://maps.google.com/maps/embed?pb=selected");
});

test("unsafe or unrelated embed URLs from restored data fall back to an encoded address lookup", () => {
  for (const mapEmbedUrl of [
    "javascript:alert(1)", "http://www.google.com/maps/embed?pb=x",
    "https://www.google.com.evil.example/maps/embed?pb=x", "https://evil.example/maps/embed?pb=x",
    "https://www.google.com/maps/search?pb=x", "https://user:secret@www.google.com/maps/embed?pb=x",
    "https://www.google.com:8443/maps/embed?pb=x", "https://www.google.com/maps/embed/other?pb=x",
    "https://www.google.com/maps/embed?pb=x#unexpected", { url: "https://www.google.com/maps/embed" },
  ]) {
    assert.equal(googleMapsEmbedUrl(mapEmbedUrl), "");
    const links = branchMapUrls({ address: "Địa chỉ được quản lý", mapEmbedUrl });
    assert.equal(new URL(links.embed).hostname, "www.google.com");
    assert.equal(new URL(links.embed).searchParams.get("q"), "Địa chỉ được quản lý");
  }
});

test("branch page offers only existing courses with classes open in that branch", () => {
  const db = {
    branches: [{ id: "b1" }, { id: "b2" }],
    courses: [{ id: "c1" }, { id: "c2" }],
    classes: [
      { id: "local", branchId: "b1", courseId: "c1", status: "Mở đăng ký", startDate: "2026-12-01" },
      { id: "other", branchId: "b2", courseId: "c2", status: "Mở đăng ký" },
      { id: "closed", branchId: "b1", courseId: "c2", status: "Đang học" },
      { id: "orphan", branchId: "b1", courseId: "gone", status: "Mở đăng ký" },
    ],
  };
  const data = branchPublicData(db, "b1");
  assert.deepEqual(data.classes.map((item) => item.id), ["local"]);
  assert.deepEqual(data.courses.map((item) => item.id), ["c1"]);
  assert.equal(branchPublicData(db, "missing"), null);
});

test("consultation links preserve branch and class even for branch-only requests", () => {
  const link = consultHref({ courseId: "course/a", branchId: "b&1", classId: "cl 2" });
  assert(link.startsWith("/tu-van/course%2Fa?"));
  const params = new URLSearchParams(link.split("?")[1]);
  assert.equal(params.get("branch"), "b&1");
  assert.equal(params.get("class"), "cl 2");
  assert.equal(consultHref({ branchId: "b1" }), "/tu-van?branch=b1");
  assert.equal(phoneHref("024 3333 0001"), "tel:02433330001");
  assert.equal(phoneHref("javascript:alert()"), "");
});
