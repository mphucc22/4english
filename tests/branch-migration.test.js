import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Seed } from "../src/lib/seed.js";
import { openDatabase } from "../server/database.js";
import { migrateBranchData } from "../server/branch-migration.js";

function legacyData() {
  const db = Seed.build();
  delete db.meta.branchSchemaVersion;
  delete db.meta.teacherIdentityVersion;
  for (const user of db.users) delete user.branchIds;
  for (const table of ["students", "enrollments", "payments", "reservations", "balanceLedger", "refunds", "leads"])
    for (const row of db[table]) delete row.branchId;
  return db;
}

test("BRMIG01: old records keep IDs and balances; staff grants fail closed, teacher grants derived", () => {
  const db = legacyData();
  db.students[0].balance = 12345;
  const oldIds = db.enrollments.map((e) => e.id);
  assert.equal(migrateBranchData(db), true);
  assert.deepEqual(db.enrollments.map((e) => e.id), oldIds);
  assert.deepEqual(db.users.find((u) => u.role === "enroll").branchIds, []);
  assert.deepEqual(db.users.find((u) => u.role === "accountant").branchIds, []);
  assert.deepEqual(db.users.find((u) => u.username === "gv1").branchIds, ["br1"]);
  assert.equal(db.students[0].balance, 12345);
  assert(db.balanceLedger.some((e) => e.studentId === db.students[0].id && e.branchId === null && e.amount === 12345));
  const snapshot = structuredClone(db);
  assert.equal(migrateBranchData(db), false);
  assert.deepEqual(db, snapshot);
});

test("BRMIG02: persistent upgrade creates recovery SQLite and preserves password hashes", () => {
  const folder = mkdtempSync(join(tmpdir(), "4english-migration-"));
  const path = join(folder, "legacy.sqlite");
  let database;
  try {
    database = openDatabase(path);
    database.transact(() => database.save(legacyData()));
    const hash = database.sql.prepare("SELECT password_hash FROM users WHERE id='u1'").get().password_hash;
    const revision = database.load().meta.revision;
    database.close(); database = null;
    database = openDatabase(path);
    assert(existsSync(path + ".before-branches.sqlite"));
    assert.equal(database.load().meta.branchSchemaVersion, 1);
    assert.equal(database.load().meta.revision, revision + 1);
    assert.equal(database.sql.prepare("SELECT password_hash FROM users WHERE id='u1'").get().password_hash, hash);
    const upgraded = database.load();
    database.close(); database = null;
    database = openDatabase(path);
    assert.deepEqual(database.load(), upgraded);
  } finally {
    database?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
