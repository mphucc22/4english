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

export function NewClassForm() {
  const { db, user, execute } = useStore();
  return (
    <Form
      title="Tạo lớp mới"
      ok="Tạo lớp"
      onSubmit={async (fd) => {
        const c = await execute("createClass", Object.fromEntries(fd));
        location.hash = "#/app/class/" + c.id;
        return "Đã tạo lớp " + c.code;
      }}
    >
      <Fld label="Khóa học">
        <Sel
          required
          name="courseId"
          options={db.courses.map((c) => [c.id, `${c.name} – ${vnd(c.fee)}`])}
        />
      </Fld>
      <Fld label="Chi nhánh">
        <Sel
          required
          name="branchId"
          options={db.branches.map((b) => [b.id, b.name])}
        />
      </Fld>
      <Fld label="Đợt đào tạo">
        <Sel
          required
          name="termId"
          options={db.terms.map((t) => [t.id, t.name])}
        />
      </Fld>
      <Hint>Sau khi tạo, vào chi tiết lớp để xếp lịch rồi mở đăng ký.</Hint>
    </Form>
  );
}
