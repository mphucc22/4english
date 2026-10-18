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

export function ReserveForm({ eid }) {
  const { db, user, execute } = useStore();
  const e = by(db, "enrollments", eid),
    c = by(db, "classes", e.classId),
    total = R.sessions(db, c.id).length,
    done = R.held(db, c.id);
  return (
    <Form
      title="Yêu cầu bảo lưu"
      ok="Gửi yêu cầu"
      onSubmit={async (fd) => {
        await execute(
          "createRequest",
          "reserve",
          { enrollmentId: eid },
          fd.get("reason"),
        );
        return "Đã gửi yêu cầu bảo lưu – chờ duyệt";
      }}
    >
      <p className="mb-3">
        <b>{enLabel(db, e)}</b> – đã học {done}/{total} buổi.
      </p>
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">
        Chỉ bảo lưu khi đã học không quá {CFG.maxReservePct * 100}% số buổi. Học
        phí các buổi chưa học được giữ lại, hạn bảo lưu {CFG.reserveMonths}{" "}
        tháng kể từ ngày duyệt.
      </div>
      <Fld label="Lý do bảo lưu">
        <Area required name="reason" />
      </Fld>
    </Form>
  );
}
