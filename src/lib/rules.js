import { installClassRules } from "./class-rules.js";
import { installStaffRules } from "./staff-rules.js";
import { installEnrollmentRules } from "./enrollment-rules.js";
import { installRequestRules } from "./request-rules.js";
import { installAttendanceRules } from "./attendance-rules.js";
import { installReportRules } from "./report-rules.js";
import { installExtraRules } from "./extra-rules.js";
import { installMasterRules } from "./master-rules.js";
/* =====================================================================
 * rules.js – Lớp nghiệp vụ (service layer) của Trung tâm Anh ngữ ABC.
 * Mọi luật quan trọng được kiểm tra ở đây; giao diện chỉ gọi hàm.
 * Không phụ thuộc DOM nên có thể chạy kiểm thử độc lập (xem tests.js).
 *
 * CÁC CON SỐ TRONG CFG LÀ GIẢ ĐỊNH, cần giảng viên (chủ đầu tư) xác nhận.
 * ===================================================================== */
class RuleError extends Error {}
const fail = (m) => {
  throw new RuleError(m);
};

const U = {
  id: (p) =>
    p +
    "_" +
    (globalThis.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36)),
  iso(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  },
  parse(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  },
  today() {
    return U.iso(new Date());
  },
  addDays(s, n) {
    const d = U.parse(s);
    d.setDate(d.getDate() + n);
    return U.iso(d);
  },
  addMonths(s, n) {
    const d = U.parse(s),
      day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, end));
    return U.iso(d);
  },
  dow(s) {
    return U.parse(s).getDay();
  },
  monday(s) {
    const d = U.dow(s);
    return U.addDays(s, d === 0 ? -6 : 1 - d);
  },
  dmy(s) {
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  },
  vnd(n) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + " ₫";
  },
  DOW: ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
};

const CFG = {
  minStudents: 10, // sĩ số tối thiểu để mở lớp (đã xác nhận)
  maxStudents: 20, // sĩ số tối đa
  minPaidPct: 0.5, // đóng tối thiểu 50% học phí để được xác nhận chỗ
  maxReservePct: 0.5, // chỉ được bảo lưu khi đã học không quá 50% số buổi
  reserveMonths: 3, // thời hạn bảo lưu (1 chu kỳ)
  maxMakeup: 2, // số buổi học bù tối đa / đăng ký học
  pendingDays: 7, // giữ chỗ chờ đóng phí; giả định cần xác nhận
  lateJoin: 2, // lớp đã học quá số buổi này thì không nhận thêm
};
const LIVE = ["Chờ đóng phí", "Đã xác nhận", "Hoàn thành"]; // trạng thái chiếm chỗ trong lớp
const PERMS = {
  master: ["manager"],
  klass: ["manager"],
  approve: ["manager"],
  student: ["manager", "enroll"],
  enroll: ["manager", "enroll"],
  request: ["manager", "enroll"],
  lead: ["manager", "enroll"],
  pay: ["manager", "accountant"],
  report: ["manager", "accountant"],
  attend: ["manager", "teacher"],
};

const R = { CFG, LIVE, PERMS };

/* ---------- tiện ích truy cập dữ liệu ---------- */
R.can = (u, a) => !!u && (PERMS[a] || []).includes(u.role);
R.need = (u, a) => {
  if (!R.can(u, a)) fail("Bạn không có quyền thực hiện thao tác này.");
};
R.by = (db, col, id) => db[col].find((x) => x.id === id);
R.must = (db, col, id, label) =>
  R.by(db, col, id) || fail(`Không tìm thấy ${label || col}.`);
R.atomic = (db, fn) => {
  // lỗi giữa chừng => khôi phục nguyên trạng
  const snap = JSON.stringify(db);
  try {
    return fn();
  } catch (e) {
    const o = JSON.parse(snap);
    Object.keys(db).forEach((k) => delete db[k]);
    Object.assign(db, o);
    throw e;
  }
};
R.paid = (db, eid) =>
  db.payments
    .filter((p) => p.enrollmentId === eid && !p.voided)
    .reduce((s, p) => s + p.amount, 0);
R.due = (db, e) => Math.max(0, (e.billableFee ?? e.fee) - R.paid(db, e.id));
R.collectible = (db, e) =>
  R.due(db, e) > 0 && (LIVE.includes(e.status) || Number(e.billableFee) > 0);
R.memberOn = (e, s) =>
  s.date >= (e.effectiveFrom || e.createdAt || "0000-01-01") &&
  (!e.effectiveTo || s.date < e.effectiveTo);
R.validDate = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && U.iso(U.parse(d)) === d;
R.validTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t));
R.live = (db, cid) =>
  db.enrollments.filter((e) => e.classId === cid && LIVE.includes(e.status));
R.confirmed = (db, cid) =>
  db.enrollments.filter(
    (e) =>
      e.classId === cid &&
      (e.status === "Đã xác nhận" || e.status === "Hoàn thành"),
  );
R.sessions = (db, cid) =>
  db.sessions.filter((s) => s.classId === cid).sort((a, b) => a.no - b.no);
R.held = (db, cid) => R.sessions(db, cid).filter((s) => s.held).length;
R.classLabel = (db, c) => (c ? c.code : "");
R.scheduleText = (c) =>
  c && c.weekdays && c.weekdays.length
    ? `${c.weekdays.map((d) => U.DOW[d]).join(", ")} · ${c.start}-${c.end}`
    : "Chưa xếp lịch";

/* ---------- kiểm tra trùng lịch ---------- */
const overlap = (a, b) =>
  a.date === b.date && a.start < b.end && b.start < a.end;

R.resourceConflicts = (db, sessions, roomId, teacherId, excludeClassId) => {
  const out = [],
    room = R.by(db, "rooms", roomId),
    tch = R.by(db, "teachers", teacherId);
  for (const t of sessions)
    for (const s of db.sessions) {
      if (s.classId === excludeClassId || !overlap(s, t)) continue;
      const c = R.by(db, "classes", s.classId);
      if (!c || c.status === "Đã hủy") continue;
      if (s.roomId === roomId)
        out.push(
          `phòng ${room.name} đã có lớp ${c ? c.code : "?"} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`,
        );
      if (s.teacherId === teacherId)
        out.push(
          `giáo viên ${tch.name} đã dạy lớp ${c ? c.code : "?"} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`,
        );
    }
  return [...new Set(out)];
};

R.studentConflict = (
  db,
  studentId,
  classId,
  excludeEid,
  proposed,
  excludeRequestId,
) => {
  const mine = (proposed || R.sessions(db, classId)).filter(
    (s) => !s.held && s.date >= U.today(),
  );
  for (const e of db.enrollments) {
    if (
      e.studentId !== studentId ||
      !LIVE.includes(e.status) ||
      e.id === excludeEid ||
      e.classId === classId
    )
      continue;
    for (const s of R.sessions(db, e.classId).filter(
      (x) => !x.held && R.memberOn(e, x),
    ))
      for (const t of mine) {
        if (overlap(s, t))
          return `Học viên trùng lịch với lớp ${R.by(db, "classes", e.classId).code} ngày ${U.dmy(t.date)} (${s.start}-${s.end}).`;
      }
  }
  for (const r of db.requests) {
    if (
      r.id === excludeRequestId ||
      r.type !== "makeup" ||
      !["Chờ duyệt", "Đã duyệt"].includes(r.status)
    )
      continue;
    const e = R.by(db, "enrollments", r.data.enrollmentId),
      target = R.by(db, "sessions", r.data.targetSessionId);
    if (
      e?.studentId === studentId &&
      target &&
      !target.held &&
      mine.some((s) => s.id !== target.id && overlap(s, target))
    )
      return "Học viên trùng lịch với một yêu cầu học bù.";
  }
  return null;
};

installClassRules(R, U, CFG, fail);
installStaffRules(R, U, CFG, fail);
installEnrollmentRules(R, U, CFG, fail);
installRequestRules(R, U, CFG, fail, overlap);
installAttendanceRules(R, U, CFG, fail);
installReportRules(R, U, CFG, fail);
installExtraRules(R, U, CFG, fail);
installMasterRules(R, U, fail);
export { R, U, CFG, RuleError, fail, LIVE };
