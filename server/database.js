import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { scryptSync, randomBytes } from "node:crypto";
import { Seed } from "../src/lib/seed.js";
import { R } from "../src/lib/rules.js";
import { migrateBranchData } from "./branch-migration.js";
import { migrateTeacherData } from "./teacher-migration.js";
import { sameBranchIds, isLoginAllowed } from "../src/lib/teacher-identity.js";

export const TABLES = [
  "users",
  "branches",
  "rooms",
  "courses",
  "terms",
  "teachers",
  "students",
  "classes",
  "sessions",
  "enrollments",
  "payments",
  "attendance",
  "requests",
  "reservations",
  "leads",
  "balanceLedger",
  "refunds",
  "audit",
];
const refs = {
  rooms: { branchId: "branches" },
  classes: { courseId: "courses", branchId: "branches", termId: "terms" },
  sessions: { classId: "classes", roomId: "rooms", teacherId: "teachers" },
  enrollments: { studentId: "students", classId: "classes" },
  payments: { enrollmentId: "enrollments", studentId: "students" },
  attendance: {
    sessionId: "sessions",
    enrollmentId: "enrollments",
    studentId: "students",
  },
  reservations: { studentId: "students", enrollmentId: "enrollments" },
  balanceLedger: { studentId: "students" },
  refunds: { studentId: "students" },
};
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function validateDb(db, { allowTeacherResync = false } = {}) {
  if (
    !db ||
    typeof db !== "object" ||
    !db.meta ||
    !Number.isSafeInteger(db.meta.receiptSeq) ||
    db.meta.receiptSeq < 0 ||
    db.meta.version !== 2 ||
    !Number.isSafeInteger(db.meta.revision) ||
    db.meta.revision < 0
  )
    throw Error("Dữ liệu meta không hợp lệ.");
  for (const table of TABLES) {
    if (!Array.isArray(db[table])) throw Error("Thiếu hoặc sai bảng " + table);
    const ids = new Set();
    for (const row of db[table]) {
      if (
        !row ||
        typeof row !== "object" ||
        typeof row.id !== "string" ||
        !row.id ||
        ids.has(row.id)
      )
        throw Error("ID không hợp lệ/trùng tại " + table);
      ids.add(row.id);
      for (const [key, target] of Object.entries(refs[table] || {}))
        if (!db[target].some((x) => x.id === row[key]))
          throw Error("Tham chiếu không hợp lệ: " + table + "." + key);
    }
  }
  for (const col of [
    "users",
    "branches",
    "courses",
    "terms",
    "teachers",
    "students",
    "rooms",
  ])
    for (const x of db[col])
      if (typeof x.name !== "string" || !x.name.trim())
        throw Error("Tên trống tại " + col);
  for (const col of [
    "classes",
    "students",
    "teachers",
    "courses",
    "terms",
    "branches",
    "users",
  ]) {
    const key = col === "users" ? "username" : "code",
      values = db[col].map((x) => x[key]);
    if (
      values.some((v) => typeof v !== "string" || !v) ||
      new Set(values).size !== values.length
    )
      throw Error("Mã trùng/thiếu tại " + col);
  }
  if (!db.users.some((u) => u.role === "manager" && u.disabled !== true))
    throw Error("Cần ít nhất một quản lý.");
  for (const u of db.users)
    if (
      !["manager", "branch_manager", "enroll", "accountant", "teacher"].includes(u.role) ||
      (u.role === "teacher" && !db.teachers.some((t) => t.id === u.teacherId))
    )
      throw Error("Vai trò/liên kết giáo viên không hợp lệ.");
  for (const user of db.users)
    if (user.disabled !== undefined && typeof user.disabled !== "boolean")
      throw Error("Trạng thái khóa tài khoản không hợp lệ.");
  if (db.meta.teacherIdentityVersion !== undefined && db.meta.teacherIdentityVersion !== 1)
    throw Error("Phiên bản hồ sơ giáo viên không hợp lệ.");
  if (db.meta.teacherIdentityVersion === 1) {
    for (const teacher of db.teachers)
      if (!Array.isArray(teacher.branchIds) ||
        new Set(teacher.branchIds).size !== teacher.branchIds.length ||
        teacher.branchIds.some((id) => !db.branches.some((branch) => branch.id === id)))
        throw Error("Cơ sở công tác của giáo viên không hợp lệ.");
    for (const user of db.users) {
      if (typeof user.disabled !== "boolean") throw Error("Thiếu trạng thái tài khoản.");
      if (user.role !== "teacher") continue;
      const teacher = db.teachers.find((row) => row.id === user.teacherId);
      if (!allowTeacherResync && (user.name !== teacher.name || !sameBranchIds(user.branchIds, teacher.branchIds)))
        throw Error("Tài khoản giáo viên chưa khớp hồ sơ giáo viên.");
      const duplicates = db.users.filter((row) => row.role === "teacher" && row.teacherId === user.teacherId);
      if (duplicates.length > 1 && !duplicates.every((row) => row.disabled === true && row.teacherLinkConflict === true))
        throw Error("Một hồ sơ giáo viên chỉ được liên kết một tài khoản.");
      if (user.teacherLinkConflict === true && user.disabled !== true)
        throw Error("Tài khoản trùng liên kết phải được khóa để đối chiếu.");
    }
  }
  for (const room of db.rooms)
    if (
      !Number.isInteger(room.capacity) ||
      room.capacity < 20 ||
      room.capacity > 200
    )
      throw Error("Sức chứa phòng không hợp lệ.");
  for (const term of db.terms)
    if (
      !R.validDate(term.start) ||
      !R.validDate(term.end) ||
      term.start > term.end
    )
      throw Error("Ngày đợt đào tạo không hợp lệ.");
  for (const e of db.enrollments)
    if (
      ![
        "Chờ đóng phí",
        "Đã xác nhận",
        "Hoàn thành",
        "Bảo lưu",
        "Đã chuyển lớp",
        "Đã hủy",
        "Hết hạn",
      ].includes(e.status) ||
      !R.validDate(e.createdAt) ||
      (e.effectiveFrom && !R.validDate(e.effectiveFrom)) ||
      (e.effectiveTo && !R.validDate(e.effectiveTo))
    )
      throw Error("Trạng thái/ngày đăng ký không hợp lệ.");
  for (const rv of db.reservations)
    if (
      !Number.isSafeInteger(rv.credit) ||
      rv.credit < 0 ||
      !R.validDate(rv.expires)
    )
      throw Error("Phiếu bảo lưu không hợp lệ.");
  for (const rf of db.refunds)
    if (
      !Number.isSafeInteger(rf.amount) ||
      rf.amount <= 0 ||
      !R.validDate(rf.date)
    )
      throw Error("Phiếu hoàn tiền không hợp lệ.");
  for (const a of db.attendance)
    if (!["Có mặt", "Vắng"].includes(a.status))
      throw Error("Trạng thái điểm danh không hợp lệ.");
  for (const c of db.classes)
    if (
      !["Nháp", "Mở đăng ký", "Đang học", "Kết thúc", "Đã hủy"].includes(
        c.status,
      )
    )
      throw Error("Trạng thái lớp không hợp lệ.");
  for (const c of db.courses)
    if (
      !Number.isSafeInteger(c.fee) ||
      c.fee <= 0 ||
      !Number.isInteger(c.sessions) ||
      c.sessions < 1 ||
      c.sessions > 366
    )
      throw Error("Học phí/số buổi không hợp lệ.");
  for (const st of db.students)
    if (!Number.isSafeInteger(st.balance) || st.balance < 0)
      throw Error("Số dư không hợp lệ.");
  for (const e of db.enrollments)
    if (
      !Number.isSafeInteger(e.fee) ||
      e.fee <= 0 ||
      (e.billableFee !== undefined &&
        (!Number.isSafeInteger(e.billableFee) ||
          e.billableFee < 0 ||
          e.billableFee > e.fee))
    )
      throw Error("Học phí đăng ký không hợp lệ.");
  for (const p of db.payments)
    if (!Number.isSafeInteger(p.amount) || p.amount <= 0)
      throw Error("Phiếu thu không hợp lệ.");
  for (const s of db.sessions)
    if (
      !R.validDate(s.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end) ||
      s.start >= s.end
    )
      throw Error("Lịch học không hợp lệ.");
  for (const r of db.requests) {
    if (
      !["transfer", "reserve", "makeup"].includes(r.type) ||
      !db.enrollments.some((e) => e.id === r.data?.enrollmentId)
    )
      throw Error("Yêu cầu không hợp lệ.");
    if (
      r.type === "makeup" &&
      ![r.data.missedSessionId, r.data.targetSessionId].every((id) =>
        db.sessions.some((s) => s.id === id),
      )
    )
      throw Error("Buổi học bù không tồn tại.");
    if (
      r.type === "transfer" &&
      !db.classes.some((c) => c.id === r.data.toClassId)
    )
      throw Error("Lớp đích không tồn tại.");
  }
  if (db.meta.branchSchemaVersion !== undefined && db.meta.branchSchemaVersion !== 1)
    throw Error("Phiên bản dữ liệu cơ sở không hợp lệ.");
  if (db.meta.branchSchemaVersion === 1) {
    const branchIds = new Set(db.branches.map((b) => b.id));
    const validBranch = (id) => typeof id === "string" && branchIds.has(id);
    for (const user of db.users)
      if (!Array.isArray(user.branchIds) ||
        new Set(user.branchIds).size !== user.branchIds.length ||
        user.branchIds.some((id) => !validBranch(id)) ||
        (user.role === "manager" && user.branchIds.length))
        throw Error("Phân công cơ sở của tài khoản không hợp lệ.");
    for (const table of ["students", "leads", "balanceLedger", "refunds"])
      for (const row of db[table])
        if (row.branchId != null && !validBranch(row.branchId))
          throw Error("Cơ sở không hợp lệ tại " + table + ".");
    for (const table of ["enrollments", "payments", "reservations"])
      for (const row of db[table])
        if (!validBranch(row.branchId))
          throw Error("Thiếu hoặc sai cơ sở ghi nhận tại " + table + ".");
    for (const row of db.audit)
      if (row.branchIds !== undefined && (!Array.isArray(row.branchIds) ||
        row.branchIds.some((id) => !validBranch(id))))
        throw Error("Cơ sở của nhật ký không hợp lệ.");
  }
  return db;
}
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sql = new DatabaseSync(path);
  sql.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  sql.exec(
    "CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS auth_sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS operations(key TEXT PRIMARY KEY,user_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,created INTEGER NOT NULL);",
  );
  for (const table of TABLES) {
    const columns = Object.entries(refs[table] || {})
      .map(
        ([key, target]) =>
          `, ${key} TEXT NOT NULL REFERENCES ${target}(id) DEFERRABLE INITIALLY DEFERRED`,
      )
      .join("");
    sql.exec(
      `CREATE TABLE IF NOT EXISTS ${table}(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload))${table === "users" ? ",password_hash TEXT NOT NULL" : ""}${columns});`,
    );
  }
  sql.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS class_code ON classes(json_extract(payload,'$.code')); CREATE UNIQUE INDEX IF NOT EXISTS user_login ON users(json_extract(payload,'$.username')); CREATE UNIQUE INDEX IF NOT EXISTS attendance_pair ON attendance(sessionId,enrollmentId);",
  );
  const load = () => {
    const meta = sql
      .prepare("SELECT value FROM settings WHERE key='meta'")
      .get();
    if (!meta) return null;
    return {
      meta: JSON.parse(meta.value),
      ...Object.fromEntries(
        TABLES.map((t) => [
          t,
          sql
            .prepare(`SELECT payload FROM ${t} ORDER BY rowid`)
            .all()
            .map((x) => JSON.parse(x.payload)),
        ]),
      ),
    };
  };
  const save = (db, credentials = {}) => {
    validateDb(db);
    const hashes = Object.fromEntries(
      sql
        .prepare("SELECT id,password_hash FROM users")
        .all()
        .map((x) => [x.id, x.password_hash]),
    );
    for (const t of TABLES.slice().reverse()) sql.exec(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const keys = [
        "id",
        "payload",
        ...(t === "users" ? ["password_hash"] : []),
        ...Object.keys(refs[t] || {}),
      ];
      const stmt = sql.prepare(
        `INSERT INTO ${t}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`,
      );
      for (const row of db[t]) {
        const clean = { ...row };
        delete clean.password;
        delete clean.passwordHash;
        const hash =
          t === "users"
            ? credentials[row.id] ||
              (row.password ? hashPassword(row.password) : hashes[row.id])
            : null;
        if (t === "users" && !hash) throw Error("Tài khoản thiếu mật khẩu.");
        stmt.run(
          row.id,
          JSON.stringify(clean),
          ...(t === "users" ? [hash] : []),
          ...Object.keys(refs[t] || {}).map((k) => row[k]),
        );
      }
    }
    sql
      .prepare(
        "INSERT INTO settings(key,value) VALUES('meta',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(JSON.stringify(db.meta));
  };
  const transact = (fn) => {
    sql.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      sql.exec("COMMIT");
      return out;
    } catch (e) {
      sql.exec("ROLLBACK");
      throw e;
    }
  };
  if (!load()) transact(() => save(Seed.build()));
  // Kiểm tra dữ liệu hiện có, không tự reset khi phát hiện lỗi.
  const existing = load();
  validateDb(existing);
  if (!existing.meta.branchSchemaVersion || !existing.meta.teacherIdentityVersion) {
    // One local recovery copy before the first persistent schema upgrade.
    const backupPath = path + (existing.meta.branchSchemaVersion ? ".before-teachers.sqlite" : ".before-branches.sqlite");
    if (path !== ":memory:" && !existsSync(backupPath))
      sql.prepare("VACUUM INTO ?").run(backupPath);
    transact(() => {
      const db = load();
      const upgradedBranches = migrateBranchData(db);
      const upgradedTeachers = migrateTeacherData(db);
      if (upgradedBranches || upgradedTeachers) {
        db.meta.revision++;
        save(db);
        for (const user of db.users)
          if (!isLoginAllowed(db, user))
            sql.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
      }
    });
  }
  validateDb(load());
  return { sql, load, save, transact, close: () => sql.close() };
}
