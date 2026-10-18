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

export function Enrollments() {
  const { db, user, execute, openModal } = useStore();
  const [q, setQ] = useState(""),
    [es, setEs] = useState("");
  const rows = db.enrollments
    .filter(
      (e) =>
        (!es || e.status === es) &&
        (!q || enLabel(db, e).toLowerCase().includes(q.toLowerCase())),
    )
    .slice()
    .reverse();
  const canPay = R.can(user, "pay"),
    canReq = R.can(user, "request");
  return (
    <>
      <Head title="Đăng ký học" />
      <Note>
        Đăng ký mới được tạo tại{" "}
        <b>Lớp học → chi tiết lớp → Đăng ký học viên</b>. Bảo lưu, chuyển lớp,
        học bù tạo yêu cầu chờ Quản lý đào tạo duyệt.
      </Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <In
          className="max-w-xs"
          placeholder="Tìm học viên / lớp…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Filter
          value={es}
          onChange={(e) => setEs(e.target.value)}
          ph="Mọi trạng thái"
          options={statuses([
            "Chờ đóng phí",
            "Đã xác nhận",
            "Bảo lưu",
            "Đã chuyển lớp",
            "Hoàn thành",
            "Đã hủy",
            "Hết hạn",
          ])}
        />
      </div>
      <Table
        head={[
          "Học viên",
          "Lớp",
          "Học phí",
          "Đã đóng",
          "Còn nợ",
          "Trạng thái",
          "",
        ]}
        right={[2, 3, 4]}
        rows={rows.map((e) => {
          const live = ["Chờ đóng phí", "Đã xác nhận"].includes(e.status);
          return (
            <tr key={e.id}>
              <td>
                <Stu id={e.studentId} />
              </td>
              <td>
                <a className="text-teal-700" href={`#/app/class/${e.classId}`}>
                  {by(db, "classes", e.classId).code}
                </a>
              </td>
              <td className="text-right">{vnd(e.fee)}</td>
              <td className="text-right">{vnd(R.paid(db, e.id))}</td>
              <td className="text-right">{vnd(R.due(db, e))}</td>
              <td>
                <Badge t={e.status} />
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  {canPay && R.collectible(db, e) && (
                    <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>
                      Thu phí
                    </Btn>
                  )}
                  {canReq && e.status === "Đã xác nhận" && (
                    <Btn
                      v="ghost"
                      sm
                      onClick={() => openModal(<ReserveForm eid={e.id} />)}
                    >
                      Bảo lưu
                    </Btn>
                  )}
                  {R.can(user, "approve") && live && (
                    <Btn
                      v="ghost"
                      sm
                      onClick={() =>
                        openModal(<CancelEnrollmentForm eid={e.id} />)
                      }
                    >
                      Hủy đăng ký
                    </Btn>
                  )}
                  {canReq && live && (
                    <Btn
                      v="ghost"
                      sm
                      onClick={() => openModal(<TransferForm eid={e.id} />)}
                    >
                      Chuyển lớp
                    </Btn>
                  )}
                  {canReq && e.status === "Đã xác nhận" && (
                    <Btn
                      v="ghost"
                      sm
                      onClick={() => openModal(<MakeupForm eid={e.id} />)}
                    >
                      Học bù
                    </Btn>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      />
    </>
  );
}
