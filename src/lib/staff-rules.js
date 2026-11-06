import { sameBranchIds } from "./teacher-identity.js";

/** Dịch vụ Staff: được rules.js khởi tạo vào đối tượng R. */
export function installStaffRules(R, U, CFG, fail) {
  /* ---------- tài khoản nhân viên ---------- */
  R.ROLES = ["manager", "branch_manager", "enroll", "accountant", "teacher"];
  R.ROLE_TITLE = {
    manager: "Quản trị toàn hệ thống",
    branch_manager: "Quản lý cơ sở",
    enroll: "Nhân viên ghi danh",
    accountant: "Kế toán",
    teacher: "Giáo viên",
  };
  const manageable = (actor, target) =>
    actor.role === "manager" ||
    (actor.role === "branch_manager" &&
      target.id !== actor.id &&
      ["enroll", "accountant", "teacher"].includes(target.role) &&
      Array.isArray(target.branchIds) &&
      target.branchIds.length > 0 &&
      target.branchIds.every((id) => actor.branchIds?.includes(id)));
  R.saveUser = (db, u, id, p) => {
    R.need(u, "staff");
    return R.atomic(db, () => {
      const username = String(p.username || "")
          .trim()
          .toLowerCase(),
        pw = String(p.password || "");
      if (!/^[a-z0-9._-]{3,}$/.test(username))
        fail(
          "Tên đăng nhập tối thiểu 3 ký tự, chỉ gồm chữ thường không dấu, số và . _ -",
        );
      if (!R.ROLES.includes(p.role)) fail("Vai trò không hợp lệ.");
      if (db.users.some((x) => x.id !== id && x.username === username))
        fail("Tên đăng nhập đã tồn tại.");
      const teacher = p.role === "teacher" ? R.by(db, "teachers", p.teacherId) : null;
      if (p.role === "teacher" && !teacher)
        fail("Tài khoản giáo viên phải gắn với một giáo viên trong danh mục.");
      const name = teacher ? teacher.name : String(p.name || "").trim();
      if (!name) fail("Nhập họ tên nhân viên.");
      if (teacher && db.users.some((user) => user.id !== id &&
          user.role === "teacher" && user.teacherId === teacher.id))
        fail("Giáo viên này đã có tài khoản đăng nhập. Hãy sửa tài khoản đã liên kết.");
      const old = id ? R.must(db, "users", id, "tài khoản") : null;
      if (old && !manageable(u, old))
        fail("Bạn không được quản lý tài khoản ngoài phạm vi cơ sở được giao.");
      if (u.role !== "manager" && !["enroll", "accountant", "teacher"].includes(p.role))
        fail("Chỉ quản trị toàn hệ thống được cấp vai trò quản lý.");
      if (teacher && p.branchIds !== undefined && !sameBranchIds(p.branchIds, teacher.branchIds))
        fail("Cơ sở của tài khoản giáo viên phải khớp hồ sơ giáo viên. Hãy cập nhật tại Danh mục giáo viên.");
      const requestedBranches = teacher ? teacher.branchIds : p.branchIds ?? old?.branchIds ?? [];
      if (!Array.isArray(requestedBranches) || requestedBranches.some((id) => typeof id !== "string"))
        fail("Danh sách cơ sở của tài khoản không hợp lệ.");
      const branchIds = p.role === "manager" ? [] : [...new Set(requestedBranches)];
      if (p.role !== "manager" && !branchIds.length)
        fail("Chọn ít nhất một cơ sở cho tài khoản.");
      if (branchIds.some((branchId) => !R.by(db, "branches", branchId)))
        fail("Cơ sở được giao không tồn tại.");
      if (u.role !== "manager" && branchIds.some((branchId) => !u.branchIds?.includes(branchId)))
        fail("Bạn chỉ được giao các cơ sở thuộc phạm vi quản lý của mình.");
      if (p.disabled !== undefined && typeof p.disabled !== "boolean")
        fail("Trạng thái khóa tài khoản không hợp lệ.");
      const disabled = p.disabled ?? old?.disabled ?? false;
      if (old?.id === u.id && disabled)
        fail("Không thể tự khóa tài khoản đang đăng nhập.");
      if (pw.length > 256) fail("Mật khẩu tối đa 256 ký tự.");
      if (!old && pw.length < 6) fail("Mật khẩu tối thiểu 6 ký tự.");
      if (old && pw && pw.length < 6) fail("Mật khẩu mới tối thiểu 6 ký tự.");
      if (old && old.role === "manager" && (p.role !== "manager" || disabled)) {
        if (old.id === u.id && p.role !== "manager") fail("Không thể tự hạ quyền của chính mình.");
        if (!old.disabled && db.users.filter((x) => x.role === "manager" && !x.disabled).length <= 1)
          fail("Hệ thống phải còn ít nhất một Quản lý đào tạo.");
      }
      const data = {
        name,
        username,
        role: p.role,
        title: R.ROLE_TITLE[p.role],
        branchIds,
        teacherId: p.role === "teacher" ? p.teacherId : undefined,
        disabled,
        teacherLinkConflict: undefined,
      };
      if (old) {
        Object.assign(old, data);
        if (pw) old.password = pw;
        return "Đã cập nhật tài khoản";
      }
      db.users.push({ id: U.id("u"), password: pw, ...data });
      return "Đã thêm tài khoản";
    });
  };
  R.deleteUser = (db, u, id) => {
    R.need(u, "staff");
    return R.atomic(db, () => {
      const t = R.must(db, "users", id, "tài khoản");
      if (!manageable(u, t))
        fail("Bạn không được quản lý tài khoản ngoài phạm vi cơ sở được giao.");
      if (t.id === u.id) fail("Không thể xóa tài khoản đang đăng nhập.");
      if (
        t.role === "manager" && !t.disabled &&
        db.users.filter((x) => x.role === "manager" && !x.disabled).length <= 1
      )
        fail("Hệ thống phải còn ít nhất một Quản lý đào tạo.");
      db.users = db.users.filter((x) => x.id !== id);
      return "Đã xóa tài khoản " + t.username;
    });
  };
}
