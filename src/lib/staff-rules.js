/** Dịch vụ Staff: được rules.js khởi tạo vào đối tượng R. */
export function installStaffRules(R, U, CFG, fail) {
  /* ---------- tài khoản nhân viên ---------- */
  R.ROLES = ["manager", "enroll", "accountant", "teacher"];
  R.ROLE_TITLE = {
    manager: "Quản lý đào tạo",
    enroll: "Nhân viên ghi danh",
    accountant: "Kế toán",
    teacher: "Giáo viên",
  };
  R.saveUser = (db, u, id, p) => {
    R.need(u, "master");
    return R.atomic(db, () => {
      const name = String(p.name || "").trim(),
        username = String(p.username || "")
          .trim()
          .toLowerCase(),
        pw = String(p.password || "");
      if (!name) fail("Nhập họ tên nhân viên.");
      if (!/^[a-z0-9._-]{3,}$/.test(username))
        fail(
          "Tên đăng nhập tối thiểu 3 ký tự, chỉ gồm chữ thường không dấu, số và . _ -",
        );
      if (!R.ROLES.includes(p.role)) fail("Vai trò không hợp lệ.");
      if (db.users.some((x) => x.id !== id && x.username === username))
        fail("Tên đăng nhập đã tồn tại.");
      if (p.role === "teacher" && !R.by(db, "teachers", p.teacherId))
        fail("Tài khoản giáo viên phải gắn với một giáo viên trong danh mục.");
      const old = id ? R.must(db, "users", id, "tài khoản") : null;
      if (pw.length > 256) fail("Mật khẩu tối đa 256 ký tự.");
      if (!old && pw.length < 6) fail("Mật khẩu tối thiểu 6 ký tự.");
      if (old && pw && pw.length < 6) fail("Mật khẩu mới tối thiểu 6 ký tự.");
      if (old && old.role === "manager" && p.role !== "manager") {
        if (old.id === u.id) fail("Không thể tự hạ quyền của chính mình.");
        if (db.users.filter((x) => x.role === "manager").length <= 1)
          fail("Hệ thống phải còn ít nhất một Quản lý đào tạo.");
      }
      const data = {
        name,
        username,
        role: p.role,
        title: R.ROLE_TITLE[p.role],
        teacherId: p.role === "teacher" ? p.teacherId : undefined,
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
    R.need(u, "master");
    return R.atomic(db, () => {
      const t = R.must(db, "users", id, "tài khoản");
      if (t.id === u.id) fail("Không thể xóa tài khoản đang đăng nhập.");
      if (
        t.role === "manager" &&
        db.users.filter((x) => x.role === "manager").length <= 1
      )
        fail("Hệ thống phải còn ít nhất một Quản lý đào tạo.");
      db.users = db.users.filter((x) => x.id !== id);
      return "Đã xóa tài khoản " + t.username;
    });
  };
}
