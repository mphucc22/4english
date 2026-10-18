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

export function VoidPaymentForm({ pid }) {
  const { execute } = useStore();
  return (
    <Form
      title="Hủy phiếu thu sai"
      ok="Hủy phiếu"
      confirm="Giữ phiếu trong lịch sử và loại khoản thu khỏi công nợ?"
      onSubmit={(fd) => execute("voidPayment", pid, fd.get("reason"))}
    >
      <Fld label="Lý do hủy">
        <Area required name="reason" />
      </Fld>
    </Form>
  );
}
