/** Dịch vụ Enrollment: được rules.js khởi tạo vào đối tượng R. */
export function installEnrollmentRules(R, U, CFG, fail) {
  const LIVE = R.LIVE;
  /* ---------- đăng ký học & học phí ---------- */
  R.eligible = (db, studentId, classId, excludeEid) => {
    const st = R.must(db, "students", studentId, "học viên"),
      c = R.must(db, "classes", classId, "lớp");
    if (st.status !== "Hoạt động") fail("Hồ sơ học viên đang ngừng hoạt động.");
    if (!["Mở đăng ký", "Đang học"].includes(c.status))
      fail("Lớp chưa mở đăng ký hoặc đã đóng đăng ký.");
    if (c.status === "Đang học" && R.held(db, classId) > CFG.lateJoin)
      fail(`Lớp đã học quá ${CFG.lateJoin} buổi, không nhận thêm học viên.`);
    const live = R.live(db, classId).filter((e) => e.id !== excludeEid);
    if (live.some((e) => e.studentId === studentId))
      fail("Học viên đã đăng ký lớp này.");
    if (
      live.length >=
      Math.min(
        CFG.maxStudents,
        R.by(db, "rooms", c.roomId)?.capacity || CFG.maxStudents,
      )
    )
      fail(`Lớp đã hết chỗ, đủ sĩ số tối đa (${CFG.maxStudents}).`);
    const dup = db.enrollments.find(
      (e) =>
        e.studentId === studentId &&
        e.id !== excludeEid &&
        LIVE.includes(e.status) &&
        (() => {
          const o = R.by(db, "classes", e.classId);
          return o.courseId === c.courseId && o.termId === c.termId;
        })(),
    );
    if (dup) fail("Học viên đã đăng ký khóa học này trong đợt này ở lớp khác.");
    const cf = R.studentConflict(db, studentId, classId, excludeEid);
    if (cf) fail(cf);
    return { st, c };
  };
  R._enroll = (db, studentId, classId) => {
    const { c } = R.eligible(db, studentId, classId);
    const e = {
      id: U.id("en"),
      studentId,
      classId,
      fee: R.by(db, "courses", c.courseId).fee,
      status: "Chờ đóng phí",
      createdAt: U.today(),
      effectiveFrom: U.today(),
      holdExpires: U.addDays(U.today(), CFG.pendingDays),
    };
    db.enrollments.push(e);
    return e;
  };
  R.enroll = (db, u, studentId, classId) => {
    R.need(u, "enroll");
    return R.atomic(db, () => R._enroll(db, studentId, classId));
  };

  R.refresh = (db, e) => {
    if (
      e.status === "Chờ đóng phí" &&
      R.paid(db, e.id) >= e.fee * CFG.minPaidPct
    )
      e.status = "Đã xác nhận";
  };
  R._pay = (db, e, amount, method, type, note, by) => {
    db.meta.receiptSeq++;
    const p = {
      id: U.id("pt"),
      no: "PT" + String(db.meta.receiptSeq).padStart(5, "0"),
      enrollmentId: e.id,
      studentId: e.studentId,
      amount,
      method,
      type,
      note: note || "",
      date: U.today(),
      by: by || "",
    };
    db.payments.push(p);
    R.refresh(db, e);
    return p;
  };
  R.addPayment = (db, u, eid, { amount, method, note }) => {
    R.need(u, "pay");
    return R.atomic(db, () => {
      const e = R.must(db, "enrollments", eid, "đăng ký học");
      amount = Number(amount);
      if (!R.collectible(db, e))
        fail("Đăng ký này không còn khoản học phí phải thu.");
      if (!["Tiền mặt", "Chuyển khoản", "Số dư"].includes(method))
        fail("Hình thức thu học phí không hợp lệ.");
      if (!Number.isSafeInteger(amount) || !(amount > 0))
        fail("Số tiền phải lớn hơn 0.");
      if (amount > R.due(db, e))
        fail(`Số tiền vượt quá khoản còn phải đóng (${U.vnd(R.due(db, e))}).`);
      if (method === "Số dư") {
        const st = R.by(db, "students", e.studentId);
        if (amount > st.balance)
          fail(`Số dư của học viên không đủ (${U.vnd(st.balance)}).`);
        R.balance(db, st.id, -amount, "Thu học phí từ số dư", e.id);
        return R._pay(db, e, amount, method, "Trừ số dư", note, u.name);
      }
      return R._pay(db, e, amount, method, "Thu", note, u.name);
    });
  };
  R._credit = (db, e, amount, note) => {
    // đưa khoản tiền đã có vào đăng ký mới; phần dư vào số dư học viên
    const use = Math.min(amount, e.fee);
    if (use > 0)
      R._pay(db, e, use, "Chuyển nội bộ", "Chuyển nội bộ", note, "Hệ thống");
    if (amount > use)
      R.balance(db, e.studentId, amount - use, "Học phí chuyển dư", e.id);
  };
}
