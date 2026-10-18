import { R, RuleError } from "../../src/lib/rules.js";
export const actions = Object.fromEntries(
  [
    "createClass",
    "updateClass",
    "deleteClass",
    "setSchedule",
    "openRegistration",
    "confirmOpen",
    "finishClass",
    "cancelClass",
    "enroll",
    "addPayment",
    "createRequest",
    "approve",
    "reject",
    "resume",
    "markAttendance",
    "saveUser",
    "deleteUser",
    "saveMaster",
    "deleteMaster",
    "setLeadStatus",
    "cancelEnrollment",
    "refundBalance",
    "voidPayment",
    "changeSession",
  ].map((key) => [key, R[key]]),
);
export function dispatch(db, user, action, args) {
  if (
    !Object.hasOwn(actions, action) ||
    !Array.isArray(args) ||
    args.length > 5
  )
    throw new RuleError("Thao tác không hợp lệ.");
  return actions[action](db, user, ...args);
}
export function visibleData(db, user) {
  const out = structuredClone(db);
  out.users =
    user?.role === "manager"
      ? out.users
      : out.users.filter((u) => u.id === user?.id);
  for (const u of out.users) {
    delete u.password;
    delete u.passwordHash;
  }
  if (!user) {
    for (const key of Object.keys(out))
      if (
        key !== "meta" &&
        ![
          "branches",
          "courses",
          "terms",
          "classes",
          "teachers",
          "rooms",
        ].includes(key)
      )
        out[key] = [];
    out.classes = out.classes.filter((c) =>
      ["Mở đăng ký", "Đang học"].includes(c.status),
    );
    out.teachers = out.teachers.map(({ id, name, specialty }) => ({
      id,
      name,
      specialty,
    }));
  } else if (user.role === "teacher") {
    out.sessions = out.sessions.filter((s) => s.teacherId === user.teacherId);
    const classIds = new Set(out.sessions.map((s) => s.classId)),
      sessionIds = new Set(out.sessions.map((s) => s.id));
    out.classes = out.classes.filter((c) => classIds.has(c.id));
    out.requests = out.requests.filter(
      (r) => r.type === "makeup" && sessionIds.has(r.data.targetSessionId),
    );
    const eids = new Set(out.requests.map((r) => r.data.enrollmentId));
    out.enrollments = out.enrollments
      .filter((e) => classIds.has(e.classId) || eids.has(e.id))
      .map((e) => ({ ...e, fee: 0, billableFee: 0 }));
    const sids = new Set(out.enrollments.map((e) => e.studentId));
    out.students = out.students
      .filter((s) => sids.has(s.id))
      .map(({ id, code, name, level, status }) => ({
        id,
        code,
        name,
        level,
        status,
        balance: 0,
      }));
    out.attendance = out.attendance.filter((a) => sessionIds.has(a.sessionId));
    out.payments = [];
    out.reservations = [];
  }
  if (user?.role !== "manager") out.audit = [];
  if (!["manager", "enroll"].includes(user?.role)) out.leads = [];
  if (!["manager", "accountant"].includes(user?.role)) {
    out.refunds = [];
    out.balanceLedger = [];
  }
  return out;
}
