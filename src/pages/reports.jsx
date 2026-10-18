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

export function Reports() {
  const { db } = useStore();
  const r = R.report(db),
    maxRev = Math.max(1, ...r.byBranch.map((x) => x.revenue)),
    cls = db.classes.filter((c) =>
      ["Mở đăng ký", "Đang học"].includes(c.status),
    );
  return (
    <>
      <Head title="Báo cáo">
        <Btn v="ghost" className="no-print" onClick={() => window.print()}>
          In báo cáo
        </Btn>
      </Head>
      <H3>Theo chi nhánh</H3>
      <Table
        head={[
          "Chi nhánh",
          "Số lớp",
          "Đang học",
          "Học viên",
          "Tiền thu ngoài",
          "",
          "Còn phải thu",
        ]}
        right={[4, 6]}
        rows={r.byBranch.map((x) => (
          <tr key={x.b.id}>
            <td>
              <b>{x.b.name}</b>
            </td>
            <td>{x.classes}</td>
            <td>{x.running}</td>
            <td>{x.students}</td>
            <td className="text-right">{vnd(x.revenue)}</td>
            <td className="w-36">
              <Bar v={x.revenue} max={maxRev} />
            </td>
            <td className="text-right">{vnd(x.receivable)}</td>
          </tr>
        ))}
      />
      <H3>Theo khóa học</H3>
      <Table
        head={["Khóa học", "Số lớp", "Học viên"]}
        rows={r.byCourse.map((x) => (
          <tr key={x.co.id}>
            <td>{x.co.name}</td>
            <td>{x.classes}</td>
            <td>{x.students}</td>
          </tr>
        ))}
      />
      <H3>Mức độ lấp đầy lớp đang mở</H3>
      <Table
        head={["Lớp", "Sĩ số", "Tỷ lệ lấp đầy"]}
        rows={cls.map((c) => {
          const n = R.live(db, c.id).length;
          return (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>
                {n}/{CFG.maxStudents}
              </td>
              <td className="w-64">
                <Bar v={n} max={CFG.maxStudents} />
              </td>
            </tr>
          );
        })}
      />
      <Card className="mb-4">
        Tiền hoàn từ số dư:{" "}
        <b>{vnd(db.refunds.reduce((sum, x) => sum + x.amount, 0))}</b> · Tiền
        thu ngoài sau hoàn:{" "}
        <b>
          {vnd(
            db.payments
              .filter((p) => p.type === "Thu" && !p.voided)
              .reduce((sum, x) => sum + x.amount, 0) -
              db.refunds.reduce((sum, x) => sum + x.amount, 0),
          )}
        </b>
      </Card>
      <Card>
        Tỷ lệ chuyên cần toàn hệ thống:{" "}
        <b>{r.attRate == null ? "—" : Math.round(r.attRate * 100) + "%"}</b>
      </Card>
    </>
  );
}
