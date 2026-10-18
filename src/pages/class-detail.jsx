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

export function ClassDetail({ id }) {
  const { db, user, execute, act, openModal } = useStore(),
    ask = useAsk();
  const c = by(db, "classes", id);
  if (!c.id)
    return (
      <>
        <Head title="Không tìm thấy lớp" />
        <LinkBtn v="ghost" href="#/app/classes">
          ← Danh sách lớp
        </LinkBtn>
      </>
    );
  const co = by(db, "courses", c.courseId),
    ss = R.sessions(db, id),
    ens = db.enrollments.filter((e) => e.classId === id),
    conf = R.confirmed(db, id).length;
  const k = R.can(user, "klass"),
    en = R.can(user, "enroll"),
    open = ["Mở đăng ký", "Đang học"].includes(c.status),
    pre = ["Nháp", "Mở đăng ký"].includes(c.status);
  const KV = ({ l, children }) => (
    <>
      <dt className="text-slate-500">{l}</dt>
      <dd className="font-semibold">{children}</dd>
    </>
  );
  return (
    <>
      <Head
        title={
          <>
            Lớp {c.code} <Badge t={c.status} />
          </>
        }
      >
        <LinkBtn v="ghost" href="#/app/classes">
          ← Danh sách
        </LinkBtn>
        {en && open && (
          <Btn onClick={() => openModal(<EnrollForm cid={id} />)}>
            + Đăng ký học viên
          </Btn>
        )}
        {k && pre && (
          <Btn v="ghost" onClick={() => openModal(<ScheduleForm id={id} />)}>
            {ss.length ? "Sửa lịch" : "Xếp lịch"}
          </Btn>
        )}
        {k && c.status === "Nháp" && (
          <Btn
            onClick={() =>
              ask({
                title: "Mở đăng ký cho lớp này?",
                message:
                  "Sau khi mở, nhân viên ghi danh có thể đăng ký học viên vào lớp.",
                ok: "Mở đăng ký",
                onConfirm: () =>
                  act(
                    () => execute("openRegistration", id),
                    "Lớp đã mở đăng ký",
                  ),
              })
            }
          >
            Mở đăng ký
          </Btn>
        )}
        {k && c.status === "Mở đăng ký" && (
          <Btn
            v="ok"
            onClick={() =>
              ask({
                title: "Xác nhận mở lớp?",
                message:
                  "Lớp sẽ chuyển sang “Đang học”. Hệ thống kiểm tra lại sĩ số tối thiểu và lịch học.",
                ok: "Xác nhận mở lớp",
                onConfirm: () =>
                  act(
                    () => execute("confirmOpen", id),
                    "Lớp đã được xác nhận mở – bắt đầu đào tạo",
                    true,
                  ),
              })
            }
          >
            Xác nhận mở lớp
          </Btn>
        )}
        {k && c.status === "Đang học" && (
          <Btn
            v="warn"
            onClick={() =>
              ask({
                title: "Kết thúc lớp này?",
                message: `Lớp ${c.code} sẽ chuyển sang “Kết thúc” và các học viên đã xác nhận được ghi nhận hoàn thành.`,
                ok: "Kết thúc lớp",
                onConfirm: () =>
                  act(() => execute("finishClass", id), "Đã kết thúc lớp"),
              })
            }
          >
            Kết thúc lớp
          </Btn>
        )}
        {k && c.status === "Nháp" && (
          <Btn v="ghost" onClick={() => openModal(<ClassEditForm id={id} />)}>
            Sửa thông tin
          </Btn>
        )}
        {k && ["Nháp", "Đã hủy"].includes(c.status) && (
          <Btn
            v="bad"
            onClick={() =>
              ask({
                title: "Bạn có chắc chắn muốn xóa lớp?",
                message: `Lớp ${c.code} sẽ bị xóa vĩnh viễn cùng lịch học. Chỉ xóa được lớp chưa có dữ liệu đăng ký.`,
                ok: "Xóa lớp",
                danger: true,
                onConfirm: async () => {
                  if (await act(() => execute("deleteClass", id)))
                    location.hash = "#/app/classes";
                },
              })
            }
          >
            Xóa lớp
          </Btn>
        )}
        {k && pre && (
          <Btn
            v="bad"
            onClick={() =>
              ask({
                title: "Bạn có chắc chắn muốn hủy lớp?",
                message: `Lớp ${c.code} sẽ bị hủy, lịch học được giữ để tra cứu và học phí đã đóng chuyển vào số dư của từng học viên.`,
                ok: "Hủy lớp",
                danger: true,
                onConfirm: () =>
                  act(() => execute("cancelClass", id), "Đã hủy lớp"),
              })
            }
          >
            Hủy lớp
          </Btn>
        )}
      </Head>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <dl className="grid grid-cols-[150px_1fr] gap-1.5">
            <KV l="Khóa học">{co.name}</KV>
            <KV l="Học phí">{vnd(co.fee)}</KV>
            <KV l="Chi nhánh">{by(db, "branches", c.branchId).name}</KV>
            <KV l="Đợt đào tạo">{by(db, "terms", c.termId).name}</KV>
            <KV l="Lịch học">{R.scheduleText(c)}</KV>
            <KV l="Phòng / Giáo viên">
              {c.roomId
                ? `${by(db, "rooms", c.roomId).name} · ${by(db, "teachers", c.teacherId).name}`
                : "—"}
            </KV>
            <KV l="Thời gian">
              {c.startDate ? `${dmy(c.startDate)} → ${dmy(c.endDate)}` : "—"}
            </KV>
          </dl>
        </Card>
        <Card>
          <b>Sĩ số</b>
          <div className="text-3xl font-extrabold">
            {R.live(db, id).length}
            <small className="text-base text-slate-500">
              {" "}
              / {CFG.maxStudents}
            </small>
          </div>
          <p className="my-1.5">
            Đã xác nhận: <b>{conf}</b> / tối thiểu {CFG.minStudents}
          </p>
          <Meter v={conf} min={CFG.minStudents} />
          <p className="mt-2.5 text-slate-500">
            Đã học {R.held(db, id)}/{ss.length} buổi
          </p>
        </Card>
      </div>
      <H3>Học viên</H3>
      <Table
        head={["Học viên", "Trạng thái", "Học phí", "Đã đóng", "Còn nợ", ""]}
        right={[2, 3, 4]}
        rows={ens.map((e) => {
          const live = ["Chờ đóng phí", "Đã xác nhận"].includes(e.status);
          return (
            <tr key={e.id}>
              <td>
                <Stu id={e.studentId} />
              </td>
              <td>
                <Badge t={e.status} />
              </td>
              <td className="text-right">{vnd(e.fee)}</td>
              <td className="text-right">{vnd(R.paid(db, e.id))}</td>
              <td className="text-right">{vnd(R.due(db, e))}</td>
              <td>
                {R.can(user, "pay") && R.collectible(db, e) && (
                  <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>
                    Thu phí
                  </Btn>
                )}
              </td>
            </tr>
          );
        })}
      />
      <H3>Các buổi học ({ss.length})</H3>
      <Table
        head={[
          "Buổi",
          "Ngày",
          "Thứ",
          "Giờ",
          "Phòng",
          "Giáo viên",
          "Trạng thái",
          "",
        ]}
        rows={ss.map((s) => (
          <tr key={s.id}>
            <td>{s.no}</td>
            <td>{dmy(s.date)}</td>
            <td>{U.DOW[U.dow(s.date)]}</td>
            <td>
              {s.start}-{s.end}
            </td>
            <td>{by(db, "rooms", s.roomId).name}</td>
            <td>{by(db, "teachers", s.teacherId).name}</td>
            <td>
              {s.held ? (
                <Badge t="Đã học" />
              ) : s.date < U.today() ? (
                <Badge t="Chưa điểm danh" c="red" />
              ) : (
                <Badge t="Sắp tới" />
              )}
            </td>
            <td>
              {k && open && !s.held && (
                <Btn
                  sm
                  v="ghost"
                  onClick={() => openModal(<SessionEditForm sid={s.id} />)}
                >
                  Điều chỉnh
                </Btn>
              )}
            </td>
          </tr>
        ))}
      />
    </>
  );
}

/* ---------------- Đăng ký học & học phí ---------------- */
