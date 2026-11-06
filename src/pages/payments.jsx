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

export function Payments() {
  const { db, user, execute, openModal } = useStore();
  const [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1);
  const matches = (e) =>
    !q || enLabel(db, e).toLowerCase().includes(q.toLowerCase());
  const debts = db.enrollments.filter(
    (e) => R.collectible(db, e) && matches(e),
  );
  const pays = db.payments
    .slice()
    .reverse()
    .filter(
      (p) =>
        (!from || p.date >= from) &&
        (!to || p.date <= to) &&
        (!q ||
          (p.no + " " + enLabel(db, by(db, "enrollments", p.enrollmentId)))
            .toLowerCase()
            .includes(q.toLowerCase())),
    );
  const last = Math.max(1, Math.ceil(pays.length / 30)),
    current = Math.min(page, last);
  return (
    <>
      <Head title="Học phí" />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1">
          Tìm học viên / lớp / phiếu
          <In
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên, mã lớp hoặc số phiếu…"
          />
        </label>
        <label>
          Từ ngày
          <In
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Đến ngày
          <In
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <H3>Công nợ cần thu ({debts.length})</H3>
      <Table
        head={[
          "Học viên",
          "Lớp",
          "Phải thu",
          "Đã đóng",
          "Còn nợ",
          "Trạng thái",
          "",
        ]}
        rows={debts.map((e) => (
          <tr key={e.id}>
            <td>
              <Stu id={e.studentId} />
            </td>
            <td>{by(db, "classes", e.classId).code}</td>
            <td>{vnd(e.billableFee ?? e.fee)}</td>
            <td>{vnd(R.paid(db, e.id))}</td>
            <td className="font-bold text-teal-800">{vnd(R.due(db, e))}</td>
            <td>
              <Badge t={e.status} />
            </td>
            <td>
              <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>
                Thu phí
              </Btn>
            </td>
          </tr>
        ))}
      />
      <H3>Sổ phiếu thu ({pays.length})</H3>
      <Table
        head={[
          "Số phiếu",
          "Ngày",
          "Học viên",
          "Lớp",
          "Cơ sở thu",
          "Hình thức",
          "Số tiền",
          "Người thu",
          "",
        ]}
        right={[6]}
        rows={pays.slice((current - 1) * 30, current * 30).map((p) => (
          <tr key={p.id} className={p.voided ? "opacity-60" : ""}>
            <td>
              {p.no}
              {p.voided && (
                <>
                  <br />
                  <Badge t="Đã hủy" />
                </>
              )}
            </td>
            <td>{dmy(p.date)}</td>
            <td>
              <Stu id={p.studentId} />
            </td>
            <td>
              {
                by(db, "classes", by(db, "enrollments", p.enrollmentId).classId)
                  .code
              }
            </td>
            <td>
              {by(db, "branches", p.branchId).name || "Chưa xác định"}
            </td>
            <td>
              {p.method}
              <br />
              <Muted>{p.voidNote || p.note}</Muted>
            </td>
            <td className="text-right font-semibold">{vnd(p.amount)}</td>
            <td>{p.by}</td>
            <td>
              {R.can(user, "approve") && !p.voided && p.type === "Thu" && (
                <Btn
                  sm
                  v="ghost"
                  onClick={() => openModal(<VoidPaymentForm pid={p.id} />)}
                >
                  Hủy phiếu
                </Btn>
              )}
            </td>
          </tr>
        ))}
      />
      <div className="mb-7 flex items-center justify-end gap-3">
        <span className="text-sm text-slate-500">
          Trang {current}/{last}
        </span>
        <Btn
          sm
          v="ghost"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          Trước
        </Btn>
        <Btn
          sm
          v="ghost"
          disabled={current === last}
          onClick={() => setPage(current + 1)}
        >
          Sau
        </Btn>
      </div>
      <H3>Sổ hoàn tiền</H3>
      <Table
        head={[
          "Ngày",
          "Học viên",
          "Hình thức",
          "Số tiền",
          "Lý do",
          "Người ghi",
        ]}
        rows={db.refunds
          .slice()
          .reverse()
          .map((x) => (
            <tr key={x.id}>
              <td>{dmy(x.date)}</td>
              <td>
                <Stu id={x.studentId} />
              </td>
              <td>{x.method}</td>
              <td>{vnd(x.amount)}</td>
              <td>{x.note}</td>
              <td>{x.by}</td>
            </tr>
          ))}
      />
    </>
  );
}

/* ---------------- Yêu cầu đặc biệt ---------------- */
