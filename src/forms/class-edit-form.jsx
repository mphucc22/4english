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

export function ClassEditForm({ id }) {
  const { db, user, execute } = useStore();
  const c = by(db, "classes", id),
    hasSched = R.sessions(db, id).length > 0;
  return (
    <Form
      title={`Sửa thông tin lớp – ${c.code}`}
      confirm="Bạn có chắc chắn muốn lưu thay đổi này?"
      onSubmit={async (fd) =>
        await execute("updateClass", id, Object.fromEntries(fd))
      }
    >
      <Fld label="Khóa học">
        <Sel
          required
          name="courseId"
          defaultValue={c.courseId}
          options={db.courses.map((x) => [x.id, `${x.name} – ${vnd(x.fee)}`])}
        />
      </Fld>
      <Fld label="Chi nhánh">
        <Sel
          required
          name="branchId"
          defaultValue={c.branchId}
          options={db.branches.map((b) => [b.id, b.name])}
        />
      </Fld>
      <Fld label="Đợt đào tạo">
        <Sel
          required
          name="termId"
          defaultValue={c.termId}
          options={db.terms.map((t) => [t.id, t.name])}
        />
      </Fld>
      <Hint>
        Chỉ sửa được khi lớp còn Nháp.{" "}
        {hasSched
          ? "Nếu đổi khóa học, chi nhánh hoặc đợt, lịch học hiện tại sẽ bị xóa và cần xếp lại."
          : ""}{" "}
        Muốn đổi giờ/phòng/giáo viên, dùng nút “Sửa lịch”.
      </Hint>
    </Form>
  );
}
