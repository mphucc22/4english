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

export function PayForm({ eid }) {
  const { db, user, execute } = useStore();
  const e = by(db, "enrollments", eid),
    st = by(db, "students", e.studentId),
    due = R.due(db, e);
  return (
    <Form
      title={`Thu học phí – ${st.name}`}
      ok="Ghi nhận thu"
      celebrate
      confirm="Bạn có chắc chắn muốn ghi nhận khoản thu này?"
      onSubmit={async (fd) => {
        const p = await execute("addPayment", eid, {
          amount: fd.get("amount"),
          method: fd.get("method"),
          note: fd.get("note"),
        });
        return `Đã lập phiếu thu ${p.no}`;
      }}
    >
      <p className="mb-3">
        Lớp <b>{by(db, "classes", e.classId).code}</b> · học phí {vnd(e.fee)} ·
        còn nợ <b>{vnd(due)}</b>
      </p>
      <Fld label="Số tiền (₫)">
        <In
          required
          type="number"
          name="amount"
          defaultValue={due}
          min="1"
          max={due}
        />
      </Fld>
      <Fld label="Hình thức">
        <Sel
          required
          name="method"
          options={[
            ["Tiền mặt", "Tiền mặt"],
            ["Chuyển khoản", "Chuyển khoản"],
            ...(st.balance > 0
              ? [["Số dư", `Trừ số dư (${vnd(st.balance)})`]]
              : []),
          ]}
        />
      </Fld>
      <Fld label="Ghi chú">
        <In name="note" />
      </Fld>
    </Form>
  );
}
