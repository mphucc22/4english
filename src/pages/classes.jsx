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

export function Classes() {
  const { db, user, execute, act, openModal } = useStore(),
    ask = useAsk();
  const [cb, setCb] = useState(""),
    [ct, setCt] = useState(""),
    [cs, setCs] = useState("");
  const list = db.classes
    .filter(
      (c) =>
        (!cb || c.branchId === cb) &&
        (!ct || c.termId === ct) &&
        (!cs || c.status === cs),
    )
    .sort((a, b) => a.code.localeCompare(b.code));
  return (
    <>
      <Head title="Lớp học">
        {R.can(user, "klass") && (
          <Btn onClick={() => openModal(<NewClassForm />)}>+ Tạo lớp</Btn>
        )}
      </Head>
      <Note>
        Luật: lớp chỉ được <b>xác nhận mở</b> khi có ≥ {CFG.minStudents} học
        viên đã xác nhận (đóng ≥ {CFG.minPaidPct * 100}% học phí); tối đa{" "}
        {CFG.maxStudents}; lịch không được trùng phòng hoặc giáo viên.
      </Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <Filter
          value={cb}
          onChange={(e) => setCb(e.target.value)}
          ph="Tất cả chi nhánh"
          options={db.branches.map((b) => [b.id, b.name])}
        />
        <Filter
          value={ct}
          onChange={(e) => setCt(e.target.value)}
          ph="Tất cả đợt"
          options={db.terms.map((t) => [t.id, t.name])}
        />
        <Filter
          value={cs}
          onChange={(e) => setCs(e.target.value)}
          ph="Tất cả trạng thái"
          options={statuses([
            "Nháp",
            "Mở đăng ký",
            "Đang học",
            "Kết thúc",
            "Đã hủy",
          ])}
        />
      </div>
      <Table
        head={[
          "Lớp",
          "Khóa học",
          "Chi nhánh",
          "Đợt",
          "Lịch học",
          "Sĩ số",
          "Trạng thái",
          "",
        ]}
        rows={list.map((c) => {
          const conf = R.confirmed(db, c.id).length,
            live = R.live(db, c.id).length;
          return (
            <tr key={c.id}>
              <td className="font-bold">{c.code}</td>
              <td>{by(db, "courses", c.courseId).name}</td>
              <td>{by(db, "branches", c.branchId).name}</td>
              <td>{by(db, "terms", c.termId).name}</td>
              <td>
                {R.scheduleText(c)}
                <br />
                <Muted>
                  {c.roomId
                    ? `${by(db, "rooms", c.roomId).name} · ${by(db, "teachers", c.teacherId).name}`
                    : ""}
                </Muted>
              </td>
              <td className="min-w-40">
                {live}/{CFG.maxStudents}{" "}
                <Muted>
                  (xác nhận {conf}, tối thiểu {CFG.minStudents})
                </Muted>
                <Meter v={conf} min={CFG.minStudents} />
              </td>
              <td>
                <Badge t={c.status} />
              </td>
              <td>
                <div className="flex gap-1.5">
                  <LinkBtn v="ghost" sm href={`#/app/class/${c.id}`}>
                    Chi tiết
                  </LinkBtn>
                  {R.can(user, "klass") && c.status === "Nháp" && (
                    <Btn
                      v="ghost"
                      sm
                      onClick={() => openModal(<ClassEditForm id={c.id} />)}
                    >
                      Sửa
                    </Btn>
                  )}
                  {R.can(user, "klass") &&
                    ["Nháp", "Đã hủy"].includes(c.status) && (
                      <Btn
                        v="ghost"
                        sm
                        onClick={() =>
                          ask({
                            title: "Bạn có chắc chắn muốn xóa lớp?",
                            message: `Lớp ${c.code} sẽ bị xóa vĩnh viễn. Chỉ xóa được lớp chưa có dữ liệu đăng ký.`,
                            ok: "Xóa lớp",
                            danger: true,
                            onConfirm: () =>
                              act(() => execute("deleteClass", c.id)),
                          })
                        }
                      >
                        Xóa
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
