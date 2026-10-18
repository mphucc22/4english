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

export function CancelEnrollmentForm({ eid }) {
  const { execute } = useStore();
  return (
    <Form
      title="Hủy đăng ký học"
      ok="Hủy đăng ký"
      confirm="Đóng đăng ký và chuyển học phí chưa sử dụng vào số dư?"
      onSubmit={(fd) => execute("cancelEnrollment", eid, fd.get("reason"))}
    >
      <Hint>
        Học phí của buổi đã học được khấu trừ. Công nợ phần đã học vẫn có thể
        thu sau khi hủy.
      </Hint>
      <Fld label="Lý do hủy">
        <Area required name="reason" />
      </Fld>
    </Form>
  );
}
