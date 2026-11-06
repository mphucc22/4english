import { Sel, Table } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { by, dmy } from "../lib/util.js";
import { Head, statuses } from "./shared.jsx";

export function Leads() {
  const { db, execute, act } = useStore();
  return (
    <>
      <Head title="Yêu cầu tư vấn" />
      <p className="mb-5 text-sm leading-6 text-slate-600">
        Tiếp nhận nhu cầu theo cơ sở, lớp học và khung giờ khách muốn được liên hệ.
        Gửi yêu cầu tư vấn chưa phải là xác nhận ghi danh hoặc giữ chỗ.
      </p>
      <Table
        head={[
          "Ngày / mã yêu cầu", "Họ tên", "Điện thoại", "Khóa quan tâm",
          "Cơ sở / lớp", "Giờ liên hệ", "Ghi chú", "Trạng thái",
        ]}
        rows={db.leads.slice().reverse().map((lead) => (
          <tr key={lead.id}>
            <td>
              {dmy(lead.createdAt)}
              <small className="mt-1 block text-slate-500">{lead.id}</small>
            </td>
            <td>{lead.name}</td>
            <td><a className="text-blue-700" href={"tel:" + lead.phone.replace(/[^+\d]/g, "")}>{lead.phone}</a></td>
            <td>{lead.course || by(db, "courses", lead.courseId).name}</td>
            <td>
              <span>{lead.branchName || by(db, "branches", lead.branchId).name || "Chưa chọn cơ sở"}</span>
              {lead.classCode && <small className="mt-1 block text-slate-500">{lead.classCode}</small>}
              {lead.classSchedule && <small className="mt-1 block text-slate-500">{lead.classSchedule}</small>}
            </td>
            <td>{lead.contactTimeLabel || "Thời gian thuận tiện"}</td>
            <td>{lead.note || "—"}</td>
            <td>
              <Sel
                aria-label={"Trạng thái tư vấn của " + lead.name}
                className="w-auto"
                value={lead.status}
                onChange={(event) => act(() => execute("setLeadStatus", lead.id, event.target.value))}
                options={statuses(["Mới", "Đã liên hệ", "Đã ghi danh"])}
              />
            </td>
          </tr>
        ))}
      />
    </>
  );
}
