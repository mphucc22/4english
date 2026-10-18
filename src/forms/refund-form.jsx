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

export function RefundForm({ sid }) {
  const { db, execute } = useStore(),
    st = by(db, "students", sid);
  return (
    <Form
      title={`Hoàn số dư – ${st.name}`}
      ok="Ghi nhận hoàn tiền"
      confirm="Bạn đã kiểm tra khoản hoàn tiền này?"
      onSubmit={(fd) => execute("refundBalance", sid, Object.fromEntries(fd))}
    >
      <p className="mb-4">
        Số dư hiện tại: <b>{vnd(st.balance)}</b>
      </p>
      <Fld label="Số tiền hoàn (₫)">
        <In
          required
          name="amount"
          type="number"
          min={1}
          max={st.balance}
          step={1}
        />
      </Fld>
      <Fld label="Hình thức">
        <Sel
          required
          name="method"
          options={["Tiền mặt", "Chuyển khoản"].map((x) => [x, x])}
        />
      </Fld>
      <Fld label="Lý do / chứng từ">
        <Area required name="note" />
      </Fld>
      <Hint>
        Thao tác ghi nhận sổ nội bộ. Nhóm phải tự đối chiếu việc chi tiền thực
        tế.
      </Hint>
    </Form>
  );
}
