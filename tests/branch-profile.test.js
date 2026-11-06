import test from "node:test";
import assert from "node:assert/strict";
import { R } from "../src/lib/rules.js";
import { fixture, manager } from "./helpers.js";
import { branchMapUrls } from "../src/lib/branch-public.js";

const mapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!2m3!3d21.1";

test("BRPROFILE01: central manager can publish branch hours and a verified Google embed", () => {
  const db = fixture();
  const original = { ...db.branches[0] };
  R.saveMaster(db, manager, "branches", original.id, { ...original, openingHours: "  Thứ 2 – Thứ 7, liên hệ trước khi đến  ", mapEmbedUrl });
  assert.equal(db.branches[0].openingHours, "Thứ 2 – Thứ 7, liên hệ trước khi đến");
  assert.equal(db.branches[0].mapEmbedUrl, mapEmbedUrl);
  assert.equal(branchMapUrls(db.branches[0]).embed, mapEmbedUrl);
  // Older clients that omit these optional fields cannot accidentally erase them.
  R.saveMaster(db, manager, "branches", original.id, { ...original, phone: "024 3333 1234" });
  assert.equal(db.branches[0].mapEmbedUrl, mapEmbedUrl);
  assert.equal(db.branches[0].openingHours, "Thứ 2 – Thứ 7, liên hệ trước khi đến");
});

test("BRPROFILE02: branch managers and enrollment staff cannot edit shared branch profiles", () => {
  for (const user of [
    { id: "local", name: "Quản lý cơ sở", role: "branch_manager", branchIds: ["br1"] },
    { id: "staff", name: "Ghi danh", role: "enroll", branchIds: ["br1"] },
  ]) {
    const db = fixture(), before = structuredClone(db);
    assert.throws(() => R.saveMaster(db, user, "branches", "br1", { ...db.branches[0], openingHours: "Đổi giờ", mapEmbedUrl }), /quản trị toàn hệ thống|không có quyền/);
    assert.deepEqual(db, before);
  }
});

test("BRPROFILE03: invalid embed values or oversized hours roll back all branch changes", () => {
  for (const patch of [
    { mapEmbedUrl: "javascript:alert(1)" },
    { mapEmbedUrl: "https://www.google.com.evil.example/maps/embed?pb=x" },
    { mapEmbedUrl: '<iframe src="https://www.google.com/maps/embed?pb=x"></iframe>' },
    { mapEmbedUrl: "https://www.google.com/maps/embed?pb=" + "x".repeat(4096) },
    { mapEmbedUrl: [mapEmbedUrl] },
    { openingHours: "x".repeat(161) },
    { openingHours: { text: "Giờ làm việc" } },
  ]) {
    const db = fixture(), before = structuredClone(db);
    assert.throws(() => R.saveMaster(db, manager, "branches", "br1", { ...db.branches[0], name: "Không được ghi nửa chừng", ...patch }));
    assert.deepEqual(db, before);
  }
});

test("BRPROFILE04: clearing optional fields restores address-based maps and still requires an address", () => {
  const db = fixture();
  R.saveMaster(db, manager, "branches", "br1", { ...db.branches[0], openingHours: "Đã cập nhật", mapEmbedUrl });
  R.saveMaster(db, manager, "branches", "br1", { ...db.branches[0], openingHours: "", mapEmbedUrl: "" });
  assert.equal(db.branches[0].openingHours, "");
  assert.equal(db.branches[0].mapEmbedUrl, "");
  assert.equal(new URL(branchMapUrls(db.branches[0]).embed).searchParams.get("q"), db.branches[0].address);
  const before = structuredClone(db);
  assert.throws(() => R.saveMaster(db, manager, "branches", "br1", { ...db.branches[0], address: "  " }), /địa chỉ/);
  assert.deepEqual(db, before);
});
