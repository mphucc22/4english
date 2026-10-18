/** Dịch vụ bổ sung: sổ số dư, hủy/hoàn phí, hết hạn giữ chỗ, đổi từng buổi. */
export function installExtraRules(R, U, CFG, fail) {
  R.balance = (db, studentId, amount, note, ref) => {
    const st = R.must(db, "students", studentId, "học viên");
    if (!Number.isSafeInteger(amount) || st.balance + amount < 0)
      fail("Biến động số dư không hợp lệ.");
    db.balanceLedger ||= [];
    const x = {
      id: U.id("bl"),
      studentId,
      amount,
      balanceAfter: st.balance + amount,
      note,
      ref,
      date: U.today(),
    };
    st.balance += amount;
    db.balanceLedger.push(x);
    return x;
  };
  R.consumed = (db, e) => {
    const sessions = R.sessions(db, e.classId),
      total = sessions.length;
    const done = sessions.filter((s) => s.held && R.memberOn(e, s)).length;
    return total ? Math.round((e.fee * done) / total) : 0;
  };
  R.withdrawRequests = (db, eid, exclude) => {
    for (const r of db.requests) {
      if (r.id === exclude || r.data.enrollmentId !== eid) continue;
      const target = R.by(db, "sessions", r.data.targetSessionId);
      if (
        r.status === "Chờ duyệt" ||
        (r.type === "makeup" &&
          r.status === "Đã duyệt" &&
          target &&
          !target.held &&
          target.date >= U.today())
      ) {
        r.status = "Đã hủy";
        r.note = "Đăng ký gốc đã đóng";
        r.decidedAt = U.today();
      }
    }
  };
  R._closeEnrollment = (db, e, status, reason, fullCredit = false) => {
    const used = fullCredit ? 0 : R.consumed(db, e),
      credit = Math.max(0, R.paid(db, e.id) - used);
    e.status = status;
    e.billableFee = used;
    e.effectiveTo = U.today();
    e.cancelNote = reason;
    R.withdrawRequests(db, e.id);
    if (credit > 0) R.balance(db, e.studentId, credit, reason, e.id);
    return credit;
  };
  R.cancelEnrollment = (db, u, eid, reason) => {
    R.need(u, "approve");
    return R.atomic(db, () => {
      if (!String(reason || "").trim()) fail("Nhập lý do hủy đăng ký.");
      const e = R.must(db, "enrollments", eid, "đăng ký");
      if (!["Chờ đóng phí", "Đã xác nhận"].includes(e.status))
        fail("Đăng ký này đã đóng, không thể hủy lần nữa.");
      const credit = R._closeEnrollment(db, e, "Đã hủy", String(reason).trim());
      return "Đã hủy đăng ký; cộng " + U.vnd(credit) + " vào số dư học viên.";
    });
  };
  // Trạng thái phiếu bảo lưu suy ra từ ngày; không ghi rồi ném lỗi trong cùng transaction.
  R.reservationStatus = (rv) =>
    rv.status === "Đang bảo lưu" && rv.expires < U.today()
      ? "Hết hạn"
      : rv.status;
  R.sweepExpired = (db) => {
    let count = 0;
    for (const e of db.enrollments) {
      if (
        e.status === "Chờ đóng phí" &&
        e.holdExpires &&
        e.holdExpires < U.today()
      ) {
        R._closeEnrollment(db, e, "Hết hạn", "Hết hạn giữ chỗ chờ đóng phí");
        count++;
      }
    }
    return count;
  };
  R.refundBalance = (db, u, sid, p) => {
    R.need(u, "approve");
    return R.atomic(db, () => {
      const amount = Number(p.amount),
        note = String(p.note || "").trim();
      if (!note || !Number.isSafeInteger(amount) || amount <= 0)
        fail("Nhập số tiền nguyên dương và lý do hoàn phí.");
      if (!["Tiền mặt", "Chuyển khoản"].includes(p.method))
        fail("Hình thức hoàn tiền không hợp lệ.");
      R.balance(db, sid, -amount, "Hoàn tiền: " + note, u.id);
      db.refunds ||= [];
      const x = {
        id: U.id("rf"),
        studentId: sid,
        amount,
        note,
        method: p.method,
        date: U.today(),
        by: u.name,
      };
      db.refunds.push(x);
      return "Đã ghi nhận hoàn " + U.vnd(amount);
    });
  };
  R.voidPayment = (db, u, pid, reason) => {
    R.need(u, "approve");
    return R.atomic(db, () => {
      const p = R.must(db, "payments", pid, "phiếu thu"),
        e = R.must(db, "enrollments", p.enrollmentId, "đăng ký");
      if (p.voided || p.type !== "Thu")
        fail("Chỉ hủy được phiếu thu tiền ngoài chưa bị hủy.");
      if (!["Chờ đóng phí", "Đã xác nhận", "Hoàn thành"].includes(e.status))
        fail(
          "Đăng ký đã chuyển/bảo lưu/hủy. Cần xử lý bằng hoàn số dư để giữ đúng sổ học phí.",
        );
      if (!String(reason || "").trim()) fail("Nhập lý do hủy phiếu thu.");
      p.voided = true;
      p.voidNote = String(reason).trim();
      p.voidBy = u.name;
      p.voidAt = U.today();
      if (
        e.status === "Đã xác nhận" &&
        R.paid(db, e.id) < e.fee * CFG.minPaidPct
      ) {
        e.status = "Chờ đóng phí";
        e.holdExpires = U.addDays(U.today(), CFG.pendingDays);
      }
      return "Đã hủy phiếu " + p.no + ". Lịch sử vẫn được giữ lại.";
    });
  };
  R.changeSession = (db, u, sid, p) => {
    R.need(u, "klass");
    return R.atomic(db, () => {
      const s = R.must(db, "sessions", sid, "buổi học"),
        c = R.must(db, "classes", s.classId, "lớp");
      if (
        !["Mở đăng ký", "Đang học"].includes(c.status) ||
        s.held ||
        db.attendance.some((a) => a.sessionId === sid)
      )
        fail("Chỉ đổi được buổi chưa điểm danh của lớp đang mở hoặc đang học.");
      if (
        !R.validDate(p.date) ||
        p.date < U.today() ||
        !R.validTime(p.start) ||
        !R.validTime(p.end) ||
        p.start >= p.end
      )
        fail("Ngày và giờ buổi học không hợp lệ.");
      const room = R.must(db, "rooms", p.roomId, "phòng"),
        teacher = R.must(db, "teachers", p.teacherId, "giáo viên");
      if (room.branchId !== c.branchId || teacher.status !== "Đang dạy")
        fail("Phòng/giáo viên không phù hợp với lớp.");
      if (!String(p.note || "").trim()) fail("Nhập lý do điều chỉnh buổi học.");
      const next = {
        ...s,
        date: p.date,
        start: p.start,
        end: p.end,
        roomId: room.id,
        teacherId: teacher.id,
      };
      const cf = R.resourceConflicts(db, [next], room.id, teacher.id, c.id);
      if (
        cf.length ||
        R.sessions(db, c.id).some(
          (x) =>
            x.id !== sid &&
            x.date === next.date &&
            x.start < next.end &&
            next.start < x.end,
        )
      )
        fail("Buổi điều chỉnh trùng phòng, giáo viên hoặc buổi khác của lớp.");
      const members = R.live(db, c.id)
        .map((e) => ({ e, makeup: null }))
        .concat(
          db.requests
            .filter(
              (r) =>
                r.type === "makeup" &&
                r.status === "Đã duyệt" &&
                r.data.targetSessionId === sid,
            )
            .map((r) => ({
              e: R.by(db, "enrollments", r.data.enrollmentId),
              makeup: r,
            })),
        );
      if (members.length > room.capacity)
        fail("Phòng không đủ chỗ cho lớp và học viên học bù.");
      for (const { e, makeup } of members) {
        const conflict = R.studentConflict(
          db,
          e.studentId,
          c.id,
          e.id,
          [next],
          makeup?.id,
        );
        if (conflict) fail(conflict);
        if (
          makeup &&
          R.sessions(db, e.classId).some(
            (x) =>
              R.memberOn(e, x) &&
              x.date === next.date &&
              x.start < next.end &&
              next.start < x.end,
          )
        )
          fail("Học viên học bù trùng lịch lớp gốc.");
      }
      s.changes ||= [];
      s.changes.push({
        date: s.date,
        start: s.start,
        end: s.end,
        roomId: s.roomId,
        teacherId: s.teacherId,
        note: p.note.trim(),
        by: u.name,
        at: new Date().toISOString(),
      });
      Object.assign(s, next, { changes: s.changes });
      return "Đã điều chỉnh buổi " + s.no;
    });
  };
}
