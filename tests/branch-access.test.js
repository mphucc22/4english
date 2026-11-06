import { test } from "node:test";
import assert from "node:assert/strict";
import { R } from "../src/lib/rules.js";
import { visibleData, dispatch } from "../server/services/actions.js";
import {
  allowedBranchIds, assertBranchAction, actionBranchIds, scopeData,
} from "../src/lib/branch-access.js";

const central = { id: "root", role: "manager", name: "Trung tâm" };
const local = { id: "bm1", role: "branch_manager", name: "Quản lý 1", branchIds: ["b1"] };
function fixture() {
  const db = Object.fromEntries([
    "users", "branches", "rooms", "courses", "terms", "teachers", "students",
    "classes", "sessions", "enrollments", "payments", "attendance", "requests",
    "reservations", "leads", "balanceLedger", "refunds", "audit",
  ].map((table) => [table, []]));
  db.meta = { version: 2, revision: 4, receiptSeq: 9, classSeq: { "private-b2": 3 } };
  db.branches = [{ id: "b1", name: "Cơ sở 1" }, { id: "b2", name: "Cơ sở 2" }];
  db.rooms = [{ id: "room1", branchId: "b1" }, { id: "room2", branchId: "b2" }];
  db.courses = [{ id: "course1", fee: 100, code: "A1" }];
  db.terms = [{ id: "term1" }];
  db.teachers = [{ id: "t1", name: "Teacher 1", status: "Đang dạy", phone: "111" },
    { id: "t2", name: "Teacher 2", status: "Đang dạy", phone: "222" }];
  db.classes = [
    { id: "c1", branchId: "b1", code: "A1-B1", courseId: "course1", status: "Nháp" },
    { id: "c2", branchId: "b2", code: "A1-B2", courseId: "course1", status: "Nháp" },
    { id: "c3", branchId: "b1", code: "A1-B1-2", courseId: "course1", status: "Nháp" },
  ];
  db.sessions = [{ id: "s1", classId: "c1", teacherId: "t1" },
    { id: "s2", classId: "c2", teacherId: "t1" }, { id: "s3", classId: "c3", teacherId: "t2" }];
  db.students = [
    { id: "st1", name: "Local", branchId: "b1", balance: 0 },
    { id: "st2", name: "Foreign", branchId: "b2", balance: 100, phone: "secret" },
    { id: "shared", name: "Shared", branchId: "b2", balance: 100, phone: "shared-phone" },
    { id: "new1", name: "Not enrolled", branchId: "b1", balance: 0 },
    { id: "unassigned", name: "Unassigned", balance: 0 },
  ];
  db.enrollments = [
    { id: "e1", classId: "c1", studentId: "st1", fee: 100, status: "Đã xác nhận" },
    { id: "e2", classId: "c2", studentId: "st2", fee: 100, status: "Đã xác nhận" },
    { id: "e3", classId: "c1", studentId: "shared", fee: 100, status: "Đã xác nhận" },
    { id: "e4", classId: "c2", studentId: "shared", fee: 100, status: "Đã xác nhận" },
  ];
  db.payments = [{ id: "p1", enrollmentId: "e1", studentId: "st1", branchId: "b1", amount: 20 },
    { id: "p2", enrollmentId: "e2", studentId: "st2", branchId: "b2", amount: 90 }];
  db.requests = [
    { id: "r1", type: "reserve", data: { enrollmentId: "e1" } },
    { id: "r2", type: "transfer", data: { enrollmentId: "e1", toClassId: "c2" } },
    { id: "r3", type: "makeup", status: "Đã duyệt", studentId: "st2",
      reason: "Private reason", data: { enrollmentId: "e2", missedSessionId: "s2", targetSessionId: "s1" } },
  ];
  db.attendance = [{ id: "a1", sessionId: "s1", enrollmentId: "e1" },
    { id: "a2", sessionId: "s1", enrollmentId: "e2" }, { id: "a3", sessionId: "s2", enrollmentId: "e2" }];
  db.reservations = [{ id: "rv1", enrollmentId: "e1" }, { id: "rv2", enrollmentId: "e2" }];
  db.leads = [{ id: "l1", branchId: "b1" }, { id: "l2", branchId: "b2" }, { id: "legacy-lead" }];
  db.balanceLedger = [{ id: "bl1", studentId: "shared", branchId: "b1", amount: 10, balanceAfter: 10 },
    { id: "bl2", studentId: "shared", branchId: "b2", amount: 90, balanceAfter: 100 }];
  db.refunds = [{ id: "rf1", studentId: "shared", branchId: "b1" },
    { id: "rf2", studentId: "shared", branchId: "b2" }];
  db.audit = [{ id: "au1", branchIds: ["b1"] }, { id: "au2", branchIds: ["b2"] }, { id: "au-global", branchIds: [] }];
  db.users = [central, local,
    { id: "en1", role: "enroll", branchIds: ["b1"], password: "remove-me" },
    { id: "ac2", role: "accountant", branchIds: ["b2"] },
    { id: "multi", role: "enroll", branchIds: ["b1", "b2"] },
    { id: "bm2", role: "branch_manager", branchIds: ["b2"] }];
  return db;
}

test("BRANCH01: missing grants and forged active branches fail closed", () => {
  const db = fixture();
  assert.deepEqual(allowedBranchIds(db, { role: "accountant" }), []);
  assert.deepEqual(allowedBranchIds(db, { ...local, activeBranchId: "b2" }), []);
  assert.throws(() => assertBranchAction(db, { role: "enroll" }, "enroll", ["st1", "c1"]), /chưa được giao cơ sở/);
  const out = visibleData(db, { id: "legacy", role: "enroll" });
  for (const table of ["students", "classes", "sessions", "payments", "leads", "branches", "rooms"])
    assert.equal(out[table].length, 0, table);
});

test("BRANCH02: snapshots isolate branch records, students, financial history and counters", () => {
  const db = fixture(), before = JSON.stringify(db), out = visibleData(db, local);
  assert.deepEqual(out.classes.map((r) => r.id), ["c1", "c3"]);
  assert.deepEqual(out.enrollments.map((r) => r.id), ["e1", "e3"]);
  assert.deepEqual(out.students.map((r) => r.id), ["st1", "shared", "new1"]);
  assert.deepEqual(out.payments.map((r) => r.id), ["p1"]);
  assert.deepEqual(out.requests.map((r) => r.id), ["r1"]);
  assert.deepEqual(out.leads.map((r) => r.id), ["l1"]);
  assert.deepEqual(out.refunds.map((r) => r.id), ["rf1"]);
  assert.equal(out.students.find((s) => s.id === "shared").balance, 10);
  assert.equal(out.balanceLedger.at(-1).balanceAfter, 10);
  assert.deepEqual(out.audit.map((r) => r.id), ["au1"]);
  assert.equal(out.meta.classSeq, undefined);
  assert.equal(JSON.stringify(db), before);
});

test("BRANCH03: a branch manager sees only self and employees wholly within own grants", () => {
  const out = visibleData(fixture(), local);
  assert.deepEqual(out.users.map((u) => u.id), ["bm1", "en1"]);
  assert(!JSON.stringify(out.users).includes("remove-me"));
});

test("BRANCH04: forged identifiers cannot mutate another branch through any business route", () => {
  const db = fixture();
  const cases = [
    ["createClass", [{ branchId: "b2" }]], ["updateClass", ["c1", { branchId: "b2" }]],
    ["deleteClass", ["c2"]], ["setSchedule", ["c1", { roomId: "room2" }]],
    ["openRegistration", ["c2"]], ["confirmOpen", ["c2"]], ["finishClass", ["c2"]], ["cancelClass", ["c2"]],
    ["enroll", ["st1", "c2"]], ["enroll", ["st2", "c1"]], ["addPayment", ["e2", {}]],
    ["createRequest", ["reserve", { enrollmentId: "e2" }]],
    ["createRequest", ["transfer", { enrollmentId: "e1", toClassId: "c2" }]],
    ["createRequest", ["makeup", { enrollmentId: "e1", missedSessionId: "s1", targetSessionId: "s2" }]],
    ["approve", ["r2"]], ["reject", ["r2", "reason"]], ["resume", ["rv2", "c1"]],
    ["markAttendance", ["s2", []]], ["cancelEnrollment", ["e2", "reason"]],
    ["refundBalance", ["shared", { branchId: "b2" }]], ["voidPayment", ["p2", "reason"]],
    ["changeSession", ["s1", { roomId: "room2" }]], ["setLeadStatus", ["l2", "Mới"]],
    ["saveMaster", ["rooms", "room2", { branchId: "b1" }]],
    ["saveMaster", ["students", "shared", { branchId: "b1" }]],
    ["deleteMaster", ["students", "shared"]], ["deleteMaster", ["rooms", "room2"]],
  ];
  const before = JSON.stringify(db);
  for (const [action, args] of cases)
    assert.throws(() => dispatch(db, local, action, args), /cơ sở/, action + JSON.stringify(args));
  assert.equal(JSON.stringify(db), before);
});

test("BRANCH05: direct business rules are guarded too; valid local action still works", () => {
  const db = fixture();
  assert.throws(() => R.openRegistration(db, local, "c2"), /cơ sở/);
  assert.equal(R.openRegistration(db, local, "c1").status, "Mở đăng ký");
  assert.throws(() => R.saveMaster(db, local, "courses", null, { name: "Injected" }), /toàn hệ thống/);
  assert.throws(() => R.deleteMaster(db, local, "branches", "b2"), /toàn hệ thống/);
});

test("BRANCH06: central active branch limits branch writes but keeps central catalog permission", () => {
  const db = fixture(), actor = { ...central, activeBranchId: "b1" };
  assert.deepEqual(allowedBranchIds(db, actor), ["b1"]);
  assert.throws(() => assertBranchAction(db, actor, "cancelClass", ["c2"]), /cơ sở/);
  assert.doesNotThrow(() => assertBranchAction(db, actor, "saveMaster", ["courses", null, {}]));
  assert.deepEqual(actionBranchIds(db, "approve", ["r2"]), ["b1", "b2"]);
});

test("BRANCH07: shared student can enroll locally without acquiring authority to edit home profile", () => {
  const db = fixture();
  assert.doesNotThrow(() => assertBranchAction(db, local, "enroll", ["shared", "c3"]));
  assert.throws(() => assertBranchAction(db, local, "saveMaster", ["students", "shared", { branchId: "b1" }]), /cơ sở/);
  assert.throws(() => assertBranchAction(db, local, "saveMaster", ["students", null, {}]), /cơ sở/);
});

test("BRANCH08: teacher gets assigned sessions and redacted cross-branch makeup attendees only", () => {
  const db = fixture(), teacher = { id: "teacher", role: "teacher", teacherId: "t1", branchIds: ["b1"] };
  const out = visibleData(db, teacher);
  assert.deepEqual(out.sessions.map((s) => s.id), ["s1"]);
  assert.deepEqual(out.requests.map((r) => r.id), ["r3"]);
  assert(out.enrollments.some((e) => e.id === "e2"));
  assert(out.classes.some((c) => c.id === "c2" && c.branchId === "" && c.status === ""));
  assert(out.attendance.some((a) => a.sessionId === "s1" && a.enrollmentId === "e2"));
  assert(out.students.every((s) => s.balance === 0 && s.phone === undefined));
  assert(out.enrollments.every((e) => e.fee === 0));
  for (const table of ["payments", "refunds", "balanceLedger", "leads", "audit"])
    assert.equal(out[table].length, 0);
  assert.equal(out.requests[0].reason, undefined);
  assert.throws(() => assertBranchAction(db, teacher, "markAttendance", ["s3", []]), /phụ trách/);
  assert.throws(() => assertBranchAction(db, teacher, "addPayment", ["e1", {}]), /quyền/);
});

test("BRANCH09: active branch projection remains inside server grants and does not mutate snapshot", () => {
  const db = fixture(), multi = { ...local, branchIds: ["b1", "b2"] };
  const full = visibleData(db, multi), selected = scopeData(full, multi, "b2");
  assert.deepEqual(selected.branches.map((b) => b.id), ["b2"]);
  assert.deepEqual(selected.classes.map((c) => c.id), ["c2"]);
  assert.equal(selected.students.find((s) => s.id === "shared").balance, 90);
  assert.equal(full.branches.length, 2);
  assert.equal(scopeData(visibleData(db, local), local, "b2").students.length, 0);
});

test("BRANCH10: a second projection preserves safe balances without exposing ledger details", () => {
  const db = fixture(), user = { id: "en1", role: "enroll", branchIds: ["b1", "b2"] };
  const server = visibleData(db, user);
  assert.equal(server.balanceLedger.length, 0);
  const selected = scopeData(server, user, "b1");
  const student = selected.students.find((s) => s.id === "shared");
  assert.equal(student.balance, 10);
  assert.deepEqual(student.branchBalances, { b1: 10 });
  assert.equal(selected.balanceLedger.length, 0);
});

test("BRANCH11: teacher make-up attendee references survive server and client projection", () => {
  const db = fixture(), user = { id: "teacher", role: "teacher", teacherId: "t1", branchIds: ["b1"] };
  const selected = scopeData(visibleData(db, user), user, "b1");
  const attendees = R.attendees(selected, "s1");
  assert(attendees.some(({ e, makeup }) => e.id === "e2" && makeup.id === "r3"));
  assert(selected.students.some((s) => s.id === "st2" && s.balance === 0 && !s.phone));
  assert(selected.classes.some((c) => c.id === "c2"));
});

test("BRANCH12: a global scheduling check does not disclose a foreign class in scoped errors", () => {
  const db = fixture();
  db.students.find((s) => s.id === "shared").status = "Hoạt động";
  db.classes.find((c) => c.id === "c1").termId = "old-term";
  Object.assign(db.classes.find((c) => c.id === "c2"), { termId: "foreign-term", code: "SECRET-CLASS" });
  Object.assign(db.classes.find((c) => c.id === "c3"), { termId: "new-term", status: "Mở đăng ký" });
  Object.assign(db.sessions.find((s) => s.id === "s2"), { date: "2099-01-01", start: "18:00", end: "19:00", held: false });
  Object.assign(db.sessions.find((s) => s.id === "s3"), { date: "2099-01-01", start: "18:00", end: "19:00", held: false });
  const before = JSON.stringify(db);
  assert.throws(() => R.enroll(db, local, "shared", "c3"), (error) =>
    /trùng lịch/.test(error.message) && !error.message.includes("SECRET-CLASS"));
  assert.equal(JSON.stringify(db), before);
});
