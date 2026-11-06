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
import { canTeacherWorkAt } from "../lib/teacher-identity.js";

export function SessionEditForm({ sid }) {
  const { db, execute } = useStore(),
    s = by(db, "sessions", sid),
    c = by(db, "classes", s.classId),
    teachers = db.teachers.filter((teacher) => canTeacherWorkAt(db, teacher.id, c.branchId));
  return (
    <Form
      title={`Điều chỉnh buổi ${s.no} – ${c.code}`}
      confirm="Lịch buổi học này sẽ được thay đổi; hệ thống kiểm tra lại xung đột."
      onSubmit={(fd) => execute("changeSession", sid, Object.fromEntries(fd))}
    >
      <Row2>
        <Fld label="Ngày học">
          <In
            required
            name="date"
            type="date"
            min={U.today()}
            defaultValue={s.date}
          />
        </Fld>
        <Fld label="Phòng">
          <Sel
            required
            name="roomId"
            defaultValue={s.roomId}
            options={db.rooms
              .filter((r) => r.branchId === c.branchId)
              .map((r) => [r.id, r.name])}
          />
        </Fld>
        <Fld label="Bắt đầu">
          <In required name="start" type="time" defaultValue={s.start} />
        </Fld>
        <Fld label="Kết thúc">
          <In required name="end" type="time" defaultValue={s.end} />
        </Fld>
      </Row2>
      <Fld label="Giáo viên">
        <Sel
          required
          name="teacherId"
          defaultValue={s.teacherId}
          ph="— Chọn giáo viên phù hợp cơ sở —"
          options={teachers
            .map((t) => [t.id, t.name])}
        />
      </Fld>
      {!teachers.length && <p className="mb-4 text-sm text-amber-800">Chưa có giáo viên phù hợp cơ sở này. Quản trị cần phân công giáo viên tại Danh mục → Giáo viên.</p>}
      <Fld label="Lý do thay đổi">
        <Area required name="note" />
      </Fld>
    </Form>
  );
}
