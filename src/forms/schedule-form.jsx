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

export function ScheduleForm({ id }) {
  const { db, user, execute } = useStore();
  const c = by(db, "classes", id),
    t = by(db, "terms", c.termId),
    wd = c.weekdays || [],
    teachers = db.teachers.filter((teacher) => canTeacherWorkAt(db, teacher.id, c.branchId));
  return (
    <Form
      title={`Xếp lịch – ${c.code}`}
      ok="Lưu lịch"
      confirm={
        R.sessions(db, id).length
          ? "Lịch cũ sẽ bị thay bằng lịch mới. Bạn có chắc chắn?"
          : null
      }
      onSubmit={async (fd) => {
        await execute("setSchedule", id, {
          weekdays: fd.getAll("wd"),
          start: fd.get("start"),
          end: fd.get("end"),
          roomId: fd.get("roomId"),
          teacherId: fd.get("teacherId"),
          startDate: fd.get("startDate"),
        });
        return "Đã lưu lịch học";
      }}
    >
      <p className="mb-1.5 text-[13.5px] font-semibold text-slate-500">
        Ngày học trong tuần
      </p>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <label
            key={d}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              name="wd"
              value={d}
              defaultChecked={wd.includes(d)}
            />
            {U.DOW[d]}
          </label>
        ))}
      </div>
      <Row2>
        <Fld label="Giờ bắt đầu">
          <In
            required
            type="time"
            name="start"
            defaultValue={c.start || "18:00"}
          />
        </Fld>
        <Fld label="Giờ kết thúc">
          <In required type="time" name="end" defaultValue={c.end || "19:30"} />
        </Fld>
        <Fld label="Phòng học">
          <Sel
            required
            name="roomId"
            defaultValue={c.roomId}
            options={db.rooms
              .filter((r) => r.branchId === c.branchId)
              .map((r) => [r.id, r.name])}
          />
        </Fld>
        <Fld label="Giáo viên">
          <Sel
            required
            name="teacherId"
            defaultValue={c.teacherId}
            ph="— Chọn giáo viên phù hợp cơ sở —"
            options={teachers
              .map((x) => [x.id, `${x.name} (${x.specialty})`])}
          />
        </Fld>
      </Row2>
      {!teachers.length && <p className="mb-4 text-sm text-amber-800">Chưa có giáo viên đang dạy được phân công tại cơ sở này. Quản trị cần cập nhật Danh mục → Giáo viên trước khi xếp lịch.</p>}
      <Fld
        label={`Ngày khai giảng (trong ${t.name}: ${dmy(t.start)} – ${dmy(t.end)})`}
      >
        <In
          required
          type="date"
          name="startDate"
          defaultValue={c.startDate || t.start}
          min={t.start}
          max={t.end}
        />
      </Fld>
      <Hint>
        Hệ thống kiểm tra lịch học viên đã đăng ký, đồng thời tự sinh{" "}
        {by(db, "courses", c.courseId).sessions} buổi và từ chối nếu trùng phòng
        hoặc giáo viên.
      </Hint>
    </Form>
  );
}
