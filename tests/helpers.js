import { R, U, CFG } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
export const manager = { id: "sys", role: "manager", name: "Quản lý" },
  accountant = { id: "ac", role: "accountant", name: "Kế toán", branchIds: ["br1", "br2", "br3", "br4"] },
  enrollment = { id: "en", role: "enroll", name: "Ghi danh", branchIds: ["br1", "br2", "br3", "br4"] };
export function fixture() {
  return Seed.minimal();
}
export function klass(
  db,
  {
    course = "co2",
    branch = "br1",
    room = "br1r1",
    teacher = "gv1",
    start = "18:00",
    end = "19:30",
    weekdays = [2, 4],
    term = db.terms[1].id,
    open = true,
  } = {},
) {
  const c = R.createClass(db, manager, {
    courseId: course,
    branchId: branch,
    termId: term,
  });
  R.setSchedule(db, manager, c.id, {
    roomId: room,
    teacherId: teacher,
    weekdays,
    start,
    end,
    startDate: R.by(db, "terms", term).start,
  });
  if (open) R.openRegistration(db, manager, c.id);
  return c;
}
export function fill(db, c, { n = 10, paid = true, prefix = "f" } = {}) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const st = {
      id: prefix + i,
      code: (prefix + i).toUpperCase(),
      name: "Học viên " + i,
      status: "Hoạt động",
      level: "A1",
      balance: 0,
    };
    db.students.push(st);
    const e = R.enroll(db, manager, st.id, c.id);
    if (paid)
      R.addPayment(db, accountant, e.id, { amount: e.fee, method: "Tiền mặt" });
    rows.push(e);
  }
  return rows;
}
export function pastSession(db, c, days = -1, absent = []) {
  const s = R.sessions(db, c.id).find((s) => !s.held);
  s.date = U.addDays(U.today(), days);
  db.enrollments
    .filter((e) => e.classId === c.id)
    .forEach((e) => (e.effectiveFrom = U.addDays(s.date, -5)));
  R.markAttendance(
    db,
    manager,
    s.id,
    R.attendees(db, s.id).map(({ e }) => ({
      enrollmentId: e.id,
      status: absent.includes(e.id) ? "Vắng" : "Có mặt",
    })),
  );
  return s;
}
