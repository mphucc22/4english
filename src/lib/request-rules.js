/** Dịch vụ Request: được rules.js khởi tạo vào đối tượng R. */
export function installRequestRules(R, U, CFG, fail, overlap) {
  const LIVE = R.LIVE;
  /* ---------- yêu cầu đặc biệt: bảo lưu / chuyển lớp / học bù ---------- */
  R.V = {
    reserve(db, d) {
      const e = R.must(db, "enrollments", d.enrollmentId, "đăng ký học");
      if (e.status !== "Đã xác nhận")
        fail(
          "Chỉ bảo lưu được khi học viên đang học (đã đóng tối thiểu " +
            CFG.minPaidPct * 100 +
            "% học phí).",
        );
      const c = R.by(db, "classes", e.classId);
      if (c.status !== "Đang học")
        fail(
          "Chỉ bảo lưu cho lớp đang học. Lớp chưa khai giảng thì hủy đăng ký/chuyển lớp.",
        );
      const total = R.sessions(db, c.id).length,
        done = R.held(db, c.id);
      if (total && done / total > CFG.maxReservePct)
        fail(
          `Đã học ${done}/${total} buổi, vượt ${CFG.maxReservePct * 100}% nên không được bảo lưu.`,
        );
      return { e, c, total, done };
    },
    transfer(db, d) {
      const e = R.must(db, "enrollments", d.enrollmentId, "đăng ký học");
      if (!["Chờ đóng phí", "Đã xác nhận"].includes(e.status))
        fail(
          "Đăng ký này không thể chuyển lớp (phải đang học hoặc chờ đóng phí).",
        );
      const from = R.by(db, "classes", e.classId),
        to = R.must(db, "classes", d.toClassId, "lớp đích");
      if (to.id === from.id) fail("Lớp đích trùng lớp hiện tại.");
      const fc = R.by(db, "courses", from.courseId),
        tc = R.by(db, "courses", to.courseId);
      if (fc.level !== tc.level)
        fail(
          `Lớp đích khác trình độ (${fc.name} → ${tc.name}). Chỉ chuyển giữa các khóa cùng trình độ.`,
        );
      R.eligible(db, e.studentId, to.id, e.id);
      return { e, from, to, fc, tc, diff: tc.fee - e.fee };
    },
    makeup(db, d, r) {
      const e = R.must(db, "enrollments", d.enrollmentId, "đăng ký học");
      if (e.status !== "Đã xác nhận")
        fail("Chỉ học viên đang học mới được đăng ký học bù.");
      const missed = R.by(db, "sessions", d.missedSessionId),
        target = R.by(db, "sessions", d.targetSessionId);
      if (!missed || missed.classId !== e.classId || !target)
        fail("Chưa chọn buổi vắng và buổi học bù.");
      if (
        !db.attendance.find(
          (a) =>
            a.sessionId === missed.id &&
            a.enrollmentId === e.id &&
            a.status === "Vắng",
        )
      )
        fail("Buổi này học viên không ở trạng thái vắng.");
      const mc = R.by(db, "classes", missed.classId),
        tc = R.by(db, "classes", target.classId);
      if (mc.courseId !== tc.courseId)
        fail("Buổi học bù phải thuộc cùng khóa học.");
      if (mc.id === tc.id)
        fail("Học bù phải sắp xếp ở lớp khác cùng khóa học.");
      if (tc.status !== "Đang học") fail("Lớp học bù phải đang học.");
      if (target.held || target.date < U.today())
        fail("Buổi học bù phải ở tương lai.");
      const mine = db.requests.filter(
        (x) =>
          x.type === "makeup" &&
          x.id !== (r && r.id) &&
          ["Chờ duyệt", "Đã duyệt"].includes(x.status),
      );
      if (
        mine.some(
          (x) =>
            x.data.missedSessionId === missed.id &&
            x.data.enrollmentId === e.id,
        )
      )
        fail("Buổi vắng này đã có yêu cầu học bù.");
      if (
        mine.filter((x) => x.data.enrollmentId === e.id).length >= CFG.maxMakeup
      )
        fail(`Mỗi đăng ký chỉ học bù tối đa ${CFG.maxMakeup} buổi.`);
      const room = R.by(db, "rooms", target.roomId);
      const seats =
        room.capacity -
        R.live(db, tc.id).length -
        mine.filter(
          (x) =>
            x.status === "Đã duyệt" && x.data.targetSessionId === target.id,
        ).length;
      if (seats <= 0) fail("Buổi học bù đã hết chỗ.");
      for (const x of db.enrollments.filter(
        (z) => z.studentId === e.studentId && LIVE.includes(z.status),
      )) {
        if (
          R.sessions(db, x.classId).some(
            (s) => !s.held && R.memberOn(x, s) && overlap(s, target),
          )
        )
          fail("Học viên trùng lịch học vào thời điểm học bù.");
      }
      const conflict = R.studentConflict(
        db,
        e.studentId,
        tc.id,
        null,
        [target],
        r?.id,
      );
      if (conflict) fail(conflict);
      return { e, missed, target, mc, tc };
    },
  };

  R.X = {
    // thực thi sau khi duyệt
    reserve(db, ctx, r) {
      const { e, total, done } = ctx,
        paid = R.paid(db, e.id);
      const consumed = R.consumed(db, e),
        credit = Math.max(0, paid - consumed);
      e.status = "Bảo lưu";
      e.billableFee = consumed;
      e.effectiveTo = U.today();
      R.withdrawRequests(db, e.id, r.id);
      const rv = {
        id: U.id("rv"),
        studentId: e.studentId,
        enrollmentId: e.id,
        branchId: e.branchId || R.by(db, "classes", e.classId)?.branchId,
        credit,
        createdAt: U.today(),
        expires: U.addMonths(U.today(), CFG.reserveMonths),
        status: "Đang bảo lưu",
      };
      db.reservations.push(rv);
      r.result = `Giữ lại ${U.vnd(credit)} (còn ${total - done}/${total} buổi), hạn đến ${U.dmy(rv.expires)}.`;
    },
    transfer(db, ctx, r) {
      const { e, from, to, tc, diff } = ctx,
        paid = R.paid(db, e.id);
      const consumed = R.consumed(db, e),
        credit = Math.max(0, paid - consumed);
      e.status = "Đã chuyển lớp";
      e.billableFee = consumed;
      e.effectiveTo = U.today();
      e.movedTo = to.id;
      R.withdrawRequests(db, e.id, r.id);
      const n = {
        id: U.id("en"),
        studentId: e.studentId,
        classId: to.id,
        branchId: to.branchId,
        fee: tc.fee,
        status: "Chờ đóng phí",
        createdAt: U.today(),
        effectiveFrom: U.today(),
        holdExpires: U.addDays(U.today(), CFG.pendingDays),
        transferredFrom: e.id,
      };
      db.enrollments.push(n);
      R._credit(db, n, credit, "Chuyển từ lớp " + from.code);
      const after = R.due(db, n);
      r.result =
        `${from.code} → ${to.code}. Chênh lệch ${diff >= 0 ? "+" : "−"}${U.vnd(Math.abs(diff))}; ` +
        (after > 0
          ? `học viên còn phải đóng ${U.vnd(after)}.`
          : "không phải đóng thêm" +
            (credit > tc.fee
              ? `, ${U.vnd(credit - tc.fee)} được cộng vào số dư.`
              : "."));
    },
    makeup(db, ctx, r) {
      r.result = `Học bù buổi ${ctx.target.no} lớp ${ctx.tc.code} ngày ${U.dmy(ctx.target.date)}.`;
    },
  };

  R.createRequest = (db, u, type, data, reason) => {
    R.need(u, "request");
    return R.atomic(db, () => {
      if (!Object.hasOwn(R.V, type)) fail("Loại yêu cầu không hợp lệ.");
      R.V[type](db, data, null);
      if (
        db.requests.some(
          (x) =>
            x.type === type &&
            x.status === "Chờ duyệt" &&
            x.data.enrollmentId === data.enrollmentId &&
            (type !== "makeup" ||
              x.data.missedSessionId === data.missedSessionId),
        )
      )
        fail("Đã có yêu cầu cùng loại đang chờ duyệt.");
      if (!String(reason || "").trim()) fail("Vui lòng nhập lý do.");
      const e = R.by(db, "enrollments", data.enrollmentId);
      const r = {
        id: U.id("rq"),
        type,
        status: "Chờ duyệt",
        studentId: e.studentId,
        data,
        reason: reason.trim(),
        createdBy: u.name,
        createdAt: U.today(),
      };
      db.requests.push(r);
      return r;
    });
  };
  R.approve = (db, u, rid, note) => {
    R.need(u, "approve");
    return R.atomic(db, () => {
      const r = R.must(db, "requests", rid, "yêu cầu");
      if (r.status !== "Chờ duyệt") fail("Yêu cầu đã được xử lý.");
      const ctx = R.V[r.type](db, r.data, r);
      R.X[r.type](db, ctx, r);
      Object.assign(r, {
        status: "Đã duyệt",
        decidedBy: u.name,
        decidedAt: U.today(),
        note: note || "",
      });
      return r;
    });
  };
  R.reject = (db, u, rid, note) => {
    R.need(u, "approve");
    const r = R.must(db, "requests", rid, "yêu cầu");
    if (r.status !== "Chờ duyệt") fail("Yêu cầu đã được xử lý.");
    if (!String(note || "").trim()) fail("Nhập lý do từ chối.");
    Object.assign(r, {
      status: "Từ chối",
      decidedBy: u.name,
      decidedAt: U.today(),
      note,
    });
    return r;
  };

  R.resume = (db, u, rvId, classId) => {
    R.need(u, "enroll");
    return R.atomic(db, () => {
      const rv = R.must(db, "reservations", rvId, "phiếu bảo lưu");
      if (rv.status !== "Đang bảo lưu")
        fail("Phiếu bảo lưu này không còn hiệu lực.");
      if (R.reservationStatus(rv) === "Hết hạn")
        fail("Phiếu bảo lưu đã hết hạn " + U.dmy(rv.expires) + ".");
      const old = R.by(db, "enrollments", rv.enrollmentId),
        oc = R.by(db, "classes", old.classId),
        nc = R.must(db, "classes", classId, "lớp");
      if (nc.courseId !== oc.courseId)
        fail("Học lại phải chọn lớp cùng khóa học đã bảo lưu.");
      const n = R._enroll(db, rv.studentId, classId);
      n.resumedFrom = rv.id;
      R._credit(db, n, rv.credit, "Học phí bảo lưu");
      rv.status = "Đã học lại";
      rv.resumedTo = n.id;
      return n;
    });
  };
}
