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

export function Leads() {
  const { db, execute, act } = useStore();
  return (
    <>
      <Head title="Yêu cầu tư vấn" />
      <Table
        head={[
          "Ngày",
          "Họ tên",
          "Điện thoại",
          "Khóa quan tâm",
          "Ghi chú",
          "Trạng thái",
        ]}
        rows={db.leads
          .slice()
          .reverse()
          .map((l) => (
            <tr key={l.id}>
              <td>{dmy(l.createdAt)}</td>
              <td>{l.name}</td>
              <td>{l.phone}</td>
              <td>{l.course}</td>
              <td>{l.note}</td>
              <td>
                <Sel
                  className="w-auto"
                  value={l.status}
                  onChange={(e) =>
                    act(() => execute("setLeadStatus", l.id, e.target.value))
                  }
                  options={statuses(["Mới", "Đã liên hệ", "Đã ghi danh"])}
                />
              </td>
            </tr>
          ))}
      />
    </>
  );
}
