/** Dịch vụ Attendance: được rules.js khởi tạo vào đối tượng R. */
export function installAttendanceRules(R, U, CFG, fail) {
  /* ---------- điểm danh ---------- */
  R.attendees = (db, sessionId) => {
    const s = R.must(db, "sessions", sessionId, "buổi học");
    const rows = db.enrollments
      .filter(
        (e) =>
          e.classId === s.classId &&
          ((["Đã xác nhận", "Hoàn thành"].includes(e.status) &&
            R.memberOn(e, s)) ||
            db.attendance.some(
              (a) => a.sessionId === sessionId && a.enrollmentId === e.id,
            )),
      )
      .map((e) => ({ e, makeup: null }));
    db.requests
      .filter(
        (r) =>
          r.type === "makeup" &&
          r.status === "Đã duyệt" &&
          r.data.targetSessionId === sessionId,
      )
      .forEach((r) =>
        rows.push({
          e: R.by(db, "enrollments", r.data.enrollmentId),
          makeup: r,
        }),
      );
    return rows;
  };
  R.markAttendance = (db, u, sessionId, entries) => {
    R.need(u, "attend");
    return R.atomic(db, () => {
      const s = R.must(db, "sessions", sessionId, "buổi học");
      if (u.role === "teacher" && s.teacherId !== u.teacherId)
        fail("Bạn chỉ điểm danh được buổi học do mình phụ trách.");
      const c = R.must(db, "classes", s.classId, "lớp");
      if (c.status !== "Đang học" && !(c.status === "Kết thúc" && s.held))
        fail(
          "Chỉ điểm danh lớp Đang học, hoặc sửa điểm danh lịch sử của lớp Kết thúc.",
        );
      if (s.date > U.today()) fail("Chưa đến ngày học, chưa thể điểm danh.");
      const allowed = R.attendees(db, sessionId);
      if (
        !Array.isArray(entries) ||
        entries.length !== allowed.length ||
        new Set(entries.map((e) => e.enrollmentId)).size !== entries.length
      )
        fail("Phải điểm danh đầy đủ danh sách của buổi học.");
      for (const en of entries) {
        const row = allowed.find((a) => a.e.id === en.enrollmentId);
        if (!row) fail("Học viên không thuộc buổi học này.");
        if (!["Có mặt", "Vắng"].includes(en.status))
          fail("Trạng thái điểm danh không hợp lệ.");
        let a = db.attendance.find(
          (x) =>
            x.sessionId === sessionId && x.enrollmentId === en.enrollmentId,
        );
        if (!a) {
          a = {
            id: U.id("at"),
            sessionId,
            enrollmentId: en.enrollmentId,
            studentId: row.e.studentId,
          };
          db.attendance.push(a);
        }
        a.status = en.status;
        if (row.makeup) {
          a.makeupReq = row.makeup.id;
          row.makeup.data.done = en.status === "Có mặt";
        }
      }
      s.held = true;
      return s;
    });
  };
}
