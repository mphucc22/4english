import { isLoginAllowed } from "./teacher-identity.js";

// Branch grants are independent from job permissions. Missing grants fail closed.
export const isGlobal = (user) => user?.role === "manager";

export const BRANCH_PERMISSIONS = {
  system: ["manager"],
  staff: ["manager", "branch_manager"],
  master: ["manager", "branch_manager"],
  klass: ["manager", "branch_manager"],
  approve: ["manager", "branch_manager"],
  student: ["manager", "branch_manager", "enroll"],
  enroll: ["manager", "branch_manager", "enroll"],
  request: ["manager", "branch_manager", "enroll"],
  lead: ["manager", "branch_manager", "enroll"],
  pay: ["manager", "branch_manager", "accountant"],
  report: ["manager", "branch_manager", "accountant"],
  attend: ["manager", "branch_manager", "teacher"],
};

export const ACTION_PERMISSIONS = {
  createClass: "klass", updateClass: "klass", deleteClass: "klass",
  setSchedule: "klass", openRegistration: "klass", confirmOpen: "klass",
  finishClass: "klass", cancelClass: "klass", changeSession: "klass",
  enroll: "enroll", resume: "enroll", addPayment: "pay",
  createRequest: "request", approve: "approve", reject: "approve",
  cancelEnrollment: "approve", refundBalance: "approve", voidPayment: "approve",
  markAttendance: "attend", saveUser: "staff", deleteUser: "staff",
  setLeadStatus: "lead", saveMaster: "master", deleteMaster: "master",
};

export function allowedBranchIds(db, user) {
  const available = new Set((db.branches || []).map((b) => b.id));
  const assigned = isGlobal(user)
    ? [...available]
    : [...new Set(Array.isArray(user?.branchIds) ? user.branchIds : [])]
      .filter((id) => available.has(id));
  return user?.activeBranchId
    ? assigned.filter((id) => id === user.activeBranchId)
    : assigned;
}

export function canManageTeacher(db, user, teacher) {
  if (!teacher) return false;
  if (isGlobal(user)) return true;
  if (user?.role !== "branch_manager" ||
    (db.meta?.isScopedSnapshot && teacher.profileManageable === false)) return false;
  const allowed = new Set(allowedBranchIds(db, user));
  if (!Array.isArray(teacher.branchIds) || !teacher.branchIds.length ||
    !teacher.branchIds.every((id) => allowed.has(id))) return false;
  // A profile edit also synchronizes its linked account. Existing grants must
  // belong to this manager too, including legacy accounts awaiting review.
  return db.users.filter((account) => account.role === "teacher" && account.teacherId === teacher.id)
    .every((account) => Array.isArray(account.branchIds) && account.branchIds.length > 0 &&
      account.branchIds.every((id) => allowed.has(id)));
}

const find = (db, table, id) =>
  (Array.isArray(db[table]) ? db[table] : []).find((row) => row.id === id);
const classBranch = (db, id) => find(db, "classes", id)?.branchId;
export const enrollmentBranch = (db, id) =>
  classBranch(db, find(db, "enrollments", id)?.classId);
const sessionBranch = (db, id) => classBranch(db, find(db, "sessions", id)?.classId);

function requestBranches(db, type, data = {}) {
  data ||= {};
  const ids = [enrollmentBranch(db, data.enrollmentId)];
  if (type === "transfer") ids.push(classBranch(db, data.toClassId));
  if (type === "makeup")
    ids.push(sessionBranch(db, data.missedSessionId), sessionBranch(db, data.targetSessionId));
  return ids;
}

// Resolve ownership from stored entities, never from a client-supplied branch label.
export function actionBranchIds(db, action, args = []) {
  const [id, value] = args;
  switch (action) {
    case "createClass": return [id?.branchId];
    case "updateClass": return [classBranch(db, id), value?.branchId];
    case "setSchedule": return [classBranch(db, id), find(db, "rooms", value?.roomId)?.branchId];
    case "deleteClass": case "openRegistration": case "confirmOpen":
    case "finishClass": case "cancelClass": return [classBranch(db, id)];
    case "enroll": return [classBranch(db, value)];
    case "addPayment": case "cancelEnrollment": return [enrollmentBranch(db, id)];
    case "createRequest": return requestBranches(db, id, value);
    case "approve": case "reject": {
      const request = find(db, "requests", id);
      return requestBranches(db, request?.type, request?.data);
    }
    case "resume": return [enrollmentBranch(db, find(db, "reservations", id)?.enrollmentId), classBranch(db, value)];
    case "markAttendance": return [sessionBranch(db, id)];
    case "changeSession": return [sessionBranch(db, id), find(db, "rooms", value?.roomId)?.branchId];
    case "voidPayment": {
      const payment = find(db, "payments", id);
      return [payment?.branchId || enrollmentBranch(db, payment?.enrollmentId), enrollmentBranch(db, payment?.enrollmentId)];
    }
    case "setLeadStatus": return [find(db, "leads", id)?.branchId];
    case "refundBalance": return value?.branchId ? [value.branchId] : [];
    case "saveMaster": {
      const [table, rowId, payload] = args;
      if (table === "teachers") {
        const previous = find(db, "teachers", rowId)?.branchIds;
        const requested = payload?.branchIds ?? previous;
        return [
          ...(Array.isArray(previous) ? previous : []),
          ...(Array.isArray(requested) ? requested : []),
        ];
      }
      if (!["rooms", "students"].includes(table)) return [];
      return [
        ...(rowId ? [find(db, table, rowId)?.branchId] : []),
        payload?.branchId || find(db, table, rowId)?.branchId,
      ];
    }
    case "deleteMaster": {
      const row = find(db, id, value);
      return id === "teachers" ? (Array.isArray(row?.branchIds) ? [...row.branchIds] : []) : [row?.branchId];
    }
    default: return [];
  }
}

export function studentVisible(db, user, studentId) {
  const student = find(db, "students", studentId);
  if (!student) return false;
  const allowed = new Set(allowedBranchIds(db, user));
  return allowed.has(student.branchId) || (db.enrollments || []).some(
    (e) => e.studentId === studentId && allowed.has(classBranch(db, e.classId)),
  );
}

const forbidden = (message) => { throw Object.assign(new Error(message), { status: 403 }); };

export function assertBranchAction(db, user, action, args = [], deny = forbidden) {
  let permission = ACTION_PERMISSIONS[action];
  if (["saveMaster", "deleteMaster"].includes(action) && args[0] === "students")
    permission = "student";
  if (!permission || !BRANCH_PERMISSIONS[permission]?.includes(user?.role))
    return deny("Bạn không có quyền thực hiện thao tác này.");

  // Staff rules separately validate account grants and prevent privilege escalation.
  if (["saveUser", "deleteUser"].includes(action)) return [];
  if (["saveMaster", "deleteMaster"].includes(action) && args[0] === "teachers") {
    if (isGlobal(user)) return actionBranchIds(db, action, args).filter(Boolean);
    const old = args[1] ? find(db, "teachers", args[1]) : null;
    if (args[1] && !canManageTeacher(db, user, old))
      return deny("Bạn chỉ được quản lý giáo viên có toàn bộ cơ sở công tác thuộc phạm vi được giao. Chọn đủ các cơ sở liên quan trước khi sửa.");
    const requested = action === "saveMaster" ? args[2]?.branchIds ?? old?.branchIds : old?.branchIds;
    const allowed = new Set(allowedBranchIds(db, user));
    if (!Array.isArray(requested) || !requested.length ||
      requested.some((id) => typeof id !== "string" || !allowed.has(id)))
      return deny("Chọn cơ sở công tác của giáo viên trong phạm vi được giao.");
    return [...new Set(actionBranchIds(db, action, args).filter(Boolean))];
  }
  if (["saveMaster", "deleteMaster"].includes(action) && !["students", "rooms"].includes(args[0])) {
    if (!isGlobal(user)) return deny("Chỉ quản trị toàn hệ thống được thay đổi danh mục dùng chung.");
    return [];
  }
  // Explicit attribution also makes replay authorization independent of a
  // student's other enrollments or a later change of branch assignments.
  if (action === "refundBalance" && (!isGlobal(user) || user.activeBranchId) &&
      !args[1]?.branchId)
    return deny("Chọn cơ sở ghi nhận khoản hoàn tiền.");
  if (isGlobal(user) && !user.activeBranchId) return actionBranchIds(db, action, args).filter(Boolean);
  const allowed = new Set(allowedBranchIds(db, user));
  if (!allowed.size) return deny("Tài khoản chưa được giao cơ sở. Liên hệ quản trị để được phân quyền.");
  const branches = actionBranchIds(db, action, args);
  if (branches.some((branchId) => !branchId || !allowed.has(branchId)))
    return deny("Bạn không có quyền thao tác dữ liệu của cơ sở này.");
  if (action === "markAttendance" && user.role === "teacher" &&
      find(db, "sessions", args[0])?.teacherId !== user.teacherId)
    return deny("Bạn chỉ điểm danh được buổi học do mình phụ trách.");
  if (action === "enroll" && !studentVisible(db, user, args[0]))
    return deny("Học viên chưa thuộc phạm vi cơ sở được giao.");
  if (action === "refundBalance" && !studentVisible(db, user, args[0]))
    return deny("Học viên chưa thuộc phạm vi cơ sở được giao.");
  return [...new Set(branches.filter(Boolean))];
}

export function installBranchGuards(R, fail) {
  R.authorizeAction = (db, user, action, args) => assertBranchAction(db, user, action, args, fail);
  for (const action of Object.keys(ACTION_PERMISSIONS)) {
    const original = R[action];
    R[action] = (db, user, ...args) => {
      R.authorizeAction(db, user, action, args);
      try {
        return original(db, user, ...args);
      } catch (error) {
        // Scheduling is checked globally for shared teachers/students. Do not
        // reveal another branch's class code or timetable through an error.
        if ((!isGlobal(user) || user.activeBranchId) &&
            /trùng.*(?:lịch|phòng|giáo viên)|(?:lịch|phòng|giáo viên|học viên).*trùng|xung đột/i.test(error.message || ""))
          error.message = "Không thể lưu vì trùng lịch với một lịch đã có. Hãy chọn thời gian hoặc giáo viên khác.";
        throw error;
      }
    };
  }
}

// Shared by server snapshots and the client's active-branch view. Input is never mutated.
export function scopeData(db, user, selectedBranchId = "") {
  const out = structuredClone(db);
  const projected = db.meta?.isScopedSnapshot === true;
  const grants = new Set(allowedBranchIds(db, { ...user, activeBranchId: "" }));
  out.users = out.users.map((account) => ({
    ...account,
    loginAllowed: projected && typeof account.loginAllowed === "boolean"
      ? account.loginAllowed : isLoginAllowed(db, account),
  }));
  out.teachers = out.teachers.map((teacher) => ({
    ...teacher,
    branchIds: teacher.branchIds || [],
    accountLinked: projected ? teacher.accountLinked === true :
      db.users.some((account) => account.role === "teacher" && account.teacherId === teacher.id),
    accountManageable: projected ? teacher.accountManageable === true :
      isGlobal(user) || (user?.role === "branch_manager" && teacher.branchIds?.length > 0 &&
        teacher.branchIds.every((id) => grants.has(id))),
    profileManageable: projected ? teacher.profileManageable === true : canManageTeacher(db, user, teacher),
  }));
  out.meta.isScopedSnapshot = true;
  if (!user || (isGlobal(user) && !selectedBranchId && !user.activeBranchId)) return out;
  const allowed = new Set(allowedBranchIds(db, user));
  const selected = selectedBranchId || user.activeBranchId;
  const branches = new Set([...allowed].filter((id) => !selected || id === selected));
  const inBranch = (id) => !!id && branches.has(id);
  out.branches = out.branches.filter((b) => inBranch(b.id));
  out.rooms = out.rooms.filter((r) => inBranch(r.branchId));
  out.classes = out.classes.filter((c) => inBranch(c.branchId));
  let classIds = new Set(out.classes.map((c) => c.id));
  out.sessions = out.sessions.filter((s) => classIds.has(s.classId));
  if (user.role === "teacher") {
    out.sessions = out.sessions.filter((s) => s.teacherId === user.teacherId);
    classIds = new Set(out.sessions.map((s) => s.classId));
    out.classes = out.classes.filter((c) => classIds.has(c.id));
  }
  const sessionIds = new Set(out.sessions.map((s) => s.id));
  out.enrollments = out.enrollments.filter((e) => classIds.has(e.classId));
  let enrollmentIds = new Set(out.enrollments.map((e) => e.id));
  if (user.role === "teacher") {
    out.requests = out.requests.filter((r) => r.type === "makeup" && sessionIds.has(r.data.targetSessionId));
    const externalIds = new Set(out.requests.map((r) => r.data.enrollmentId));
    out.enrollments = db.enrollments.filter((e) => enrollmentIds.has(e.id) || externalIds.has(e.id))
      .map(({ id, studentId, classId, status, createdAt, effectiveFrom, effectiveTo }) =>
        ({ id, studentId, classId, status, createdAt, effectiveFrom, effectiveTo, fee: 0, billableFee: 0 }));
    enrollmentIds = new Set(out.enrollments.map((e) => e.id));
    const externalClasses = new Set(out.enrollments.filter((e) => !classIds.has(e.classId)).map((e) => e.classId));
    out.classes.push(...db.classes.filter((c) => externalClasses.has(c.id)).map(({ id, code, courseId }) =>
      ({ id, code, courseId, branchId: "", status: "" })));
    out.requests = out.requests.map(({ id, type, status, studentId, data }) =>
      ({ id, type, status, studentId, data: { enrollmentId: data.enrollmentId, targetSessionId: data.targetSessionId, done: data.done } }));
  } else {
    out.requests = out.requests.filter((r) => requestBranches(db, r.type, r.data).every(inBranch));
  }
  const studentIds = new Set(out.enrollments.map((e) => e.studentId));
  out.students = out.students.filter((s) => studentIds.has(s.id) || (user.role !== "teacher" && inBranch(s.branchId)));
  const visibleStudents = new Set(out.students.map((s) => s.id));
  out.attendance = out.attendance.filter((a) => sessionIds.has(a.sessionId) && enrollmentIds.has(a.enrollmentId));
  out.payments = out.payments.filter((p) => enrollmentIds.has(p.enrollmentId) && inBranch(p.branchId || enrollmentBranch(db, p.enrollmentId)));
  out.reservations = out.reservations.filter((r) => enrollmentIds.has(r.enrollmentId));
  out.leads = out.leads.filter((l) => inBranch(l.branchId));
  out.refunds = out.refunds.filter((r) => visibleStudents.has(r.studentId) && inBranch(r.branchId));
  const balances = new Map();
  const branchBalances = new Map();
  out.balanceLedger = out.balanceLedger.filter((entry) => visibleStudents.has(entry.studentId) && inBranch(entry.branchId))
    .map((entry) => {
      const balanceAfter = (balances.get(entry.studentId) || 0) + entry.amount;
      balances.set(entry.studentId, balanceAfter);
      const key = `${entry.studentId}\0${entry.branchId}`;
      branchBalances.set(key, (branchBalances.get(key) || 0) + entry.amount);
      return { ...entry, balanceAfter };
    });
  out.students = out.students.map((student) => {
    // Safe summaries survive a second client projection even when that role cannot
    // read ledger entries. Include only branches already permitted in this view.
    const summary = Object.fromEntries([...branches].map((branchId) => [branchId,
      student.branchBalances?.[branchId] ?? branchBalances.get(`${student.id}\0${branchId}`) ?? 0,
    ]));
    return { ...student, branchBalances: summary, balance: Object.values(summary).reduce((sum, value) => sum + value, 0) };
  });
  out.audit = out.audit.filter((entry) => Array.isArray(entry.branchIds) && entry.branchIds.length && entry.branchIds.every(inBranch));
  const ownGrants = new Set(Array.isArray(user.branchIds) ? user.branchIds : []);
  out.users = out.users.filter((target) => {
    if (target.id === user.id) return true;
    const grants = target.branchIds;
    return (isGlobal(user) || (user.role === "branch_manager" && !["manager", "branch_manager"].includes(target.role))) &&
      Array.isArray(grants) && grants.length > 0 && grants.some(inBranch) &&
      (isGlobal(user) || grants.every((id) => ownGrants.has(id)));
  });
  const scheduledTeachers = new Set(out.sessions.map((s) => s.teacherId));
  out.teachers = out.teachers.filter((teacher) =>
    teacher.branchIds.some(inBranch) || scheduledTeachers.has(teacher.id)
  ).map((teacher) => {
    const details = scheduledTeachers.has(teacher.id) || teacher.profileManageable ? teacher :
      (({ id, code, name, specialty, status }) => ({ id, code, name, specialty, status }))(teacher);
    return {
      ...details,
      branchIds: isGlobal(user) || teacher.accountManageable
        ? [...teacher.branchIds] : teacher.branchIds.filter((id) => grants.has(id)),
      accountLinked: teacher.accountLinked,
      accountManageable: teacher.accountManageable,
      profileManageable: teacher.profileManageable,
    };
  });
  out.meta = { version: db.meta.version, revision: db.meta.revision, receiptSeq: db.meta.receiptSeq, isScopedSnapshot: true };
  if (user.role === "teacher") {
    out.students = out.students.map(({ id, code, name, level, status }) => ({ id, code, name, level, status, balance: 0 }));
    out.payments = [];
    out.reservations = [];
    out.refunds = [];
    out.balanceLedger = [];
    out.leads = [];
    out.audit = [];
  }
  return out;
}
