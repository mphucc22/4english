// Upgrade stored records without resetting business data or granting staff new access.
export function migrateBranchData(db) {
  if ((db.meta.branchSchemaVersion || 0) > 1)
    throw Error("Phiên bản dữ liệu cơ sở mới hơn phần mềm hiện tại.");
  if (db.meta.branchSchemaVersion === 1) return false;

  const classBranch = (id) => db.classes.find((c) => c.id === id)?.branchId || null;
  const enrollmentBranch = (id) => {
    const enrollment = db.enrollments.find((e) => e.id === id);
    return enrollment?.branchId || classBranch(enrollment?.classId);
  };
  for (const enrollment of db.enrollments)
    enrollment.branchId ??= classBranch(enrollment.classId);
  for (const user of db.users) {
    if (user.role === "manager") user.branchIds = [];
    else if (!Object.hasOwn(user, "branchIds")) {
      user.branchIds = user.role === "teacher"
        ? [...new Set(db.sessions
          .filter((session) => session.teacherId === user.teacherId)
          .map((session) => classBranch(session.classId)).filter(Boolean))]
        : [];
    }
  }
  for (const student of db.students) {
    const first = db.enrollments.filter((e) => e.studentId === student.id)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))[0];
    student.branchId ??= first?.branchId || null;
  }
  for (const payment of db.payments)
    payment.branchId ??= enrollmentBranch(payment.enrollmentId);
  for (const reservation of db.reservations)
    reservation.branchId ??= enrollmentBranch(reservation.enrollmentId);
  for (const entry of db.balanceLedger)
    entry.branchId ??= enrollmentBranch(entry.ref);
  for (const refund of db.refunds) refund.branchId ??= null;
  for (const lead of db.leads) lead.branchId ??= null;
  for (const entry of db.audit) entry.branchIds ??= [];

  // Keep pre-existing balances recoverable by central management, without
  // attributing an unknown opening balance to a branch arbitrarily.
  for (const student of db.students) {
    const recorded = db.balanceLedger.filter((x) => x.studentId === student.id)
      .reduce((sum, x) => sum + x.amount, 0);
    if (recorded === student.balance) continue;
    db.balanceLedger.push({
      id: `opening-branch-${student.id}`,
      studentId: student.id,
      branchId: null,
      amount: student.balance - recorded,
      balanceAfter: student.balance,
      note: "Số dư cũ chưa xác định cơ sở; quản trị toàn hệ thống đối chiếu",
      ref: "branch-migration",
      date: new Date().toISOString().slice(0, 10),
    });
  }
  db.meta.branchSchemaVersion = 1;
  return true;
}
