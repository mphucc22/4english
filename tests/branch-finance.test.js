import { test } from "node:test";
import assert from "node:assert/strict";
import { R } from "../src/lib/rules.js";
import { fixture, klass, manager } from "./helpers.js";

function scenario() {
  const db = fixture();
  const student = db.students[0];
  student.branchId = "br1";
  const first = klass(db);
  const second = klass(db, {
    branch: "br2", room: "br2r1", teacher: "gv2",
  });
  const enrollment = R.enroll(db, manager, student.id, first.id);
  return { db, student, first, second, enrollment };
}

test("BRF01: phiếu thu giữ cơ sở phát sinh, báo cáo không đổi theo lớp sau này", () => {
  const { db, first, enrollment } = scenario();
  const payment = R.addPayment(db, manager, enrollment.id, {
    amount: 500000, method: "Tiền mặt",
  });
  assert.equal(enrollment.branchId, "br1");
  assert.equal(payment.branchId, "br1");
  // Simulate historical class metadata correction; receipt attribution is immutable.
  first.branchId = "br2";
  const report = R.report(db);
  assert.equal(report.byBranch.find((x) => x.b.id === "br1").revenue, 500000);
  assert.equal(report.byBranch.find((x) => x.b.id === "br2").revenue, 0);
});

test("BRF02: số dư cơ sở A không thể chi trả học phí tại cơ sở B", () => {
  const { db, student, second, enrollment } = scenario();
  R.balance(db, student.id, 600000, "Nạp qua đăng ký gốc", enrollment.id);
  assert.equal(R.branchBalance(db, student.id, "br1"), 600000);
  enrollment.status = "Đã hủy";
  const next = R.enroll(db, manager, student.id, second.id);
  const before = JSON.stringify(db);
  assert.throws(() => R.addPayment(db, manager, next.id, {
    amount: 100000, method: "Số dư",
  }), /Số dư tại cơ sở/);
  assert.equal(JSON.stringify(db), before);
});

test("BRF03: chi số dư và hoàn tiền ghi cùng cơ sở, không dùng nhầm nguồn", () => {
  const { db, student, enrollment } = scenario();
  R.balance(db, student.id, 600000, "Số dư học viên", enrollment.id);
  const payment = R.addPayment(db, manager, enrollment.id, {
    amount: 100000, method: "Số dư",
  });
  assert.equal(payment.branchId, "br1");
  assert.equal(R.branchBalance(db, student.id, "br1"), 500000);
  assert.equal(db.balanceLedger.at(-1).branchId, "br1");
  R.refundBalance(db, manager, student.id, {
    branchId: "br1", amount: 200000, method: "Tiền mặt", note: "Hoàn hợp lệ",
  });
  assert.equal(student.balance, 300000);
  assert.equal(db.refunds.at(-1).branchId, "br1");
  assert.equal(db.balanceLedger.at(-1).branchId, "br1");
  const before = JSON.stringify(db);
  assert.throws(() => R.refundBalance(db, manager, student.id, {
    branchId: "br2", amount: 1, method: "Tiền mặt", note: "Sai cơ sở",
  }), /Số dư tại cơ sở/);
  assert.equal(JSON.stringify(db), before);
});

test("BRF04: số dư cũ chưa xác định cơ sở chỉ quản trị toàn hệ thống xử lý", () => {
  const { db, student } = scenario();
  student.balance = 90000;
  const branchManager = {
    id: "bm1", name: "Quản lý cơ sở", role: "branch_manager", branchIds: ["br1"],
  };
  assert.throws(() => R.refundBalance(db, branchManager, student.id, {
    branchId: "__unassigned__", amount: 10000, method: "Tiền mặt", note: "Hoàn",
  }));
  R.refundBalance(db, manager, student.id, {
    branchId: "__unassigned__", amount: 10000, method: "Tiền mặt", note: "Hoàn số dư cũ",
  });
  assert.equal(db.refunds.at(-1).branchId, null);
  assert.equal(student.balance, 80000);
});

test("BRF05: không xóa cơ sở đang được phân công cho tài khoản", () => {
  const db = fixture();
  db.rooms = db.rooms.filter((x) => x.branchId !== "br4");
  db.users[1].branchIds = ["br4"];
  assert.throws(() => R.deleteMaster(db, manager, "branches", "br4"), /phân công/);
});

test("BRF06: tư vấn giữ cơ sở được chọn; mã cơ sở giả bị từ chối", () => {
  const db = fixture();
  const data = { name: "Học viên", phone: "0901234567", courseId: "co2", branchId: "br2" };
  R.createLead(db, data);
  assert.equal(db.leads.at(-1).branchId, "br2");
  const count = db.leads.length;
  assert.throws(() => R.createLead(db, { ...data, branchId: "fake" }));
  assert.equal(db.leads.length, count);
});
