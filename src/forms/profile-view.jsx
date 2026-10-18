import {
  Btn,
  Badge,
  Table,
  Form,
  Fld,
  In,
  Area,
  Sel,
  Row2,
  H3,
} from "../ui.jsx";
import { useStore } from "../store.jsx";
import { R, U, CFG } from "../lib/rules.js";
import { by, vnd, dmy, enLabel } from "../lib/util.js";

import { Hint, seats } from "./shared.jsx";
import { ResumeForm } from "./resume-form.jsx";
import { RefundForm } from "./refund-form.jsx";

export function ProfileView({ id }) {
  const { db, user, openModal } = useStore();
  const s = by(db, "students", id),
    ens = db.enrollments.filter((e) => e.studentId === id),
    rvs = db.reservations.filter((v) => v.studentId === id);
  return (
    <Form title={`Hồ sơ – ${s.name}`} lg>
      <dl className="mb-4 grid grid-cols-[130px_1fr] gap-1.5 [&_dd]:font-semibold [&_dt]:text-slate-500">
        <dt>Mã / Trình độ</dt>
        <dd>
          {s.code} · {s.level}
        </dd>
        <dt>Liên hệ</dt>
        <dd>
          {s.phone} · {s.email}
        </dd>
        <dt>Số dư học phí</dt>
        <dd>
          {vnd(s.balance)}{" "}
          {user.role === "manager" && s.balance > 0 && (
            <Btn
              sm
              v="ghost"
              onClick={() => openModal(<RefundForm sid={id} />)}
            >
              Hoàn tiền
            </Btn>
          )}
        </dd>
      </dl>
      <H3>Các lần đăng ký</H3>
      <Table
        head={["Lớp", "Trạng thái", "Học phí", "Đã đóng"]}
        right={[2, 3]}
        rows={ens.map((e) => (
          <tr key={e.id}>
            <td>{by(db, "classes", e.classId).code}</td>
            <td>
              <Badge t={e.status} />
            </td>
            <td className="text-right">{vnd(e.fee)}</td>
            <td className="text-right">{vnd(R.paid(db, e.id))}</td>
          </tr>
        ))}
      />
      <H3>Sổ số dư</H3>
      <Table
        head={["Ngày", "Biến động", "Số dư sau", "Lý do"]}
        rows={db.balanceLedger
          .filter((x) => x.studentId === id)
          .map((x) => (
            <tr key={x.id}>
              <td>{dmy(x.date)}</td>
              <td>{vnd(x.amount)}</td>
              <td>{vnd(x.balanceAfter)}</td>
              <td>{x.note}</td>
            </tr>
          ))}
      />
      <H3>Bảo lưu</H3>
      <Table
        head={["Lớp", "Học phí giữ lại", "Hạn", "Trạng thái", ""]}
        rows={rvs.map((v) => {
          const st =
            v.status === "Đang bảo lưu" && v.expires < U.today()
              ? "Hết hạn"
              : v.status;
          return (
            <tr key={v.id}>
              <td>
                {
                  by(
                    db,
                    "classes",
                    by(db, "enrollments", v.enrollmentId).classId,
                  ).code
                }
              </td>
              <td>{vnd(v.credit)}</td>
              <td>{dmy(v.expires)}</td>
              <td>
                <Badge t={st} />
              </td>
              <td>
                {st === "Đang bảo lưu" && R.can(user, "enroll") && (
                  <Btn sm onClick={() => openModal(<ResumeForm rvId={v.id} />)}>
                    Học lại
                  </Btn>
                )}
              </td>
            </tr>
          );
        })}
      />
    </Form>
  );
}
