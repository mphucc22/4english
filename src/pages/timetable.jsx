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

export function Timetable() {
  const { db, user, execute } = useStore();
  const [mon, setMon] = useState(U.monday(U.today())),
    [tb, setTb] = useState("");
  const today = U.today(),
    days = [...Array(7)].map((_, i) => U.addDays(mon, i));
  const mine = (s) =>
    by(db, "classes", s.classId).status !== "Đã hủy" &&
    (user.role !== "teacher" || s.teacherId === user.teacherId) &&
    (!tb || by(db, "classes", s.classId).branchId === tb);
  return (
    <>
      <Head title="Thời khóa biểu">
        <Btn v="ghost" onClick={() => setMon(U.addDays(mon, -7))}>
          ‹ Tuần trước
        </Btn>
        <Btn v="ghost" onClick={() => setMon(U.monday(today))}>
          Tuần này
        </Btn>
        <Btn v="ghost" onClick={() => setMon(U.addDays(mon, 7))}>
          Tuần sau ›
        </Btn>
      </Head>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <b>
          {dmy(days[0])} – {dmy(days[6])}
        </b>
        {user.role !== "teacher" && (
          <Filter
            value={tb}
            onChange={(e) => setTb(e.target.value)}
            ph="Tất cả chi nhánh"
            options={db.branches.map((b) => [b.id, b.name])}
          />
        )}
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(130px,1fr))] gap-2.5 overflow-auto">
        {days.map((d) => (
          <div
            key={d}
            className={`min-h-32 rounded-xl border bg-white p-2 ${d === today ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200"}`}
          >
            <h4 className="mb-2 text-[13px] font-bold text-slate-500">
              {U.DOW[U.dow(d)]} · {dmy(d).slice(0, 5)}
            </h4>
            {db.sessions
              .filter((s) => s.date === d && mine(s))
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => (
                <div
                  key={s.id}
                  className={`mb-1.5 rounded-md border-l-[3px] px-2 py-1 text-xs ${s.held ? "border-green-600 bg-green-50" : "border-teal-600 bg-teal-50"}`}
                >
                  <b>
                    {s.start}-{s.end}
                  </b>
                  <br />
                  {by(db, "classes", s.classId).code} · B{s.no}
                  <br />
                  {by(db, "rooms", s.roomId).name} ·{" "}
                  {by(db, "teachers", s.teacherId).name.split(" ").slice(-1)[0]}
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Tư vấn, báo cáo, kiểm thử ---------------- */
