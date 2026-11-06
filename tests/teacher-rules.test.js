import { test } from "node:test";
import assert from "node:assert/strict";
import { R } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
import { klass, manager } from "./helpers.js";
import { canTeacherWorkAt, isLoginAllowed, teacherAccount } from "../src/lib/teacher-identity.js";

function fixture() {
  const db = Seed.minimal();
  for (const teacher of db.teachers) teacher.branchIds = db.branches.map((b) => b.id);
  for (const user of db.users) user.disabled = false;
  return db;
}
const accountPayload = (teacherId, extra = {}) => ({
  username: "teacher.new", password: "123456", role: "teacher", teacherId,
  name: "Untrusted alternate name", ...extra,
});

test("TEACH01: teacher profile is canonical identity and only one account may link", () => {
  const db = fixture();
  R.saveUser(db, manager, null, accountPayload("gv3"));
  const teacher = R.by(db, "teachers", "gv3");
  const account = teacherAccount(db, teacher.id);
  assert.equal(account.name, teacher.name);
  assert.deepEqual(account.branchIds, teacher.branchIds);
  const before = JSON.stringify(db);
  assert.throws(() => R.saveUser(db, manager, null, accountPayload("gv3", { username: "teacher.duplicate" })), /đã có tài khoản/);
  assert.equal(JSON.stringify(db), before);
  assert.throws(() => R.saveUser(db, manager, account.id, accountPayload("gv3", { branchIds: ["br1"] })), /phải khớp/);
});

test("TEACH02: editing profile updates linked name and locations while retaining login credentials", () => {
  const db = fixture();
  const teacher = R.by(db, "teachers", "gv1");
  const account = teacherAccount(db, teacher.id);
  const username = account.username, password = account.password;
  account.disabled = true;
  R.saveMaster(db, manager, "teachers", teacher.id, { ...teacher, name: "Tên hồ sơ mới", branchIds: ["br2"] });
  assert.equal(account.name, "Tên hồ sơ mới");
  assert.deepEqual(account.branchIds, ["br2"]);
  assert.equal(account.username, username);
  assert.equal(account.password, password);
  assert.equal(account.disabled, true);
});

test("TEACH03: branch manager cannot acquire a teacher profile assigned outside their scope", () => {
  const db = fixture();
  const local = { id: "local", name: "Quản lý", role: "branch_manager", branchIds: ["br1"] };
  assert.throws(() => R.saveUser(db, local, null, accountPayload("gv3")), /phạm vi/);
  R.by(db, "teachers", "gv3").branchIds = ["br1"];
  R.saveUser(db, local, null, accountPayload("gv3"));
  assert.deepEqual(teacherAccount(db, "gv3").branchIds, ["br1"]);
});

test("TEACH04: teacher needs no login to teach but must work at the class branch", () => {
  const db = fixture();
  R.by(db, "teachers", "gv3").branchIds = ["br1"];
  assert.equal(teacherAccount(db, "gv3"), undefined);
  const c = klass(db, { teacher: "gv3" });
  assert.equal(c.teacherId, "gv3");
  assert.equal(canTeacherWorkAt(db, "gv3", "br1"), true);
  assert.equal(canTeacherWorkAt(db, "gv3", "br2"), false);
  assert.throws(() => klass(db, { teacher: "gv3", branch: "br2", room: "br2r1" }), /chưa được phân công/);
});

test("TEACH05: future assignments prevent removing branch or stopping teacher, atomically", () => {
  const db = fixture();
  klass(db, { teacher: "gv1" });
  for (const changes of [{ branchIds: ["br2"] }, { status: "Nghỉ" }]) {
    const teacher = R.by(db, "teachers", "gv1");
    const before = JSON.stringify(db);
    assert.throws(() => R.saveMaster(db, manager, "teachers", teacher.id, { ...teacher, ...changes }), /buổi dạy sắp tới/);
    assert.equal(JSON.stringify(db), before);
  }
});

test("TEACH06: historical teaching does not prevent departure and departure blocks login", () => {
  const db = fixture();
  const c = klass(db, { teacher: "gv1" });
  c.status = "Kết thúc";
  for (const session of R.sessions(db, c.id)) session.held = true;
  const teacher = R.by(db, "teachers", "gv1");
  const account = teacherAccount(db, teacher.id);
  assert.equal(isLoginAllowed(db, account), true);
  R.saveMaster(db, manager, "teachers", teacher.id, { ...teacher, status: "Nghỉ" });
  assert.equal(isLoginAllowed(db, account), false);
  assert.equal(R.sessions(db, c.id).length, 24);
  R.saveMaster(db, manager, "teachers", teacher.id, { ...teacher, status: "Đang dạy" });
  assert.equal(isLoginAllowed(db, account), true);
});

test("TEACH07: manual locks and quarantined or duplicate links cannot log in", () => {
  const db = fixture();
  const account = teacherAccount(db, "gv1");
  account.disabled = true;
  assert.equal(isLoginAllowed(db, account), false);
  account.disabled = false;
  account.teacherLinkConflict = true;
  assert.equal(isLoginAllowed(db, account), false);
  delete account.teacherLinkConflict;
  db.users.push({ ...account, id: "duplicate", username: "duplicate" });
  assert.equal(isLoginAllowed(db, account), false);
  assert.equal(isLoginAllowed(db, db.users.at(-1)), false);
});

test("TEACH08: cannot lock yourself or disable the last enabled central administrator", () => {
  const db = fixture();
  const central = db.users.find((user) => user.role === "manager");
  const before = JSON.stringify(db);
  assert.throws(() => R.saveUser(db, central, central.id, { ...central, disabled: true }), /tự khóa/);
  assert.equal(JSON.stringify(db), before);
  assert.throws(() => R.saveUser(db, manager, central.id, { ...central, disabled: true }), /ít nhất một/);
  assert.equal(JSON.stringify(db), before);
});

test("TEACH09: changing a single session also checks the teacher's work locations", () => {
  const db = fixture();
  const c = klass(db);
  const s = R.sessions(db, c.id)[0];
  R.by(db, "teachers", "gv3").branchIds = ["br2"];
  const before = JSON.stringify(db);
  assert.throws(() => R.changeSession(db, manager, s.id, { ...s, teacherId: "gv3", note: "Đổi giáo viên" }), /chưa được phân công/);
  assert.equal(JSON.stringify(db), before);
});

test("TEACH10: new teacher profiles require assigned work locations", () => {
  const db = fixture();
  assert.throws(() => R.saveMaster(db, manager, "teachers", null, { name: "Chưa phân công" }), /cơ sở công tác/);
  R.saveMaster(db, manager, "teachers", null, { name: "Giáo viên mới", branchIds: ["br1"], status: "Đang dạy" });
  assert.deepEqual(db.teachers.at(-1).branchIds, ["br1"]);
});
