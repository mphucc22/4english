import { useState } from "react";
import { Btn, Badge, Table, Form, Fld, In, Sel, Row2, useAsk } from "../ui.jsx";
import { useStore } from "../store.jsx";
import { R, U, CFG, fail } from "../lib/rules.js";
import { by, vnd, dmy, ROLE } from "../lib/util.js";
import { ProfileView } from "../forms.jsx";
import { Head } from "./shared.jsx";
import { isLoginAllowed } from "../lib/teacher-identity.js";
import { canManageTeacher, isGlobal } from "../lib/branch-access.js";
const accountCanLogin = (db, user) => user.loginAllowed ?? isLoginAllowed(db, user);

const lv = ["A1", "A2", "B1", "B2", "C1"].map((x) => [x, x]);
const stOpt = (a, b) => () => [
  [a, a],
  [b, b],
];

/* Cấu hình CRUD chung: cols = cột hiển thị, fields = ô nhập */
export const MASTER = {
  students: {
    title: "Học viên",
    perm: "student",
    pre: "hv",
    init: { balance: 0, status: "Hoạt động", level: "A1" },
    cols: [
      ["code", "Mã"],
      ["name", "Họ tên"],
      ["branchId", "Cơ sở quản lý", (r, db) => by(db, "branches", r.branchId).name || (r.branchId ? "Cơ sở khác" : "Chưa gán")],
      ["dob", "Ngày sinh", (r) => dmy(r.dob)],
      ["phone", "Điện thoại"],
      ["level", "Trình độ"],
      ["balance", "Số dư", (r) => vnd(r.balance)],
      ["status", "Trạng thái", (r) => <Badge t={r.status} />],
    ],
    fields: [
      { k: "code", l: "Mã học viên (để trống = tự sinh)", req: false },
      { k: "name", l: "Họ và tên" },
      { k: "branchId", l: "Cơ sở quản lý hồ sơ", req: false,
        o: (db) => [["", "— Chọn cơ sở —"], ...db.branches.map((b) => [b.id, b.name])] },
      { k: "dob", l: "Ngày sinh", t: "date" },
      { k: "phone", l: "Điện thoại", t: "tel" },
      { k: "email", l: "Email", t: "email", req: false },
      { k: "level", l: "Trình độ hiện tại", o: () => lv },
      { k: "status", l: "Trạng thái", o: stOpt("Hoạt động", "Ngừng") },
    ],
  },
  teachers: {
    title: "Giáo viên",
    perm: "master",
    pre: "gv",
    init: { status: "Đang dạy" },
    cols: [
      ["code", "Mã"],
      ["name", "Họ tên"],
      ["phone", "Điện thoại"],
      ["email", "Email"],
      ["specialty", "Chuyên môn"],
      ["branchIds", "Cơ sở giảng dạy", (r, db) => r.branchIds?.length
        ? r.branchIds.map((id) => by(db, "branches", id).name || "Cơ sở khác").join(", ")
        : "Chưa phân công"],
      ["account", "Tài khoản đăng nhập", (r, db) => {
        const linked = db.users.find((u) => u.role === "teacher" && u.teacherId === r.id);
        return linked ? <span>{linked.username}<small className="block text-slate-500">{accountCanLogin(db, linked) ? "Đang hoạt động" : "Đã khóa"}</small></span>
          : r.accountLinked ? "Đã liên kết tài khoản" : "Chưa cấp tài khoản";
      }],
      ["status", "Trạng thái", (r) => <Badge t={r.status} />],
    ],
    fields: [
      { k: "code", l: "Mã (để trống = tự sinh)", req: false },
      { k: "name", l: "Họ và tên" },
      { k: "phone", l: "Điện thoại" },
      { k: "email", l: "Email", t: "email" },
      { k: "specialty", l: "Chuyên môn" },
      { k: "status", l: "Trạng thái", o: stOpt("Đang dạy", "Nghỉ") },
    ],
  },
  branches: {
    title: "Chi nhánh",
    perm: "master",
    pre: "br",
    cols: [
      ["code", "Mã"],
      ["name", "Tên"],
      ["address", "Địa chỉ"],
      ["phone", "Điện thoại"],
      ["openingHours", "Giờ hoạt động", (r) => r.openingHours || "Chưa cập nhật"],
    ],
    fields: [
      { k: "code", l: "Mã viết tắt (2 chữ cái)" },
      { k: "name", l: "Tên chi nhánh" },
      { k: "address", l: "Địa chỉ" },
      { k: "phone", l: "Điện thoại" },
      { k: "openingHours", l: "Giờ hoạt động (không bắt buộc)", req: false, maxLength: 160 },
      { k: "mapEmbedUrl", l: "URL nhúng Google Maps (không bắt buộc)", t: "url", req: false, maxLength: 4096,
        placeholder: "https://www.google.com/maps/embed?pb=..." },
    ],
  },
  rooms: {
    title: "Phòng học",
    perm: "master",
    pre: "rm",
    cols: [
      ["name", "Phòng"],
      ["branchId", "Chi nhánh", (r, db) => by(db, "branches", r.branchId).name],
      ["capacity", "Sức chứa"],
    ],
    fields: [
      {
        k: "branchId",
        l: "Chi nhánh",
        o: (db) => db.branches.map((b) => [b.id, b.name]),
      },
      { k: "name", l: "Tên phòng" },
      { k: "capacity", l: "Sức chứa", t: "number", min: CFG.maxStudents },
    ],
  },
  courses: {
    title: "Khóa học",
    perm: "master",
    pre: "co",
    cols: [
      ["code", "Mã"],
      ["name", "Tên khóa"],
      ["level", "Cấp độ"],
      ["fee", "Học phí", (r) => vnd(r.fee)],
      ["sessions", "Số buổi"],
    ],
    fields: [
      { k: "code", l: "Mã khóa" },
      { k: "name", l: "Tên khóa học" },
      {
        k: "level",
        l: "Cấp độ (chỉ chuyển lớp giữa các khóa cùng cấp độ)",
        t: "number",
      },
      { k: "fee", l: "Học phí (₫)", t: "number" },
      { k: "sessions", l: "Số buổi", t: "number" },
      { k: "desc", l: "Mô tả", req: false },
    ],
  },
  terms: {
    title: "Đợt đào tạo (3 tháng)",
    perm: "master",
    pre: "tm",
    cols: [
      ["code", "Mã"],
      ["name", "Tên đợt"],
      ["start", "Bắt đầu", (r) => dmy(r.start)],
      ["end", "Kết thúc", (r) => dmy(r.end)],
    ],
    fields: [
      { k: "code", l: "Mã đợt (vd Q1-27)" },
      { k: "name", l: "Tên đợt" },
      { k: "start", l: "Bắt đầu", t: "date" },
      { k: "end", l: "Kết thúc", t: "date" },
    ],
  },
};

export function EditForm({ col, id }) {
  const { db, user, execute, branchId, branches } = useStore();
  const M = MASTER[col],
    r = id ? by(db, col, id) : {
      ...(M.init || {}),
      branchId: branchId || (db.branches.length === 1 ? db.branches[0].id : ""),
    };
  const [assigned, setAssigned] = useState(r.branchIds || (branchId ? [branchId] : []));
  const teacherBranches = user.role === "branch_manager" && branchId
    ? branches.filter((branch) => branch.id === branchId)
    : branches;
  return (
    <Form
      title={`${id ? "Sửa" : "Thêm"} – ${M.title}`}
      confirm={id ? "Bạn có chắc chắn muốn lưu thay đổi này?" : null}
      onSubmit={(fd) => {
        return execute("saveMaster", col, id || null, {
          ...Object.fromEntries(fd),
          ...(col === "teachers" ? { branchIds: fd.getAll("branchIds") } : {}),
        });
      }}
    >
      <Row2>
        {M.fields.map((f) => (
          <Fld key={f.k} label={f.l}>
            {f.o ? (
              <Sel
                name={f.k}
                required={f.req !== false || (col === "students" && f.k === "branchId" && user.role !== "manager")}
                defaultValue={r[f.k]}
                options={f.o(db)}
              />
            ) : (
              <In
                name={f.k}
                type={f.t || "text"}
                required={f.req !== false}
                defaultValue={r[f.k] ?? ""}
                min={f.min}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
              />
            )}
          </Fld>
        ))}
      </Row2>
      {col === "branches" && <p className="mt-3 text-sm leading-6 text-slate-600">
        Tìm đúng địa điểm trên Google Maps → Chia sẻ → Nhúng bản đồ. Chỉ dán URL trong thuộc tính src,
        không dán cả thẻ iframe. Để trống URL để bản đồ tra cứu theo địa chỉ đã nhập.
        Giờ hoạt động và vị trí này được hiển thị trên trang cơ sở công khai.
      </p>}
      {col === "teachers" && (
        <fieldset className="my-4 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 font-semibold">Cơ sở giảng dạy</legend>
          <p className="mb-3 text-sm text-slate-500">Phân công cơ sở tại hồ sơ này. Tài khoản giáo viên liên kết sẽ dùng cùng tên và các cơ sở này.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {teacherBranches.map((branch) => (
              <label key={branch.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="branchIds" value={branch.id}
                  checked={assigned.includes(branch.id)}
                  onChange={(event) => setAssigned((ids) => event.target.checked ? [...ids, branch.id] : ids.filter((value) => value !== branch.id))} />
                {branch.name}
              </label>
            ))}
          </div>
          {!assigned.length && <p className="mt-2 text-sm text-amber-800">Chọn ít nhất một cơ sở trước khi lưu hồ sơ.</p>}
          <p className="mt-3 text-sm text-slate-500">Khi giáo viên nghỉ, tài khoản liên kết không thể đăng nhập. Cần xử lý lịch dạy sắp tới trước khi đổi trạng thái hoặc bỏ cơ sở đang có lịch.</p>
        </fieldset>
      )}
    </Form>
  );
}

export function Crud({ col, rows }) {
  const { db, user, execute, openModal, act, branchId, branches } = useStore();
  const displayDb = col === "teachers" ? { ...db, branches } : db;
  const M = MASTER[col],
    can = R.can(user, M.perm) && (user.role !== "branch_manager" || ["students", "rooms", "teachers"].includes(col)),
    ask = useAsk();
  const canEditRow = (row) => {
    if (!can) return false;
    if (col === "teachers")
      return (isGlobal(user) || row.profileManageable !== false) &&
        canManageTeacher(db, { ...user, activeBranchId: branchId }, row);
    return col !== "students" || (isGlobal(user) && !branchId) ||
      db.branches.some((branch) => branch.id === row.branchId);
  };
  const del = (id) => {
    const used = Object.keys(db).some(
      (k) =>
        k !== col &&
        Array.isArray(db[k]) &&
        db[k].some((x) =>
          Object.entries(x).some(([key, v]) => key.endsWith("Id") && v === id),
        ),
    );
    if (used)
      return act(() =>
        fail(
          col === "students"
            ? 'Học viên đã có dữ liệu đăng ký – hãy đặt trạng thái "Ngừng" thay vì xóa.'
            : "Mục này đang được sử dụng nên không thể xóa.",
        ),
      );
    const r = by(db, col, id);
    ask({
      title: "Bạn có chắc chắn muốn xóa?",
      message: `“${r.name || r.code}” sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
      ok: "Xóa",
      danger: true,
      onConfirm: () =>
        act(() => {
          return execute("deleteMaster", col, id);
        }, "Đã xóa"),
    });
  };
  return (
    <Table
      head={[...M.cols.map((c) => c[1]), ""]}
      rows={(rows || db[col]).map((r) => (
        <tr key={r.id}>
          {M.cols.map(([k, , f]) => (
            <td key={k}>{f ? f(r, displayDb) : r[k]}</td>
          ))}
          <td>
            <div className="flex gap-1.5">
              {col === "students" && (
                <Btn
                  v="ghost"
                  sm
                  onClick={() => openModal(<ProfileView id={r.id} />)}
                >
                  Hồ sơ
                </Btn>
              )}
              {canEditRow(r) && (
                <>
                  <Btn
                    v="ghost"
                    sm
                    onClick={() => openModal(<EditForm col={col} id={r.id} />)}
                  >
                    Sửa
                  </Btn>
                  <Btn v="ghost" sm onClick={() => del(r.id)}>
                    Xóa
                  </Btn>
                </>
              )}
              {can && col === "teachers" && !canEditRow(r) && (
                <small className="max-w-48 text-slate-500">Cần quyền trên toàn bộ cơ sở của giáo viên để chỉnh sửa.</small>
              )}
            </div>
          </td>
        </tr>
      ))}
    />
  );
}

export function Students() {
  const { db, openModal } = useStore();
  const [q, setQ] = useState("");
  const rows = db.students.filter(
    (s) =>
      !q || (s.name + s.code + s.phone).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Head title="Học viên">
        <Btn onClick={() => openModal(<EditForm col="students" />)}>
          + Thêm học viên
        </Btn>
      </Head>
      <div className="mb-3.5">
        <In
          className="max-w-sm"
          placeholder="Tìm theo tên, mã, điện thoại…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Crud col="students" rows={rows} />
    </>
  );
}

export function Master() {
  const { user, openModal } = useStore();
  const keys = ["teachers", "branches", "rooms", "courses", "terms"],
    [t, setT] = useState("teachers");
  return (
    <>
      <Head title="Danh mục" />
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-slate-200">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => setT(k)}
            className={`-mb-px cursor-pointer border-b-[3px] px-4 py-2.5 font-semibold ${k === t ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500"}`}
          >
            {MASTER[k].title}
          </button>
        ))}
        {R.can(user, "master") && (user.role !== "branch_manager" || ["rooms", "teachers"].includes(t)) && (
          <Btn
            className="mb-1.5 ml-auto"
            onClick={() => openModal(<EditForm col={t} />)}
          >
            + Thêm
          </Btn>
        )}
      </div>
      {user.role === "branch_manager" && !["rooms", "teachers"].includes(t) && (
        <p className="mb-4 text-sm text-slate-500">Danh mục dùng chung do quản trị toàn hệ thống cập nhật. Bạn có thể quản lý phòng học và giáo viên tại các cơ sở được giao.</p>
      )}
      {t === "teachers" && <p className="mb-4 text-sm text-slate-500">Đây là hồ sơ giáo viên dùng chung: tên, liên hệ, chuyên môn và cơ sở giảng dạy. Cấp tên đăng nhập và mật khẩu tại mục Nhân viên; mỗi hồ sơ có tối đa một tài khoản giáo viên.</p>}
      {user.role === "branch_manager" && t === "teachers" && (
        <p className="mb-4 text-sm text-slate-500">Bạn được tạo và sửa giáo viên khi toàn bộ cơ sở công tác nằm trong phạm vi đang quản lý. Với giáo viên phụ trách nhiều cơ sở được giao, chọn “Các cơ sở được giao” trên thanh phía trên trước khi sửa; hồ sơ có cơ sở ngoài quyền của bạn cần quản trị toàn hệ thống xử lý.</p>
      )}
      <Crud col={t} />
    </>
  );
}

/* ---------- Nhân viên (tài khoản đăng nhập) ---------- */
function StaffForm({ id }) {
  const { db, user, execute, branches, branchId } = useStore();
  const r = id ? by(db, "users", id) : { role: "enroll" };
  const [role, setRole] = useState(r.role);
  const [teacherId, setTeacherId] = useState(r.teacherId || "");
  const [name, setName] = useState(r.name || "");
  const [assigned, setAssigned] = useState(r.branchIds || (branchId ? [branchId] : []));
  const teacher = db.teachers.find((profile) => profile.id === teacherId);
  const teacherOptions = db.teachers.filter((profile) => {
    if (r.role === "teacher" && profile.id === r.teacherId) return true;
    if (profile.accountManageable === false) return false;
    const linked = db.users.some((account) => account.id !== id && account.role === "teacher" && account.teacherId === profile.id);
    return !linked && !profile.accountLinked;
  });
  return (
    <Form
      title={id ? "Sửa tài khoản nhân viên" : "Thêm nhân viên"}
      confirm={id ? "Bạn có chắc chắn muốn lưu thay đổi này?" : null}
      onSubmit={(fd) => execute("saveUser", id || null, {
        ...Object.fromEntries(fd),
        name: role === "teacher" ? teacher?.name || "" : fd.get("name"),
        branchIds: role === "manager" ? [] : role === "teacher" ? teacher?.branchIds || [] : fd.getAll("branchIds"),
        disabled: fd.get("disabled") === "on",
      })}
    >
      <Row2>
        <Fld label="Họ và tên">
          <In required name="name" value={role === "teacher" ? teacher?.name || "" : name}
            readOnly={role === "teacher"} onChange={(event) => setName(event.target.value)}
            placeholder={role === "teacher" ? "Chọn hồ sơ giáo viên bên dưới" : "Họ và tên"} />
        </Fld>
        <Fld label="Tên đăng nhập">
          <In
            required
            name="username"
            defaultValue={r.username || ""}
            placeholder="vd: nguyenvana"
          />
        </Fld>
        <Fld label="Vai trò">
          <Sel
            required
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={Object.entries(ROLE).filter(([value]) => user.role === "manager" || ["enroll", "accountant", "teacher"].includes(value))}
          />
        </Fld>
        <Fld
          label={
            id
              ? "Mật khẩu mới (để trống = giữ nguyên)"
              : "Mật khẩu (tối thiểu 6 ký tự)"
          }
        >
          <In
            required={!id}
            name="password"
            type="password"
            minLength={6}
            maxLength={256}
            autoComplete="off"
          />
        </Fld>
      </Row2>
      {role !== "manager" && role !== "teacher" && (
        <fieldset className="my-4 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 font-semibold">Cơ sở được giao</legend>
          <p className="mb-3 text-sm text-slate-500">Chọn ít nhất một cơ sở. Tài khoản chỉ được truy cập nghiệp vụ tại các cơ sở này.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {branches.map((branch) => (
              <label key={branch.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="branchIds"
                  value={branch.id}
                  checked={assigned.includes(branch.id)}
                  onChange={(event) => setAssigned((ids) => event.target.checked ? [...ids, branch.id] : ids.filter((value) => value !== branch.id))}
                />
                {branch.name}
              </label>
            ))}
          </div>
          {!assigned.length && <p className="mt-2 text-sm text-amber-800">Chưa chọn cơ sở cho tài khoản.</p>}
        </fieldset>
      )}
      {role === "manager" && <p className="my-3 rounded-lg bg-blue-50 p-3 text-sm">Quản trị toàn hệ thống truy cập tất cả cơ sở và quản lý cấu hình chung.</p>}
      {role === "teacher" && (
        <Fld label="Hồ sơ giáo viên liên kết">
          <Sel
            required
            name="teacherId"
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            ph="— Chọn giáo viên —"
            options={teacherOptions.map((t) => [t.id, `${t.name} (${t.code})`])}
          />
        </Fld>
      )}
      {role === "teacher" && (
        <div className="my-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <p className="font-semibold">Cơ sở theo hồ sơ giáo viên</p>
          <p className="mt-1">{teacher?.branchIds?.length
            ? teacher.branchIds.map((id) => branches.find((branch) => branch.id === id)?.name || "Cơ sở khác").join(", ")
            : "Hồ sơ chưa được phân công cơ sở giảng dạy."}</p>
          <p className="mt-2 text-slate-600">Tên và cơ sở được đồng bộ từ Danh mục → Giáo viên. Chỉ các hồ sơ chưa có tài khoản và nằm trong phạm vi quản lý mới được chọn.</p>
          {teacher?.status === "Nghỉ" && <p className="mt-2 text-amber-800">Giáo viên đang nghỉ nên tài khoản không thể đăng nhập.</p>}
          {!teacherOptions.length && <p className="mt-2 text-amber-800">Chưa có hồ sơ phù hợp để cấp tài khoản. Quản trị toàn hệ thống cần thêm hoặc phân công hồ sơ giáo viên trước.</p>}
        </div>
      )}
      <label className="my-4 flex items-center gap-2 text-sm">
        <input type="checkbox" name="disabled" defaultChecked={r.disabled === true} disabled={r.id === user.id} />
        Khóa đăng nhập tài khoản
      </label>
      {r.teacherLinkConflict && <p className="mb-3 text-sm text-amber-800">Hồ sơ này đang liên kết nhiều tài khoản cũ. Quản trị cần xóa hoặc chuyển liên kết trùng trước khi mở khóa tài khoản.</p>}
      <p className="text-slate-500">
        Quản lý cơ sở phụ trách nghiệp vụ và nhân viên trong phạm vi được giao.
        Ghi danh quản lý học viên, đăng ký và tư vấn; kế toán quản lý học phí;
        giáo viên chỉ xem lịch dạy và điểm danh được phân công.
      </p>
    </Form>
  );
}

export function Staff() {
  const { db, user, execute, act, openModal, branches } = useStore(),
    ask = useAsk();
  const manageable = (target) => user.role === "manager" || (
    target.id !== user.id && ["enroll", "accountant", "teacher"].includes(target.role) &&
    target.branchIds?.length > 0 && target.branchIds.every((id) => user.branchIds?.includes(id))
  );
  return (
    <>
      <Head title="Nhân viên">
        <Btn onClick={() => openModal(<StaffForm />)}>+ Thêm nhân viên</Btn>
      </Head>
      <p className="mb-4 text-sm text-slate-500">Mục này quản lý tài khoản và quyền đăng nhập. Với giáo viên, chọn hồ sơ đã tạo trong Danh mục → Giáo viên để lấy đúng tên và cơ sở giảng dạy.</p>
      <Table
        head={["Họ tên", "Tên đăng nhập", "Vai trò", "Cơ sở được giao", "Giáo viên liên kết", "Đăng nhập", ""]}
        rows={db.users.map((u) => (
          <tr key={u.id}>
            <td className="font-semibold">
              {u.name}
              {u.id === user.id && (
                <span className="ml-2">
                  <Badge t="Bạn" c="blue" />
                </span>
              )}
            </td>
            <td>{u.username}</td>
            <td>
              <Badge
                t={ROLE[u.role]}
                c={
                  u.role === "manager"
                    ? "purple"
                    : u.role === "teacher"
                      ? "teal"
                      : "blue"
                }
              />
            </td>
            <td>{u.role === "manager" ? "Tất cả cơ sở" : u.branchIds?.length ? u.branchIds.map((id) => branches.find((branch) => branch.id === id)?.name || id).join(", ") : "Chưa được giao cơ sở"}</td>
            <td>{u.teacherId ? by(db, "teachers", u.teacherId).name : "—"}</td>
            <td><Badge t={accountCanLogin(db, u) ? "Hoạt động" : "Đã khóa"} c={accountCanLogin(db, u) ? "green" : "red"} /></td>
            <td>
              {manageable(u) && <div className="flex gap-1.5">
                <Btn
                  v="ghost"
                  sm
                  onClick={() => openModal(<StaffForm id={u.id} />)}
                >
                  Sửa
                </Btn>
                <Btn
                  v="ghost"
                  sm
                  onClick={() =>
                    ask({
                      title: "Bạn có chắc chắn muốn xóa tài khoản?",
                      message: `Tài khoản “${u.username}” (${u.name}) sẽ bị xóa và không thể đăng nhập nữa.`,
                      ok: "Xóa",
                      danger: true,
                      onConfirm: () => act(() => execute("deleteUser", u.id)),
                    })
                  }
                >
                  Xóa
                </Btn>
              </div>}
            </td>
          </tr>
        ))}
      />
    </>
  );
}
