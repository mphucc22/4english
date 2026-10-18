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

export function Dashboard() {
  const { db, user, execute } = useStore();
  const today = U.today(),
    month = today.slice(0, 7);
  if (user.role === "teacher") {
    const mine = db.sessions
      .filter(
        (s) =>
          s.teacherId === user.teacherId &&
          by(db, "classes", s.classId).status !== "Đã hủy" &&
          s.date >= today,
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
      )
      .slice(0, 8);
    return (
      <>
        <Head title={`Xin chào, ${user.name}`} />
        <H3>Các buổi dạy sắp tới</H3>
        <Table
          head={["Ngày", "Giờ", "Lớp", "Phòng", "Buổi"]}
          rows={mine.map((s) => (
            <tr key={s.id}>
              <td>
                {dmy(s.date)} {s.date === today && <Badge t="Hôm nay" />}
              </td>
              <td>
                {s.start}-{s.end}
              </td>
              <td>{by(db, "classes", s.classId).code}</td>
              <td>{by(db, "rooms", s.roomId).name}</td>
              <td>{s.no}</td>
            </tr>
          ))}
        />
      </>
    );
  }
  const rev = db.payments
    .filter((p) => p.type === "Thu" && !p.voided && p.date.startsWith(month))
    .reduce((s, p) => s + p.amount, 0);
  const debt = db.enrollments
    .filter((e) => R.collectible(db, e))
    .reduce((s, e) => s + R.due(db, e), 0);
  const stat = [
    [
      "Lớp đang học",
      db.classes.filter((c) => c.status === "Đang học").length,
      "classes",
      "from-teal-500 to-cyan-400",
    ],
    [
      "Lớp mở đăng ký",
      db.classes.filter((c) => c.status === "Mở đăng ký").length,
      "timetable",
      "from-teal-500 to-fuchsia-400",
    ],
    [
      "Học viên đang học",
      db.enrollments.filter((e) => e.status === "Đã xác nhận").length,
      "students",
      "from-emerald-500 to-lime-400",
    ],
    ["Thu trong tháng", rev, "money", "from-amber-500 to-orange-400"],
    ["Học phí còn phải thu", debt, "payments", "from-rose-500 to-pink-400"],
    [
      "Yêu cầu chờ duyệt",
      db.requests.filter((r) => r.status === "Chờ duyệt").length,
      "requests",
      "from-teal-500 to-teal-400",
    ],
  ];
  const risk = db.classes.filter((c) => c.status === "Mở đăng ký"),
    ts = db.sessions
      .filter(
        (s) =>
          s.date === today &&
          by(db, "classes", s.classId).status === "Đang học",
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <p className="eyebrow">KHÔNG GIAN QUẢN LÝ ĐÀO TẠO</p>
          <h1>Xin chào, {user.name}</h1>
          <p>
            {ROLE[user.role]} · {dmy(today)}
          </p>
        </div>
        <span className="welcome-emblem">
          <Icon name="book" size={56} />
        </span>
      </div>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stat.map(([label, value, icon]) => (
          <Card key={label} className="stat-card">
            <span className="feature-icon">
              <Icon name={icon} />
            </span>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <b className="mt-1 block text-2xl font-bold">
                {/thu/i.test(label) ? vnd(value) : value}
              </b>
            </div>
          </Card>
        ))}
      </div>
      <H3>Lớp đang mở đăng ký – theo dõi sĩ số tối thiểu</H3>
      <Table
        head={["Lớp", "Chi nhánh", "Khai giảng", "Đã xác nhận", "Trạng thái"]}
        rows={risk.map((c) => {
          const n = R.confirmed(db, c.id).length;
          return (
            <tr key={c.id}>
              <td>
                <a
                  className="font-bold text-teal-700"
                  href={`#/app/class/${c.id}`}
                >
                  {c.code}
                </a>
              </td>
              <td>{by(db, "branches", c.branchId).name}</td>
              <td>{dmy(c.startDate)}</td>
              <td>
                <div className="w-40">
                  {n}/{CFG.minStudents}
                  <Meter v={n} min={CFG.minStudents} />
                </div>
              </td>
              <td>
                {n >= CFG.minStudents ? (
                  <Badge t="Đủ điều kiện mở" />
                ) : (
                  <Badge t={`Thiếu ${CFG.minStudents - n}`} c="amber" />
                )}
              </td>
            </tr>
          );
        })}
      />
      <H3>Buổi học hôm nay ({dmy(today)})</H3>
      <Table
        head={["Giờ", "Lớp", "Chi nhánh", "Phòng", "Giáo viên"]}
        rows={ts.map((s) => (
          <tr key={s.id}>
            <td>
              {s.start}-{s.end}
            </td>
            <td>{by(db, "classes", s.classId).code}</td>
            <td>
              {by(db, "branches", by(db, "classes", s.classId).branchId).name}
            </td>
            <td>{by(db, "rooms", s.roomId).name}</td>
            <td>{by(db, "teachers", s.teacherId).name}</td>
          </tr>
        ))}
      />
    </>
  );
}

/* ---------------- Lớp học ---------------- */
