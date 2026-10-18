import { useState } from "react";
import { Icon } from "../icons.jsx";
import {
  useAsk,
  Btn,
  LinkBtn,
  Badge,
  Card,
  Note,
  H3,
  Bar,
  Meter,
  Table,
  In,
  Sel,
  Filter,
} from "../ui.jsx";
import { useStore } from "../store.jsx";
import { R, U, CFG } from "../lib/rules.js";
import { by, vnd, dmy, TYPE, ROLE, reqDesc, enLabel } from "../lib/util.js";
import {
  NewClassForm,
  ClassEditForm,
  ScheduleForm,
  EnrollForm,
  PayForm,
  ReserveForm,
  TransferForm,
  MakeupForm,
  RejectForm,
  CancelEnrollmentForm,
  VoidPaymentForm,
  SessionEditForm,
} from "../forms.jsx";

import { Head, Stu, Muted, statuses } from "./shared.jsx";

export function Attendance() {
  const { db, user, execute, act } = useStore();
  const [pick, setPick] = useState(null),
    [draft, setDraft] = useState({});
  const today = U.today(),
    [from, setFrom] = useState(U.addDays(today, -90)),
    [to, setTo] = useState(today);
  const list = db.sessions
    .filter(
      (s) =>
        s.date <= to &&
        s.date <= today &&
        s.date >= from &&
        (by(db, "classes", s.classId).status === "Đang học" ||
          (by(db, "classes", s.classId).status === "Kết thúc" && s.held)) &&
        (user.role !== "teacher" || s.teacherId === user.teacherId),
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start),
    );

  const dateFilter = (
    <div className="mb-4 flex flex-wrap gap-3">
      <label>
        Từ ngày
        <In
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        Đến ngày
        <In
          type="date"
          max={today}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
    </div>
  );
  if (!list.length)
    return (
      <>
        <Head title="Điểm danh" />
        {dateFilter}
        <Note>
          Chưa có buổi học phù hợp. Chỉ điểm danh lớp Đang học và tra cứu lịch
          sử lớp Kết thúc.
        </Note>
      </>
    );
  const sid = list.some((s) => s.id === pick) ? pick : list[0]?.id,
    s = by(db, "sessions", sid),
    rows = R.attendees(db, sid);
  const val = (e) =>
    draft[`${sid}:${e.id}`] ??
    (
      db.attendance.find(
        (x) => x.sessionId === sid && x.enrollmentId === e.id,
      ) || {}
    ).status ??
    "Có mặt";
  const save = () =>
    act(async () => {
      await execute(
        "markAttendance",
        sid,
        rows.map(({ e }) => ({ enrollmentId: e.id, status: val(e) })),
      );
      setDraft({});
    }, "Đã lưu điểm danh");
  return (
    <>
      <Head title="Điểm danh" />
      {dateFilter}
      <div className="mb-3.5">
        <Sel
          className="max-w-md"
          value={sid}
          onChange={(e) => {
            setPick(e.target.value);
            setDraft({});
          }}
          options={list.map((x) => [
            x.id,
            `${dmy(x.date)} ${x.start} · ${by(db, "classes", x.classId).code} · buổi ${x.no}${x.held ? " ✔" : ""}`,
          ])}
        />
      </div>
      <Table
        head={["Học viên", "Ghi chú", "Có mặt", "Vắng"]}
        rows={rows.map(({ e, makeup }) => (
          <tr key={e.id}>
            <td>
              <Stu id={e.studentId} />
            </td>
            <td>{makeup && <Badge t="Học bù" />}</td>
            {["Có mặt", "Vắng"].map((v) => (
              <td key={v}>
                <input
                  type="radio"
                  name={`st_${e.id}`}
                  checked={val(e) === v}
                  onChange={() => setDraft({ ...draft, [`${sid}:${e.id}`]: v })}
                />
              </td>
            ))}
          </tr>
        ))}
      />
      <Btn onClick={save}>
        {s.held ? "Cập nhật điểm danh" : "Lưu điểm danh"}
      </Btn>
    </>
  );
}

/* ---------------- Thời khóa biểu ---------------- */
