/** Dịch vụ Report: được rules.js khởi tạo vào đối tượng R. */
export function installReportRules(R, U, CFG, fail) {
  const LIVE = R.LIVE;
  /* ---------- báo cáo ---------- */
  R.report = (db) => {
    const classOf = (eid) => {
      const e = R.by(db, "enrollments", eid);
      return e && R.by(db, "classes", e.classId);
    };
    const byBranch = db.branches.map((b) => {
      const cls = db.classes.filter(
        (c) => c.branchId === b.id && c.status !== "Đã hủy",
      );
      const ens = db.enrollments.filter(
        (e) =>
          (LIVE.includes(e.status) || R.collectible(db, e)) &&
          cls.some((c) => c.id === e.classId),
      );
      const revenue = db.payments
        .filter(
          (p) =>
            p.type === "Thu" &&
            !p.voided &&
            (classOf(p.enrollmentId) || {}).branchId === b.id,
        )
        .reduce((s, p) => s + p.amount, 0);
      const receivable = ens.reduce((s, e) => s + R.due(db, e), 0);
      return {
        b,
        classes: cls.length,
        running: cls.filter((c) => c.status === "Đang học").length,
        students: ens.length,
        revenue,
        receivable,
      };
    });
    const byCourse = db.courses.map((co) => {
      const cls = db.classes.filter(
        (c) => c.courseId === co.id && c.status !== "Đã hủy",
      );
      const students = db.enrollments.filter(
        (e) => LIVE.includes(e.status) && cls.some((c) => c.id === e.classId),
      ).length;
      return { co, classes: cls.length, students };
    });
    const att = db.attendance.length
      ? db.attendance.filter((a) => a.status === "Có mặt").length /
        db.attendance.length
      : null;
    return { byBranch, byCourse, attRate: att };
  };
}
