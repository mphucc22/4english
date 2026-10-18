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

export function ResumeForm({ rvId }) {
  const { db, user, execute } = useStore();
  const rv = by(db, "reservations", rvId),
    co = by(
      db,
      "classes",
      by(db, "enrollments", rv.enrollmentId).classId,
    ).courseId;
  const cl = db.classes.filter(
    (c) => c.courseId === co && ["Mở đăng ký", "Đang học"].includes(c.status),
  );
  return (
    <Form
      title="Học lại sau bảo lưu"
      ok="Xác nhận học lại"
      onSubmit={async (fd) => {
        await execute("resume", rvId, fd.get("classId"));
        return "Đã xếp học viên vào lớp mới";
      }}
    >
      <p className="mb-3">
        Học phí bảo lưu <b>{vnd(rv.credit)}</b> sẽ được trừ vào lớp mới.
      </p>
      <Fld label="Lớp học lại (cùng khóa)">
        <Sel
          required
          name="classId"
          ph="— Chọn lớp —"
          options={cl.map((c) => [
            c.id,
            `${c.code} · ${R.scheduleText(c)} · còn ${seats(db, c)} chỗ`,
          ])}
        />
      </Fld>
    </Form>
  );
}
