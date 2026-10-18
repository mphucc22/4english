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

export function Requests() {
  const { db, user, execute, act, openModal } = useStore(),
    ask = useAsk();
  const [rt, setRt] = useState(""),
    [rs, setRs] = useState("");
  const can = R.can(user, "approve"),
    rows = db.requests
      .filter((r) => (!rt || r.type === rt) && (!rs || r.status === rs))
      .slice()
      .reverse();
  return (
    <>
      <Head title="Bảo lưu · Chuyển lớp · Học bù" />
      <Note>
        Tạo yêu cầu từ trang <b>Đăng ký học</b>. Chỉ <b>Quản lý đào tạo</b> được
        duyệt; khi duyệt, hệ thống kiểm tra lại toàn bộ điều kiện và hoàn tác
        nếu có lỗi.
      </Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <Filter
          value={rt}
          onChange={(e) => setRt(e.target.value)}
          ph="Mọi loại"
          options={Object.entries(TYPE)}
        />
        <Filter
          value={rs}
          onChange={(e) => setRs(e.target.value)}
          ph="Mọi trạng thái"
          options={statuses(["Chờ duyệt", "Đã duyệt", "Từ chối", "Đã hủy"])}
        />
      </div>
      <Table
        head={[
          "Loại",
          "Học viên",
          "Nội dung",
          "Lý do",
          "Người tạo",
          "Trạng thái / kết quả",
          "",
        ]}
        rows={rows.map((r) => (
          <tr key={r.id}>
            <td>
              <b>{TYPE[r.type]}</b>
              <br />
              <Muted>{dmy(r.createdAt)}</Muted>
            </td>
            <td>
              <Stu id={r.studentId} />
            </td>
            <td>{reqDesc(db, r)}</td>
            <td>{r.reason}</td>
            <td>{r.createdBy}</td>
            <td>
              <Badge t={r.status} />
              {r.result && (
                <>
                  <br />
                  <small>{r.result}</small>
                </>
              )}
              {["Từ chối", "Đã hủy"].includes(r.status) && (
                <>
                  <br />
                  <small>{r.note}</small>
                </>
              )}
            </td>
            <td>
              {can && r.status === "Chờ duyệt" && (
                <div className="flex gap-1.5">
                  <Btn
                    v="ok"
                    sm
                    onClick={() =>
                      ask({
                        title: "Duyệt yêu cầu này?",
                        message: `${TYPE[r.type]}: ${reqDesc(db, r)}. Hệ thống sẽ áp dụng thay đổi ngay sau khi duyệt.`,
                        ok: "Duyệt",
                        onConfirm: () =>
                          act(
                            async () => (await execute("approve", r.id)).result,
                            "Đã duyệt",
                            true,
                          ),
                      })
                    }
                  >
                    Duyệt
                  </Btn>
                  <Btn
                    v="bad"
                    sm
                    onClick={() => openModal(<RejectForm id={r.id} />)}
                  >
                    Từ chối
                  </Btn>
                </div>
              )}
            </td>
          </tr>
        ))}
      />
      <H3>Phiếu bảo lưu</H3>
      <Table
        head={[
          "Học viên",
          "Lớp đã bảo lưu",
          "Học phí giữ lại",
          "Hạn bảo lưu",
          "Trạng thái",
        ]}
        rows={db.reservations.map((v) => (
          <tr key={v.id}>
            <td>
              <Stu id={v.studentId} />
            </td>
            <td>
              {
                by(db, "classes", by(db, "enrollments", v.enrollmentId).classId)
                  .code
              }
            </td>
            <td>{vnd(v.credit)}</td>
            <td>{dmy(v.expires)}</td>
            <td>
              <Badge
                t={
                  v.status === "Đang bảo lưu" && v.expires < U.today()
                    ? "Hết hạn"
                    : v.status
                }
              />
            </td>
          </tr>
        ))}
      />
    </>
  );
}

/* ---------------- Điểm danh ---------------- */
