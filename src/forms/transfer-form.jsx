import {
  Btn,
  Badge,
  Table,
  Form,
  Fld,
  In,
  Area,
  Sel,
  Row2,
  H3,
} from "../ui.jsx";
import { useStore } from "../store.jsx";
import { R, U, CFG } from "../lib/rules.js";
import { by, vnd, dmy, enLabel } from "../lib/util.js";

import { Hint, seats } from "./shared.jsx";

export function TransferForm({ eid }) {
  const { db, user, execute } = useStore();
  const e = by(db, "enrollments", eid),
    from = by(db, "classes", e.classId),
    lvl = by(db, "courses", from.courseId).level;
  const cand = db.classes.filter(
    (c) =>
      c.id !== from.id &&
      ["Mở đăng ký", "Đang học"].includes(c.status) &&
      by(db, "courses", c.courseId).level === lvl,
  );
  const label = (c) => {
    const d = by(db, "courses", c.courseId).fee - e.fee;
    return `${c.code} · ${by(db, "branches", c.branchId).name} · ${R.scheduleText(c)} · còn ${seats(db, c)} chỗ · ${d === 0 ? "cùng học phí" : (d > 0 ? "đóng thêm " : "giảm ") + vnd(Math.abs(d))}`;
  };
  return (
    <Form
      title="Yêu cầu chuyển lớp"
      ok="Gửi yêu cầu"
      onSubmit={async (fd) => {
        await execute(
          "createRequest",
          "transfer",
          { enrollmentId: eid, toClassId: fd.get("toClassId") },
          fd.get("reason"),
        );
        return "Đã gửi yêu cầu chuyển lớp – chờ duyệt";
      }}
    >
      <p className="mb-3">
        <b>{enLabel(db, e)}</b> – học phí hiện tại {vnd(e.fee)}, đã đóng{" "}
        {vnd(R.paid(db, e.id))}.
      </p>
      <Fld label="Lớp đích (cùng trình độ)">
        <Sel
          required
          name="toClassId"
          ph="— Chọn lớp đích —"
          options={cand.map((c) => [c.id, label(c)])}
        />
      </Fld>
      <Fld label="Lý do">
        <Area required name="reason" />
      </Fld>
      <Hint>
        Học phí chưa sử dụng được chuyển sang lớp mới; phần đã học được khấu trừ
        theo số buổi. Phần dư cộng vào số dư học viên.
      </Hint>
    </Form>
  );
}
