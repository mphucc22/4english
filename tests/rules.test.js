import { test } from "node:test";
import assert from "node:assert/strict";
import { R, U, CFG } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
import {
  fixture,
  klass,
  fill,
  pastSession,
  manager,
  accountant,
} from "./helpers.js";

test("B01: seed hợp lệ ở mọi ngày của năm 2026", () => {
  const RealDate = Date;
  try {
    for (let i = 0; i < 365; i++) {
      const stamp = new RealDate(2026, 0, 1 + i, 12).valueOf();
      globalThis.Date = class extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : [stamp]));
        }
        static now() {
          return stamp;
        }
      };
      assert.equal(Seed.build().classes.length, 6, "ngày " + U.today());
    }
  } finally {
    globalThis.Date = RealDate;
  }
});
test("B02: đổi lịch từ chối xung đột học viên và rollback", () => {
  const db = fixture(),
    a = klass(db),
    b = klass(db, {
      course: "co3",
      branch: "br2",
      room: "br2r1",
      teacher: "gv3",
      start: "20:00",
      end: "21:30",
    });
  const [e] = fill(db, a, { n: 1 });
  R.enroll(db, manager, e.studentId, b.id);
  const snap = JSON.stringify(db);
  assert.throws(
    () =>
      R.setSchedule(db, manager, b.id, {
        weekdays: [2, 4],
        roomId: "br2r1",
        teacherId: "gv3",
        start: "18:30",
        end: "20:00",
        startDate: db.terms[1].start,
      }),
    /trùng lịch/,
  );
  assert.equal(JSON.stringify(db), snap);
});
test("B03/B04: chặn kết thúc sớm; lớp đủ buổi vẫn thu được nợ", () => {
  const db = fixture(),
    c = klass(db),
    ens = fill(db, c);
  const e = ens[0];
  db.payments.find((p) => p.enrollmentId === e.id).amount = e.fee / 2;
  R.confirmOpen(db, manager, c.id);
  assert.throws(() => R.finishClass(db, manager, c.id), /tất cả buổi/);
  for (const s of R.sessions(db, c.id)) {
    s.held = true;
  }
  R.finishClass(db, manager, c.id);
  assert.equal(e.status, "Hoàn thành");
  assert.equal(R.collectible(db, e), true);
  const debt = R.due(db, e);
  R.addPayment(db, accountant, e.id, { amount: debt, method: "Chuyển khoản" });
  assert.equal(R.due(db, e), 0);
  assert.equal(
    R.report(db).byBranch.find((x) => x.b.id === c.branchId).receivable,
    0,
  );
});
test("B05: không điểm danh lớp Mở đăng ký dù đã đủ học phí", () => {
  const db = fixture(),
    c = klass(db);
  fill(db, c);
  const s = R.sessions(db, c.id)[0];
  s.date = U.today();
  assert.throws(() => R.markAttendance(db, manager, s.id, []), /Đang học/);
  assert.equal(s.held, false);
});
test("B06: chuyển lớp không vượt kiểm tra cùng khóa/đợt hoặc học viên ngừng", () => {
  const db = fixture(),
    a = klass(db, { term: db.terms[0].id }),
    b = klass(db, {
      room: "br1r2",
      teacher: "gv3",
      start: "08:00",
      end: "09:30",
    }),
    d = klass(db, {
      room: "br1r3",
      teacher: "gv4",
      start: "10:00",
      end: "11:30",
    }),
    [e] = fill(db, a, { n: 1 });
  R.enroll(db, manager, e.studentId, d.id);
  assert.throws(
    () =>
      R.createRequest(
        db,
        manager,
        "transfer",
        { enrollmentId: e.id, toClassId: b.id },
        "đổi lớp",
      ),
    /khóa học này/,
  );
  R.by(db, "students", e.studentId).status = "Ngừng";
  assert.throws(
    () =>
      R.createRequest(
        db,
        manager,
        "transfer",
        { enrollmentId: e.id, toClassId: b.id },
        "đổi lớp",
      ),
    /ngừng/,
  );
});
function makeupFixture() {
  const db = fixture(),
    a = klass(db),
    b = klass(db, { branch: "br2", room: "br2r1", teacher: "gv3" }),
    c = klass(db, { branch: "br3", room: "br3r1", teacher: "gv4" });
  const ens = fill(db, a);
  fill(db, b, { prefix: "b" });
  fill(db, c, { prefix: "c" });
  [a, b, c].forEach((x) => R.confirmOpen(db, manager, x.id));
  const missed1 = pastSession(db, a, -2, [ens[0].id, ens[1].id]),
    missed2 = pastSession(db, a, -1, [ens[0].id]);
  return { db, a, b, c, ens, missed1, missed2 };
}
test("B07: hai yêu cầu học bù khác lớp không được trùng giờ", () => {
  const { db, b, c, ens, missed1, missed2 } = makeupFixture(),
    t1 = R.sessions(db, b.id)[0],
    t2 = R.sessions(db, c.id)[0];
  assert.equal(t1.date, t2.date);
  const r = R.createRequest(
    db,
    manager,
    "makeup",
    {
      enrollmentId: ens[0].id,
      missedSessionId: missed1.id,
      targetSessionId: t1.id,
    },
    "bù",
  );
  R.approve(db, manager, r.id);
  assert.throws(
    () =>
      R.createRequest(
        db,
        manager,
        "makeup",
        {
          enrollmentId: ens[0].id,
          missedSessionId: missed2.id,
          targetSessionId: t2.id,
        },
        "bù",
      ),
    /trùng lịch/,
  );
});
test("B08: hai học viên được xin học bù cùng một buổi vắng", () => {
  const { db, b, ens, missed1 } = makeupFixture(),
    target = R.sessions(db, b.id)[0];
  for (const e of ens.slice(0, 2)) {
    const r = R.createRequest(
      db,
      manager,
      "makeup",
      {
        enrollmentId: e.id,
        missedSessionId: missed1.id,
        targetSessionId: target.id,
      },
      "bù",
    );
    R.approve(db, manager, r.id);
  }
  assert.equal(db.requests.length, 2);
});
test("B09: lịch sử điểm danh giữ nguyên sau chuyển; người mới không xuất hiện trước ghi danh", () => {
  const db = fixture(),
    a = klass(db),
    b = klass(db, {
      room: "br1r2",
      teacher: "gv3",
      start: "08:00",
      end: "09:30",
    }),
    ens = fill(db, a);
  R.confirmOpen(db, manager, a.id);
  const s = pastSession(db, a);
  const r = R.createRequest(
    db,
    manager,
    "transfer",
    { enrollmentId: ens[0].id, toClassId: b.id },
    "đổi",
  );
  R.approve(db, manager, r.id);
  assert(R.attendees(db, s.id).some((x) => x.e.id === ens[0].id));
  const n = R.enroll(db, manager, "hv20", a.id);
  R.addPayment(db, accountant, n.id, { amount: n.fee, method: "Tiền mặt" });
  assert(!R.attendees(db, s.id).some((x) => x.e.id === n.id));
  R.markAttendance(
    db,
    manager,
    s.id,
    R.attendees(db, s.id).map(({ e }) => ({
      enrollmentId: e.id,
      status: "Có mặt",
    })),
  );
  assert.equal(
    db.attendance.filter(
      (a) => a.sessionId === s.id && a.enrollmentId === ens[0].id,
    ).length,
    1,
  );
});
test("B10: mã lớp không trùng sau xóa, giữ nguyên khi sửa cùng nhóm", () => {
  const db = fixture(),
    p = { courseId: "co2", branchId: "br1", termId: db.terms[1].id },
    a = R.createClass(db, manager, p),
    b = R.createClass(db, manager, p);
  R.deleteClass(db, manager, a.id);
  const c = R.createClass(db, manager, p);
  assert.notEqual(c.code, b.code);
  const code = b.code;
  R.updateClass(db, manager, b.id, p);
  assert.equal(b.code, code);
});
test("B11: bảo lưu hết hạn suy ra thống nhất; học lại bị chặn không sửa dữ liệu", () => {
  const db = fixture(),
    a = klass(db);
  const [e] = fill(db, a);
  R.confirmOpen(db, manager, a.id);
  const rq = R.createRequest(
    db,
    manager,
    "reserve",
    { enrollmentId: e.id },
    "ốm",
  );
  R.approve(db, manager, rq.id);
  const rv = db.reservations[0];
  rv.expires = U.addDays(U.today(), -1);
  const snap = JSON.stringify(db);
  assert.equal(R.reservationStatus(rv), "Hết hạn");
  assert.throws(() => R.resume(db, manager, rv.id, a.id), /hết hạn/);
  assert.equal(JSON.stringify(db), snap);
});
test("B12: service chặn giờ, ngày, weekday, tiền thập phân và hình thức giả", () => {
  const db = fixture(),
    c = klass(db),
    [e] = fill(db, c, { n: 1, paid: false });
  const p = {
    weekdays: [2, 4],
    roomId: "br1r1",
    teacherId: "gv1",
    start: "25:00",
    end: "26:00",
    startDate: db.terms[1].start,
  };
  assert.throws(() => R.setSchedule(db, manager, c.id, p), /Giờ học/);
  assert.throws(
    () =>
      R.setSchedule(db, manager, c.id, {
        ...p,
        start: "18:00",
        end: "19:00",
        weekdays: [8],
      }),
    /ngày học/,
  );
  assert.throws(
    () =>
      R.addPayment(db, accountant, e.id, {
        amount: 1000,
        method: "abc-invalid",
      }),
    /Hình thức/,
  );
  assert.throws(
    () =>
      R.addPayment(db, accountant, e.id, { amount: 1.5, method: "Tiền mặt" }),
    /Số tiền/,
  );
});
test("B18/B19: đổi phòng qua chi nhánh, phí khóa đã dùng, tên toàn khoảng trắng đều bị chặn", () => {
  const db = fixture();
  klass(db);
  const room = R.by(db, "rooms", "br1r1");
  assert.throws(
    () =>
      R.saveMaster(db, manager, "rooms", room.id, {
        ...room,
        name: "P105",
        branchId: "br2",
      }),
    /đang được/,
  );
  const course = R.by(db, "courses", "co2");
  assert.throws(
    () =>
      R.saveMaster(db, manager, "courses", course.id, { ...course, fee: 1 }),
    /đang được/,
  );
  assert.throws(
    () => R.saveMaster(db, manager, "students", null, { name: "   " }),
    /Nhập tên/,
  );
});
test("C01: hết hạn giữ chỗ trả tiền/giải phóng chỗ đúng một lần", () => {
  const db = fixture(),
    c = klass(db),
    [e] = fill(db, c, { n: 1, paid: false });
  R.addPayment(db, accountant, e.id, { amount: 100000, method: "Tiền mặt" });
  e.holdExpires = U.addDays(U.today(), -1);
  assert.equal(R.sweepExpired(db), 1);
  assert.equal(e.status, "Hết hạn");
  assert.equal(R.live(db, c.id).length, 0);
  assert.equal(R.by(db, "students", e.studentId).balance, 100000);
  assert.equal(R.sweepExpired(db), 0);
  assert.equal(db.balanceLedger.length, 1);
});
test("C02: bảo lưu trả một phần phải khấu trừ học phí đã sử dụng", () => {
  const db = fixture(),
    c = klass(db),
    ens = fill(db, c);
  const e = ens[0];
  db.payments.find((p) => p.enrollmentId === e.id).amount = e.fee / 2;
  R.confirmOpen(db, manager, c.id);
  for (const s of R.sessions(db, c.id).slice(0, 12)) s.held = true;
  const r = R.createRequest(
    db,
    manager,
    "reserve",
    { enrollmentId: e.id },
    "bận",
  );
  R.approve(db, manager, r.id);
  assert.equal(db.reservations[0].credit, 0);
  assert.equal(R.due(db, e), 0);
});
test("C03: hủy cá nhân, hoàn số dư có nhật ký; không hoàn hai lần vượt số dư", () => {
  const db = fixture(),
    c = klass(db),
    [e] = fill(db, c, { n: 1 });
  R.cancelEnrollment(db, manager, e.id, "hủy theo yêu cầu");
  const amount = e.fee;
  R.refundBalance(db, manager, e.studentId, {
    amount,
    method: "Tiền mặt",
    note: "chi hoàn",
  });
  assert.equal(R.by(db, "students", e.studentId).balance, 0);
  assert.equal(db.refunds.length, 1);
  assert.throws(
    () =>
      R.refundBalance(db, manager, e.studentId, {
        amount,
        method: "Tiền mặt",
        note: "lặp",
      }),
    /số dư/,
  );
  assert.throws(() => R.cancelEnrollment(db, manager, e.id, "lặp"), /đã đóng/);
});
test("C04: hủy phiếu thu cập nhật nợ, giữ nguyên chứng từ; chỉ hủy một lần", () => {
  const db = fixture(),
    c = klass(db),
    [e] = fill(db, c, { n: 1 }),
    p = db.payments[0];
  R.voidPayment(db, manager, p.id, "nhập sai");
  assert.equal(R.due(db, e), e.fee);
  assert.equal(db.payments.length, 1);
  assert.equal(p.voided, true);
  assert.throws(() => R.voidPayment(db, manager, p.id, "lặp"), /Chỉ hủy/);
});
test("C05: đổi một buổi giữ ID/lưu lịch sử, chặn trùng tài nguyên", () => {
  const db = fixture(),
    a = klass(db),
    b = klass(db, {
      room: "br1r2",
      teacher: "gv3",
      start: "08:00",
      end: "09:30",
    }),
    s = R.sessions(db, a.id)[0],
    other = R.sessions(db, b.id)[0];
  assert.throws(
    () =>
      R.changeSession(db, manager, s.id, {
        ...s,
        roomId: other.roomId,
        teacherId: other.teacherId,
        start: other.start,
        end: other.end,
        note: "đổi",
      }),
    /trùng/,
  );
  const current = R.by(db, "sessions", s.id);
  R.changeSession(db, manager, s.id, {
    ...current,
    start: "15:00",
    end: "16:30",
    note: "đổi ca",
  });
  assert.equal(R.by(db, "sessions", s.id).changes.length, 1);
  assert.equal(R.sessions(db, a.id).length, 24);
});
test("C06: cộng tháng chốt ngày cuối tháng hợp lệ", () => {
  assert.equal(U.addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(U.addMonths("2028-01-31", 1), "2028-02-29");
});
