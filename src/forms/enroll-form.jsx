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

export function EnrollForm({ cid }) {
  const { db, user, execute } = useStore();
  const c = by(db, "classes", cid),
    taken = R.live(db, cid).map((e) => e.studentId);
  return (
    <Form
      title={`Đăng ký học viên vào lớp ${c.code}`}
      ok="Đăng ký"
      celebrate
      onSubmit={async (fd) => {
        await execute("enroll", fd.get("studentId"), cid);
        return "Đã đăng ký – chờ đóng học phí";
      }}
    >
      <Fld label="Học viên">
        <Sel
          required
          name="studentId"
          ph="— Chọn học viên —"
          options={db.students
            .filter((s) => s.status === "Hoạt động" && !taken.includes(s.id))
            .map((s) => [s.id, `${s.name} (${s.code})`])}
        />
      </Fld>
      <Hint>
        Học phí {vnd(by(db, "courses", c.courseId).fee)}. Đóng tối thiểu{" "}
        {CFG.minPaidPct * 100}% để được xác nhận chỗ. Hệ thống kiểm tra sĩ số,
        trùng lịch học viên và đăng ký trùng khóa.
      </Hint>
    </Form>
  );
}
