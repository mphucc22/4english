import { R, RuleError } from "../../src/lib/rules.js";
import { scopeData } from "../../src/lib/branch-access.js";
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
  const out = scopeData(db, user);
  out.users =
    ["manager", "branch_manager"].includes(user?.role)
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
    out.teachers = out.teachers
      .filter((t) => t.status === "Đang dạy")
      .map(({ id, name, specialty }) => ({
        id,
        name,
        specialty,
      }));
  }
  if (!["manager", "branch_manager"].includes(user?.role)) out.audit = [];
  if (!["manager", "branch_manager", "enroll"].includes(user?.role)) out.leads = [];
  if (!["manager", "branch_manager", "accountant"].includes(user?.role)) {
    out.refunds = [];
    out.balanceLedger = [];
  }
  return out;
}
