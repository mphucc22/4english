import { test } from "node:test";
import assert from "node:assert/strict";
import { R } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";

const manager = { id: "central", name: "Quản trị", role: "manager" };
const payload = (username, role, branchIds) => ({
  name: username,
  username,
  password: "123456",
  role,
  branchIds,
});
function setup() {
  const db = Seed.build();
  const [one, two, three] = db.branches.map((branch) => branch.id);
  R.saveUser(db, manager, null, payload("branchmanager", "branch_manager", [one, two]));
  const supervisor = db.users.find((user) => user.username === "branchmanager");
  return { db, one, two, three, supervisor };
}

test("Branch staff: central assigns explicit branches; scoped account requires valid scope", () => {
  const { db, one } = setup();
  for (const branchIds of [[], ["missing"], "all"]) {
    const before = JSON.stringify(db);
    assert.throws(() => R.saveUser(db, manager, null, payload("badstaff", "enroll", branchIds)));
    assert.equal(JSON.stringify(db), before);
  }
  R.saveUser(db, manager, null, payload("validstaff", "enroll", [one, one]));
  assert.deepEqual(db.users.find((user) => user.username === "validstaff").branchIds, [one]);
});

test("Branch staff: supervisor manages only subordinate staff fully inside their assigned branches", () => {
  const { db, one, two, three, supervisor } = setup();
  R.saveUser(db, supervisor, null, payload("mystaff", "enroll", [one, two]));
  const staff = db.users.find((user) => user.username === "mystaff");
  R.saveUser(db, supervisor, staff.id, payload("mystaff", "accountant", [two]));
  assert.equal(staff.role, "accountant");
  assert.throws(() => R.saveUser(db, supervisor, staff.id, payload("mystaff", "accountant", [three])));
  for (const role of ["manager", "branch_manager"])
    assert.throws(() => R.saveUser(db, supervisor, null, payload("promoted", role, [one])));
  R.deleteUser(db, supervisor, staff.id);
  assert(!db.users.some((user) => user.id === staff.id));
});

test("Branch staff: supervisor cannot change own scope, peer managers, or partly foreign staff", () => {
  const { db, one, three, supervisor } = setup();
  R.saveUser(db, manager, null, payload("foreignstaff", "enroll", [one, three]));
  R.saveUser(db, manager, null, payload("peermanager", "branch_manager", [one]));
  for (const target of [supervisor, db.users.find((user) => user.username === "foreignstaff"), db.users.find((user) => user.username === "peermanager")]) {
    const before = JSON.stringify(db);
    assert.throws(() => R.saveUser(db, supervisor, target.id, payload(target.username, "enroll", [one])));
    assert.throws(() => R.deleteUser(db, supervisor, target.id));
    assert.equal(JSON.stringify(db), before);
  }
});
