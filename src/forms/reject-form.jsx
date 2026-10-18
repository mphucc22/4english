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

export function RejectForm({ id }) {
  const { db, user, execute } = useStore();
  return (
    <Form
      title="Từ chối yêu cầu"
      ok="Từ chối"
      confirm="Bạn có chắc chắn muốn từ chối yêu cầu này?"
      onSubmit={async (fd) => {
        await execute("reject", id, fd.get("note"));
        return "Đã từ chối yêu cầu";
      }}
    >
      <Fld label="Lý do từ chối">
        <Area required name="note" />
      </Fld>
    </Form>
  );
}
