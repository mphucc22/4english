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

export function MakeupForm({ eid }) {
  const { db, user, execute } = useStore();
  const e = by(db, "enrollments", eid),
    c = by(db, "classes", e.classId),
    today = U.today();
  const used = db.requests
    .filter(
      (r) =>
        r.type === "makeup" &&
        r.data.enrollmentId === eid &&
        ["Chờ duyệt", "Đã duyệt"].includes(r.status),
    )
    .map((r) => r.data.missedSessionId);
  const missed = db.attendance
    .filter(
      (a) =>
        a.enrollmentId === eid &&
        a.status === "Vắng" &&
        !used.includes(a.sessionId),
    )
    .map((a) => by(db, "sessions", a.sessionId));
  const targets = db.sessions
    .filter(
      (s) =>
        s.date >= today &&
        !s.held &&
        s.classId !== c.id &&
        by(db, "classes", s.classId).courseId === c.courseId &&
        by(db, "classes", s.classId).status === "Đang học",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Form
      title="Đăng ký học bù"
      ok="Gửi yêu cầu"
      onSubmit={async (fd) => {
        await execute(
          "createRequest",
          "makeup",
          {
            enrollmentId: eid,
            missedSessionId: fd.get("missed"),
            targetSessionId: fd.get("target"),
          },
          fd.get("reason"),
        );
        return "Đã gửi yêu cầu học bù – chờ duyệt";
      }}
    >
      <p className="mb-3">
        <b>{enLabel(db, e)}</b> · tối đa {CFG.maxMakeup} buổi học bù / đăng ký.
      </p>
      <Fld label="Buổi đã vắng">
        <Sel
          required
          name="missed"
          options={missed.map((s) => [s.id, `Buổi ${s.no} – ${dmy(s.date)}`])}
        />
      </Fld>
      <Fld label="Buổi học bù (lớp khác, cùng khóa)">
        <Sel
          required
          name="target"
          ph="— Chọn buổi —"
          options={targets.map((s) => [
            s.id,
            `${dmy(s.date)} ${s.start} · ${by(db, "classes", s.classId).code} · buổi ${s.no} · ${by(db, "rooms", s.roomId).name}`,
          ])}
        />
      </Fld>
      <Fld label="Lý do">
        <Area required name="reason" />
      </Fld>
    </Form>
  );
}
