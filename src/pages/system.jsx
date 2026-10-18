import { useState } from "react";
import { useStore } from "../store.jsx";
import { Btn, Card, Fld, In, Form, Table, Note } from "../ui.jsx";
import { Head } from "./shared.jsx";
import { request } from "../lib/api.js";
const ACTION_LABEL = {
  createClass: "Tạo lớp",
  updateClass: "Sửa thông tin lớp",
  deleteClass: "Xóa lớp",
  setSchedule: "Xếp lịch",
  openRegistration: "Mở đăng ký",
  confirmOpen: "Xác nhận mở lớp",
  finishClass: "Kết thúc lớp",
  cancelClass: "Hủy lớp",
  enroll: "Ghi danh",
  addPayment: "Thu học phí",
  createRequest: "Tạo yêu cầu học tập",
  approve: "Duyệt yêu cầu",
  reject: "Từ chối yêu cầu",
  resume: "Học lại",
  markAttendance: "Điểm danh",
  saveUser: "Lưu tài khoản",
  deleteUser: "Xóa tài khoản",
  saveMaster: "Lưu danh mục",
  deleteMaster: "Xóa danh mục",
  setLeadStatus: "Cập nhật tư vấn",
  cancelEnrollment: "Hủy đăng ký",
  refundBalance: "Hoàn tiền",
  voidPayment: "Hủy phiếu thu",
  changeSession: "Điều chỉnh buổi",
  changePassword: "Đổi mật khẩu",
  restore: "Khôi phục dữ liệu",
  resetDemo: "Khôi phục demo",
  expirePending: "Hết hạn giữ chỗ",
};
export function PasswordForm() {
  const { special } = useStore();
  return (
    <Form
      title="Đổi mật khẩu"
      ok="Đổi mật khẩu"
      onSubmit={(fd) => {
        if (fd.get("password") !== fd.get("confirm"))
          throw Error("Hai lần nhập mật khẩu mới chưa khớp.");
        return special("change-password", {
          current: fd.get("current"),
          password: fd.get("password"),
        });
      }}
    >
      <Fld label="Mật khẩu hiện tại">
        <In
          required
          name="current"
          type="password"
          autoComplete="current-password"
        />
      </Fld>
      <Fld label="Mật khẩu mới (ít nhất 6 ký tự)">
        <In
          required
          name="password"
          type="password"
          minLength={6}
          maxLength={256}
          autoComplete="new-password"
        />
      </Fld>
      <Fld label="Nhập lại mật khẩu mới">
        <In
          required
          name="confirm"
          type="password"
          minLength={6}
          maxLength={256}
          autoComplete="new-password"
        />
      </Fld>
    </Form>
  );
}
function RestoreForm() {
  const { special } = useStore();
  const [backup, setBackup] = useState(null),
    [error, setError] = useState("");
  return (
    <Form
      title="Khôi phục dữ liệu nghiệp vụ"
      ok="Khôi phục"
      confirm="Bạn đã tải bản sao lưu của dữ liệu hiện tại? Toàn bộ dữ liệu nghiệp vụ sẽ bị thay thế."
      onSubmit={(fd) => {
        if (!backup) throw Error("Chọn file sao lưu JSON hợp lệ.");
        return special("restore", { backup, confirm: fd.get("confirm") });
      }}
    >
      <Note>
        Tài khoản và mật khẩu hiện tại được giữ nguyên. Tệp phải chứa đầy đủ các
        bảng và đúng liên kết. Nếu giáo viên liên kết tài khoản không còn trong
        tệp, hệ thống từ chối khôi phục.
      </Note>
      <Fld label="Tệp sao lưu ABC-English-v2">
        <In
          required
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            setBackup(null);
            setError("");
            try {
              const f = e.target.files[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) throw Error("Tệp vượt 2 MB.");
              const value = JSON.parse(await f.text());
              if (value.format !== "ABC-English-v2")
                throw Error("Sai định dạng sao lưu.");
              setBackup(value);
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      </Fld>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <Fld label="Nhập KHOI PHUC để xác nhận">
        <In required name="confirm" pattern="KHOI PHUC" />
      </Fld>
    </Form>
  );
}
export function System() {
  const { db, openModal, toast } = useStore();
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const rows = db.audit
    .slice()
    .reverse()
    .filter(
      (x) =>
        !q ||
        (x.by + " " + (ACTION_LABEL[x.action] || x.action) + " " + x.target)
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
  const last = Math.max(1, Math.ceil(rows.length / 30)),
    current = Math.min(page, last);
  const backup = async () => {
    try {
      const data = await request("backup");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "ABC-English-Backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Đã tạo tệp sao lưu.");
    } catch (e) {
      toast(e.message, "err");
    }
  };
  return (
    <>
      <Head title="Hệ thống & nhật ký" />
      <div className="mb-7 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Sao lưu dữ liệu</h2>
          <p className="my-3 text-sm leading-relaxed text-slate-500">
            Tải tệp JSON nghiệp vụ trước khi sửa dữ liệu lớn hoặc chuyển máy.
            Tệp có thông tin học viên; lưu ở nơi nhóm được phép truy cập.
          </p>
          <Btn onClick={backup}>Tải bản sao lưu</Btn>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Khôi phục từ tệp</h2>
          <p className="my-3 text-sm leading-relaxed text-slate-500">
            Kiểm tra toàn bộ tệp trong một giao dịch. Dữ liệu sai sẽ bị từ chối
            và dữ liệu hiện tại được giữ nguyên.
          </p>
          <Btn v="ghost" onClick={() => openModal(<RestoreForm />)}>
            Chọn tệp khôi phục
          </Btn>
        </Card>
      </div>
      <Head title="Nhật ký thao tác" />
      <In
        className="mb-4 max-w-md"
        placeholder="Tìm người thực hiện / thao tác / mã…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      <Table
        head={[
          "Thời điểm",
          "Người thực hiện",
          "Thao tác",
          "Mã đối tượng",
          "Ghi chú",
        ]}
        rows={rows.slice((current - 1) * 30, current * 30).map((x) => (
          <tr key={x.id}>
            <td>
              {new Date(x.at).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </td>
            <td>{x.by}</td>
            <td>{ACTION_LABEL[x.action] || x.action}</td>
            <td className="max-w-44 truncate" title={x.target}>
              {x.target || "—"}
            </td>
            <td>{x.note}</td>
          </tr>
        ))}
      />
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-slate-500">
          Trang {current}/{last} · {rows.length} thao tác
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
    </>
  );
}
