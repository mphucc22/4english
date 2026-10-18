/** CRUD danh mục được kiểm tra trên service, không gán dữ liệu trực tiếp từ UI. */
export function installMasterRules(R, U, fail) {
  const required = (p, key, label = key) => {
    const v = String(p[key] ?? "").trim();
    if (!v) fail("Nhập " + label + ".");
    return v;
  };
  const integer = (p, key, min, max) => {
    const n = Number(p[key]);
    if (!Number.isSafeInteger(n) || n < min || n > max)
      fail(key + " phải là số nguyên từ " + min + " đến " + max + ".");
    return n;
  };
  R.saveMaster = (db, u, col, id, p) => {
    R.need(u, col === "students" ? "student" : "master");
    return R.atomic(db, () => {
      if (
        ![
          "students",
          "teachers",
          "branches",
          "rooms",
          "courses",
          "terms",
        ].includes(col)
      )
        fail("Danh mục không hợp lệ.");
      const old = id ? R.must(db, col, id) : null;
      let d = { name: required(p, "name", "tên") };
      if (col !== "rooms") {
        d.code = String(p.code || old?.code || "")
          .trim()
          .toUpperCase();
        if (["students", "teachers"].includes(col) && !d.code) {
          db.meta[col + "Seq"] =
            Math.max(
              db.meta[col + "Seq"] || 0,
              ...db[col].map((x) => Number(x.code.replace(/\D/g, "")) || 0),
            ) + 1;
          d.code =
            (col === "students" ? "HV" : "GV") +
            String(db.meta[col + "Seq"]).padStart(4, "0");
        }
        if (
          !/^[A-Z0-9_-]+$/.test(d.code) ||
          db[col].some((x) => x.id !== id && x.code === d.code)
        )
          fail("Mã không hợp lệ hoặc đã tồn tại.");
      }
      if (["students", "teachers", "branches"].includes(col))
        d.phone = String(p.phone || "").trim();
      if (["students", "teachers"].includes(col)) {
        d.email = String(p.email || "").trim();
        if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
          fail("Email không hợp lệ.");
        d.status = p.status || (col === "students" ? "Hoạt động" : "Đang dạy");
        if (
          !(
            col === "students" ? ["Hoạt động", "Ngừng"] : ["Đang dạy", "Nghỉ"]
          ).includes(d.status)
        )
          fail("Trạng thái không hợp lệ.");
      }
      if (col === "students") {
        d.dob = p.dob || "";
        if (d.dob && (!R.validDate(d.dob) || d.dob > U.today()))
          fail("Ngày sinh không hợp lệ.");
        d.level = String(p.level || "A1").trim();
      }
      if (col === "teachers") d.specialty = String(p.specialty || "").trim();
      if (col === "branches") d.address = required(p, "address", "địa chỉ");
      if (col === "rooms") {
        d.branchId = R.must(db, "branches", p.branchId, "chi nhánh").id;
        d.capacity = integer(p, "capacity", R.CFG.maxStudents, 200);
        if (
          db.rooms.some(
            (x) =>
              x.id !== id && x.branchId === d.branchId && x.name === d.name,
          )
        )
          fail("Tên phòng đã tồn tại tại chi nhánh.");
      }
      if (col === "courses") {
        d.level = integer(p, "level", 0, 10);
        d.fee = integer(p, "fee", 1, 100000000);
        d.sessions = integer(p, "sessions", 1, 366);
        d.desc = String(p.desc || "").trim();
      }
      if (col === "terms") {
        d.start = p.start;
        d.end = p.end;
        if (!R.validDate(d.start) || !R.validDate(d.end) || d.start > d.end)
          fail("Ngày bắt đầu/kết thúc đợt không hợp lệ.");
      }
      const refs = {
        rooms: "roomId",
        courses: "courseId",
        branches: "branchId",
        terms: "termId",
        teachers: "teacherId",
      };
      const protectedKeys = {
        rooms: ["branchId", "capacity"],
        courses: ["level", "sessions", "fee", "code"],
        branches: ["code"],
        terms: ["start", "end", "code"],
        teachers: ["status"],
      };
      if (
        old &&
        refs[col] &&
        (db.classes.some((c) => c[refs[col]] === id) ||
          db.sessions.some((x) => x[refs[col]] === id)) &&
        (protectedKeys[col] || []).some((k) => old[k] !== d[k])
      )
        fail(
          "Danh mục đang được lớp/lịch học sử dụng. Không thể đổi thông tin ảnh hưởng lịch hoặc học phí; hãy tạo bản ghi mới.",
        );
      if (old) Object.assign(old, d);
      else
        db[col].push({
          id: U.id(col.slice(0, 2)),
          ...(col === "students" ? { balance: 0 } : {}),
          ...d,
        });
      return "Đã lưu danh mục";
    });
  };
  R.deleteMaster = (db, u, col, id) => {
    R.need(u, col === "students" ? "student" : "master");
    return R.atomic(db, () => {
      if (
        ![
          "students",
          "teachers",
          "branches",
          "rooms",
          "courses",
          "terms",
        ].includes(col)
      )
        fail("Danh mục không hợp lệ.");
      R.must(db, col, id);
      const key = {
        students: "studentId",
        teachers: "teacherId",
        branches: "branchId",
        rooms: "roomId",
        courses: "courseId",
        terms: "termId",
      }[col];
      if (
        Object.entries(db).some(
          ([k, v]) =>
            k !== col && Array.isArray(v) && v.some((x) => x[key] === id),
        )
      )
        fail("Bản ghi đã được sử dụng, không thể xóa lịch sử.");
      db[col] = db[col].filter((x) => x.id !== id);
      return "Đã xóa danh mục";
    });
  };
  R.setLeadStatus = (db, u, id, status) => {
    R.need(u, "lead");
    const l = R.must(db, "leads", id, "tư vấn");
    if (!["Mới", "Đã liên hệ", "Đã ghi danh"].includes(status))
      fail("Trạng thái không hợp lệ.");
    l.status = status;
    return "Đã cập nhật tư vấn";
  };
  R.createLead = (db, p) => {
    const name = required(p, "name", "họ tên"),
      phone = required(p, "phone", "số điện thoại").replace(/[ .-]/g, "");
    if (!/^\+?\d{9,15}$/.test(phone)) fail("Số điện thoại cần có 9–15 chữ số.");
    const co = R.must(db, "courses", p.courseId, "khóa học");
    const x = {
      id: U.id("ld"),
      name,
      phone,
      course: co.name,
      note: String(p.note || "").trim(),
      status: "Mới",
      createdAt: U.today(),
    };
    db.leads.push(x);
    return "Đã gửi yêu cầu tư vấn. Trung tâm sẽ liên hệ với bạn.";
  };
}
