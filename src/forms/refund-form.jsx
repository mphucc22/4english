import { useState } from "react";
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
  const { db, user, branchId: activeBranchId, execute } = useStore(),
    st = by(db, "students", sid);
  const options = db.branches
    .map((b) => [b.id, `${b.name} — ${vnd(R.branchBalance(db, sid, b.id))}`]);
  if (user.role === "manager" && !activeBranchId && R.branchBalance(db, sid, null) > 0)
    options.push(["__unassigned__", "Số dư cũ chưa xác định cơ sở"]);
  const [branchId, setBranchId] = useState(
    activeBranchId || options.find(([id]) => R.branchBalance(db, sid, id) > 0)?.[0] || "",
  );
  const available = branchId ? R.branchBalance(db, sid, branchId) : 0;
  return (
    <Form
      title={`Hoàn số dư – ${st.name}`}
      ok="Ghi nhận hoàn tiền"
      confirm="Bạn đã kiểm tra khoản hoàn tiền này?"
      onSubmit={(fd) => execute("refundBalance", sid, Object.fromEntries(fd))}
    >
      <p className="mb-4">
        Số dư có thể hoàn tại cơ sở đã chọn: <b>{vnd(available)}</b>
      </p>
      <Fld label="Cơ sở ghi nhận hoàn tiền">
        <Sel
          required
          name="branchId"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          ph="— Chọn cơ sở —"
          options={options}
        />
      </Fld>
      <Fld label="Số tiền hoàn (₫)">
        <In
          required
          name="amount"
          type="number"
          min={1}
          max={available}
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
