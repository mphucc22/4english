import { googleMapsEmbedUrl } from "./branch-public.js";

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
        const branchId = p.branchId || old?.branchId || "";
        if (branchId) R.must(db, "branches", branchId, "cơ sở quản lý học viên");
        if (u.role !== "manager" && !branchId)
          fail("Chọn cơ sở quản lý hồ sơ học viên.");
        d.branchId = branchId || null;
        d.dob = p.dob || "";
        if (d.dob && (!R.validDate(d.dob) || d.dob > U.today()))
          fail("Ngày sinh không hợp lệ.");
        d.level = String(p.level || "A1").trim();
      }
      if (col === "teachers") {
        d.specialty = String(p.specialty || "").trim();
        const requestedBranches = p.branchIds ?? old?.branchIds;
        if (!Array.isArray(requestedBranches) || !requestedBranches.length ||
          requestedBranches.some((branchId) => typeof branchId !== "string" || !R.by(db, "branches", branchId)))
          fail("Chọn ít nhất một cơ sở công tác hợp lệ cho giáo viên.");
        d.branchIds = [...new Set(requestedBranches)];
        if (old) {
          const future = db.sessions.filter((session) => {
            const klass = R.by(db, "classes", session.classId);
            return session.teacherId === old.id && !session.held && session.date >= U.today() &&
              klass && ["Nháp", "Mở đăng ký", "Đang học"].includes(klass.status);
          });
          if ((d.status === "Nghỉ" && future.length) ||
            future.some((session) => !d.branchIds.includes(R.by(db, "classes", session.classId).branchId)))
            fail("Giáo viên còn buổi dạy sắp tới tại cơ sở bị thay đổi. Hãy phân công lại các buổi đó trước khi cho nghỉ hoặc bỏ cơ sở.");
        }
      }
      if (col === "branches") {
        d.address = required(p, "address", "địa chỉ");
        const openingHours = p.openingHours ?? old?.openingHours ?? "";
        const mapEmbedUrl = p.mapEmbedUrl ?? old?.mapEmbedUrl ?? "";
        if (typeof openingHours !== "string" || openingHours.trim().length > 160)
          fail("Giờ hoạt động phải là văn bản không quá 160 ký tự.");
        if (typeof mapEmbedUrl !== "string" || mapEmbedUrl.length > 4096)
          fail("URL nhúng Google Maps không hợp lệ hoặc vượt quá 4096 ký tự.");
        d.openingHours = openingHours.trim();
        d.mapEmbedUrl = mapEmbedUrl.trim() ? googleMapsEmbedUrl(mapEmbedUrl) : "";
        if (mapEmbedUrl.trim() && !d.mapEmbedUrl)
          fail("Dán URL src từ Google Maps → Chia sẻ → Nhúng bản đồ, bắt đầu bằng https://www.google.com/maps/embed.");
      }
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
      if (old) {
        Object.assign(old, d);
        if (col === "teachers")
          for (const account of db.users.filter((user) => user.role === "teacher" && user.teacherId === old.id)) {
            account.name = old.name;
            account.branchIds = [...old.branchIds];
          }
      }
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
      if (col === "branches" && db.users.some((u) => u.branchIds?.includes(id)))
        fail("Cơ sở đang được phân công cho nhân viên, không thể xóa.");
      if (col === "branches" && db.teachers.some((teacher) => teacher.branchIds?.includes(id)))
        fail("Cơ sở đang được phân công cho giáo viên, không thể xóa.");
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
    for (const key of ["name", "phone", "courseId"])
      if (typeof p[key] !== "string") fail("Thông tin tư vấn không hợp lệ.");
    for (const key of ["branchId", "classId", "note", "contactTime"])
      if (p[key] !== undefined && typeof p[key] !== "string")
        fail("Thông tin tư vấn không hợp lệ.");
    const name = required(p, "name", "họ tên"),
      phone = required(p, "phone", "số điện thoại").replace(/[ .-]/g, "");
    if (name.length > 120) fail("Họ tên không được vượt quá 120 ký tự.");
    if (!/^\+?\d{9,15}$/.test(phone)) fail("Số điện thoại cần có 9–15 chữ số.");
    const note = (p.note || "").trim();
    if (note.length > 500) fail("Ghi chú không được vượt quá 500 ký tự.");
    const times = {
      any: "Thời gian thuận tiện",
      morning: "Buổi sáng",
      afternoon: "Buổi chiều",
      evening: "Buổi tối",
    };
    const contactTime = p.contactTime || "any";
    if (!Object.hasOwn(times, contactTime)) fail("Khung giờ tư vấn không hợp lệ.");
    const co = R.must(db, "courses", p.courseId, "khóa học");
    const klass = p.classId ? R.must(db, "classes", p.classId, "lớp tư vấn") : null;
    if (klass && (klass.status !== "Mở đăng ký" || klass.courseId !== co.id))
      fail("Lớp đã ngừng nhận đăng ký hoặc không thuộc khóa học đã chọn.");
    if (klass && p.branchId && klass.branchId !== p.branchId)
      fail("Lớp không thuộc cơ sở đã chọn.");
    const branch = p.branchId || klass?.branchId
      ? R.must(db, "branches", p.branchId || klass.branchId, "cơ sở tư vấn")
      : null;
    const x = {
      id: U.id("ld"),
      name,
      phone,
      course: co.name,
      courseId: co.id,
      branchId: branch?.id || null,
      branchName: branch?.name || "",
      classId: klass?.id || null,
      classCode: klass?.code || "",
      classSchedule: klass ? R.scheduleText(klass) : "",
      contactTime,
      contactTimeLabel: times[contactTime],
      note,
      status: "Mới",
      createdAt: U.today(),
    };
    db.leads.push(x);
    return "Đã gửi yêu cầu tư vấn. Trung tâm sẽ liên hệ với bạn.";
  };
}
