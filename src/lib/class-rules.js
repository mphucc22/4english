/** Dịch vụ Class: được rules.js khởi tạo vào đối tượng R. */
export function installClassRules(R, U, CFG, fail) {
  const LIVE = R.LIVE;
  const nextCode = (db, course, br, term) => {
    const prefix = `${course.code}-${br.code}-${term.code}-`;
    db.meta.classSeq ||= {};
    const max = Math.max(
      db.meta.classSeq[prefix] || 0,
      ...db.classes
        .filter((c) => c.code.startsWith(prefix))
        .map((c) => Number(c.code.slice(prefix.length)) || 0),
    );
    db.meta.classSeq[prefix] = max + 1;
    return prefix + String(max + 1).padStart(2, "0");
  };

  /* ---------- lớp học & lịch ---------- */
  R.createClass = (db, u, p) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const course = R.must(db, "courses", p.courseId, "khóa học"),
        br = R.must(db, "branches", p.branchId, "chi nhánh"),
        term = R.must(db, "terms", p.termId, "đợt đào tạo");
      const c = {
        id: U.id("cl"),
        code: nextCode(db, course, br, term),
        courseId: course.id,
        branchId: br.id,
        termId: term.id,
        status: "Nháp",
        weekdays: [],
        start: "",
        end: "",
        roomId: "",
        teacherId: "",
        startDate: "",
      };
      db.classes.push(c);
      return c;
    });
  };

  R.setSchedule = (db, u, classId, p) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const c = R.must(db, "classes", classId, "lớp"),
        course = R.by(db, "courses", c.courseId),
        term = R.by(db, "terms", c.termId);
      if (!["Nháp", "Mở đăng ký"].includes(c.status))
        fail("Chỉ sửa được lịch khi lớp ở trạng thái Nháp hoặc Mở đăng ký.");
      const wd = [...new Set((p.weekdays || []).map(Number))];
      if (!wd.length || wd.some((x) => !Number.isInteger(x) || x < 0 || x > 6))
        fail("Chọn ngày học hợp lệ (0–6).");
      if (
        !Number.isInteger(course.sessions) ||
        course.sessions < 1 ||
        course.sessions > 366
      )
        fail("Số buổi của khóa học phải từ 1 đến 366.");
      if (!R.validTime(p.start) || !R.validTime(p.end) || p.start >= p.end)
        fail("Giờ học không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).");
      const room = R.must(db, "rooms", p.roomId, "phòng học"),
        tch = R.must(db, "teachers", p.teacherId, "giáo viên");
      if (room.branchId !== c.branchId)
        fail("Phòng học không thuộc chi nhánh của lớp.");
      if (tch.status !== "Đang dạy") fail("Giáo viên này hiện không nhận lớp.");
      if (
        !R.validDate(p.startDate) ||
        p.startDate < term.start ||
        p.startDate > term.end
      )
        fail(
          `Ngày khai giảng phải nằm trong ${term.name} (${U.dmy(term.start)} – ${U.dmy(term.end)}).`,
        );
      const list = [];
      let d = p.startDate;
      while (list.length < course.sessions) {
        if (wd.includes(U.dow(d))) list.push(d);
        d = U.addDays(d, 1);
      }
      const oldSessions = R.sessions(db, classId);
      if (
        oldSessions.some((x) => x.held) ||
        db.requests.some(
          (r) =>
            r.type === "makeup" &&
            oldSessions.some((x) =>
              [r.data.missedSessionId, r.data.targetSessionId].includes(x.id),
            ),
        )
      )
        fail(
          "Lịch đã có điểm danh hoặc yêu cầu học bù. Hãy điều chỉnh từng buổi chưa học.",
        );
      const ss = list.map((date, i) => ({
        id: oldSessions[i]?.id || U.id("ss"),
        classId,
        no: i + 1,
        date,
        start: p.start,
        end: p.end,
        roomId: room.id,
        teacherId: tch.id,
        held: false,
      }));
      const cf = R.resourceConflicts(db, ss, room.id, tch.id, classId);
      if (cf.length)
        fail(
          "Không thể lưu lịch vì trùng: " +
            cf.slice(0, 3).join("; ") +
            (cf.length > 3 ? ` … (và ${cf.length - 3} xung đột khác)` : "") +
            ".",
        );
      if (R.live(db, classId).length > room.capacity)
        fail("Phòng học không đủ sức chứa học viên đã đăng ký.");
      for (const e of R.live(db, classId)) {
        const err = R.studentConflict(db, e.studentId, classId, e.id, ss);
        if (err) fail(err);
      }
      db.sessions = db.sessions.filter((s) => s.classId !== classId).concat(ss);
      Object.assign(c, {
        weekdays: wd,
        start: p.start,
        end: p.end,
        roomId: room.id,
        teacherId: tch.id,
        startDate: p.startDate,
        endDate: list[list.length - 1],
      });
      return c;
    });
  };

  R.openRegistration = (db, u, classId) => {
    R.need(u, "klass");
    const c = R.must(db, "classes", classId, "lớp");
    if (c.status !== "Nháp") fail("Lớp không ở trạng thái Nháp.");
    if (!R.sessions(db, classId).length)
      fail("Phải xếp lịch học trước khi mở đăng ký.");
    c.status = "Mở đăng ký";
    return c;
  };

  R.confirmOpen = (db, u, classId) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const c = R.must(db, "classes", classId, "lớp");
      if (c.status !== "Mở đăng ký")
        fail("Chỉ xác nhận mở lớp khi lớp đang Mở đăng ký.");
      const n = R.confirmed(db, classId).length;
      if (n < CFG.minStudents)
        fail(
          `Chưa đủ sĩ số tối thiểu: ${n}/${CFG.minStudents} học viên đã xác nhận (đóng ≥ ${CFG.minPaidPct * 100}% học phí).`,
        );
      const cf = R.resourceConflicts(
        db,
        R.sessions(db, classId),
        c.roomId,
        c.teacherId,
        classId,
      );
      if (cf.length) fail("Lịch lớp bị trùng: " + cf[0] + ".");
      c.status = "Đang học";
      return c;
    });
  };

  R.finishClass = (db, u, classId) => {
    R.need(u, "klass");
    const c = R.must(db, "classes", classId, "lớp");
    if (c.status !== "Đang học") fail("Chỉ kết thúc lớp đang học.");
    if (
      !R.sessions(db, classId).length ||
      R.sessions(db, classId).some((s) => !s.held)
    )
      fail("Chỉ kết thúc lớp sau khi đã điểm danh đủ tất cả buổi học.");
    c.status = "Kết thúc";
    db.enrollments
      .filter((e) => e.classId === classId && e.status === "Đã xác nhận")
      .forEach((e) => {
        e.status = "Hoàn thành";
      });
    return c;
  };

  /* Sửa thông tin lớp (chỉ khi còn Nháp). Đổi khóa/chi nhánh/đợt thì lịch cũ không còn đúng nên bị xóa. */
  R.updateClass = (db, u, id, p) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const c = R.must(db, "classes", id, "lớp");
      if (c.status !== "Nháp")
        fail("Chỉ sửa thông tin lớp khi lớp ở trạng thái Nháp.");
      if (db.enrollments.some((e) => e.classId === id))
        fail("Lớp đã có dữ liệu đăng ký nên không thể sửa.");
      const course = R.must(db, "courses", p.courseId, "khóa học"),
        br = R.must(db, "branches", p.branchId, "chi nhánh"),
        term = R.must(db, "terms", p.termId, "đợt đào tạo");
      const changed =
        c.courseId !== course.id ||
        c.branchId !== br.id ||
        c.termId !== term.id;
      if (changed) {
        db.sessions = db.sessions.filter((s) => s.classId !== id);
        Object.assign(c, {
          weekdays: [],
          start: "",
          end: "",
          roomId: "",
          teacherId: "",
          startDate: "",
          endDate: "",
        });
      }
      Object.assign(c, {
        courseId: course.id,
        branchId: br.id,
        termId: term.id,
        code: changed ? nextCode(db, course, br, term) : c.code,
      });
      return changed
        ? "Đã lưu. Lịch học cũ bị xóa, hãy xếp lại lịch."
        : "Đã lưu";
    });
  };
  /* Xóa lớp: chỉ lớp Nháp hoặc đã hủy và chưa có dữ liệu đăng ký */
  R.deleteClass = (db, u, id) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const c = R.must(db, "classes", id, "lớp");
      if (!["Nháp", "Đã hủy"].includes(c.status))
        fail(
          "Chỉ xóa được lớp ở trạng thái Nháp hoặc Đã hủy. Lớp đang hoạt động hãy hủy hoặc kết thúc trước.",
        );
      if (db.enrollments.some((e) => e.classId === id))
        fail(
          "Lớp đã có dữ liệu đăng ký học nên không thể xóa (cần giữ lịch sử).",
        );
      const sessionIds = new Set(R.sessions(db, id).map((s) => s.id));
      if (
        db.requests.some(
          (r) =>
            r.data.toClassId === id ||
            sessionIds.has(r.data.targetSessionId) ||
            sessionIds.has(r.data.missedSessionId),
        )
      )
        fail(
          "Lớp hoặc buổi học đã được yêu cầu học tập tham chiếu; cần giữ lịch sử.",
        );
      db.sessions = db.sessions.filter((s) => s.classId !== id);
      db.classes = db.classes.filter((x) => x.id !== id);
      return "Đã xóa lớp " + c.code;
    });
  };
  R.cancelClass = (db, u, classId) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const c = R.must(db, "classes", classId, "lớp");
      if (!["Nháp", "Mở đăng ký"].includes(c.status))
        fail("Chỉ hủy được lớp chưa khai giảng.");
      for (const e of db.enrollments.filter(
        (x) => x.classId === classId && LIVE.includes(x.status),
      ))
        R._closeEnrollment(db, e, "Đã hủy", "Lớp bị hủy", true);
      // Giữ buổi học để các yêu cầu và lịch sử vẫn có đích tham chiếu.
      c.status = "Đã hủy";
      return c;
    });
  };
}
