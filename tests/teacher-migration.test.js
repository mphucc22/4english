import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Seed } from "../src/lib/seed.js";
import { migrateTeacherData } from "../server/teacher-migration.js";
import { openDatabase, validateDb } from "../server/database.js";
import { newSession } from "../server/auth.js";
import { isLoginAllowed } from "../src/lib/teacher-identity.js";

function legacyData() {
  const db = Seed.build();
  delete db.meta.teacherIdentityVersion;
  for (const teacher of db.teachers) delete teacher.branchIds;
  for (const user of db.users) delete user.disabled;
  const account = db.users.find((user) => user.username === "gv1");
  account.branchIds = ["br1"];
  account.name = "Tên cũ chưa đồng bộ";
  return db;
}

test("TMIG01: canonical migration preserves credentials and existing grants without timetable expansion", () => {
  const db = legacyData();
  const account = db.users.find((user) => user.username === "gv1");
  const password = account.password;
  // A legacy assignment at another branch must not grant login authority there.
  db.sessions.push({ id: "legacy-foreign", classId: db.classes.find((c) => c.branchId === "br2").id, teacherId: "gv1" });
  assert.equal(migrateTeacherData(db), true);
  const profile = db.teachers.find((teacher) => teacher.id === account.teacherId);
  assert.equal(account.name, profile.name);
  assert.deepEqual(profile.branchIds, ["br1"]);
  assert.deepEqual(account.branchIds, ["br1"]);
  assert.equal(account.password, password);
  assert.equal(account.disabled, false);
  const upgraded = structuredClone(db);
  assert.equal(migrateTeacherData(db), false);
  assert.deepEqual(db, upgraded);
});

test("TMIG02: old duplicate teacher links are retained, quarantined and cannot log in", () => {
  const db = legacyData();
  const original = db.users.find((user) => user.username === "gv1");
  db.users.push({ ...original, id: "legacy-duplicate", username: "gv1.duplicate" });
  const beforeIds = db.users.map((user) => user.id);
  migrateTeacherData(db);
  assert.deepEqual(db.users.map((user) => user.id), beforeIds);
  for (const user of db.users.filter((row) => row.teacherId === original.teacherId)) {
    assert.equal(user.disabled, true);
    assert.equal(user.teacherLinkConflict, true);
    assert.equal(isLoginAllowed(db, user), false);
  }
  validateDb(db);
  const invalid = structuredClone(db);
  invalid.users.find((user) => user.id === original.id).disabled = false;
  assert.throws(() => validateDb(invalid), /liên kết|khóa/);
});

test("TMIG03: stored teacher upgrade backs up SQLite, retains password hashes and revokes quarantined sessions", () => {
  const folder = mkdtempSync(join(tmpdir(), "4english-teacher-upgrade-"));
  const path = join(folder, "teachers.sqlite");
  let database;
  try {
    database = openDatabase(path);
    const legacy = legacyData();
    const account = legacy.users.find((user) => user.username === "gv1");
    legacy.users.push({ ...account, id: "old-duplicate", username: "gv1.old" });
    database.transact(() => database.save(legacy));
    const hashes = database.sql.prepare("SELECT id,password_hash FROM users ORDER BY id").all();
    newSession(database, account.id);
    newSession(database, "old-duplicate");
    database.close(); database = null;
    database = openDatabase(path);
    assert(existsSync(path + ".before-teachers.sqlite"));
    assert.equal(database.load().meta.teacherIdentityVersion, 1);
    assert.deepEqual(database.sql.prepare("SELECT id,password_hash FROM users ORDER BY id").all(), hashes);
    assert.equal(database.sql.prepare("SELECT count(*) AS count FROM auth_sessions").get().count, 0);
    const upgraded = database.load();
    database.close(); database = null;
    database = openDatabase(path);
    assert.deepEqual(database.load(), upgraded);
  } finally {
    database?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
