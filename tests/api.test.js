import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database.js";
const dir = mkdtempSync(join(tmpdir(), "abc-api-"));
const app = createApp({ dbPath: join(dir, "data.sqlite") });
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${app.server.address().port}/api/`;
after(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});
async function call(path, body, session, extra = {}) {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(session
        ? { cookie: session.cookie, "x-csrf-token": session.csrf }
        : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(username = "quanly") {
  const r = await call("login", { username, password: "123456" });
  assert.equal(r.status, 200);
  return { ...r.data, cookie: r.cookie };
}
const command = (s, action, args, extra = {}) =>
  call(
    "command",
    {
      action,
      args,
      revision: s.db.meta.revision,
      requestId: crypto.randomUUID(),
      ...extra,
    },
    s,
  );
test("API01: public không nhận dữ liệu học viên/tài khoản/phiếu thu", async () => {
  const r = await call("state");
  assert.equal(r.status, 200);
  for (const key of ["students", "users", "payments", "leads", "audit"])
    assert.equal(r.data.db[key].length, 0);
  assert.equal(r.data.user, null);
});
test("API02: đăng nhập thật, cookie HttpOnly; không trả mật khẩu/hash", async () => {
  const res = await fetch(base + "login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "quanly", password: "123456" }),
  });
  assert.match(res.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert(!JSON.stringify(await res.json()).includes("123456"));
  assert(
    app.database.sql
      .prepare("SELECT password_hash FROM users LIMIT 1")
      .get()
      .password_hash.includes(":"),
  );
  assert.equal(
    (await call("login", { username: "quanly", password: "wrong" })).status,
    401,
  );
});
test("API03: không thể giả vai trò hoặc bỏ CSRF để thu tiền", async () => {
  const teacher = await login("gv1");
  const r = await command(teacher, "addPayment", [
    teacher.db.enrollments[0].id,
    { amount: 1, method: "Tiền mặt" },
  ]);
  assert.equal(r.status, 422);
  const manager = await login();
  assert.equal((await command(manager, "finishClass", ["x"], {})).status, 422);
  assert.equal(
    (
      await call(
        "command",
        {
          action: "createClass",
          args: [],
          revision: manager.db.meta.revision,
          requestId: crypto.randomUUID(),
        },
        manager,
        { "x-csrf-token": "" },
      )
    ).status,
    403,
  );
  assert.equal((await call("command", {}, null)).status, 401);
});
test("API04: giáo viên chỉ xem buổi mình dạy, ẩn số dư/thu phí", async () => {
  const s = await login("gv1");
  assert(s.db.sessions.length > 0);
  assert(s.db.sessions.every((x) => x.teacherId === "gv1"));
  assert.equal(s.db.payments.length, 0);
  assert(s.db.students.every((x) => x.balance === 0 && x.phone === undefined));
});
test("API05: hai phiên đọc cùng dữ liệu, stale revision bị từ chối không ghi đè", async () => {
  const a = await login(),
    b = await login();
  const args = [
    "students",
    null,
    {
      name: "API Shared",
      phone: "0901111222",
      status: "Hoạt động",
      level: "A1",
    },
  ];
  assert.equal((await command(a, "saveMaster", args)).status, 200);
  const stale = await command(b, "saveMaster", [
    "students",
    null,
    { name: "Lost Update" },
  ]);
  assert.equal(stale.status, 409);
  const state = (await call("state", null, b)).data;
  assert(state.db.students.some((x) => x.name === "API Shared"));
  assert(!state.db.students.some((x) => x.name === "Lost Update"));
});
test("API06: retry cùng requestId lập phiếu đúng một lần; đổi nội dung bị chặn", async () => {
  const s = await login(),
    e = s.db.enrollments.find((x) => x.status === "Chờ đóng phí"),
    requestId = crypto.randomUUID(),
    body = {
      action: "addPayment",
      args: [e.id, { amount: 100000, method: "Tiền mặt" }],
      revision: s.db.meta.revision,
      requestId,
    };
  const a = await call("command", body, s),
    b = await call("command", body, s);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.data.result.id, b.data.result.id);
  assert.equal(
    b.data.db.payments.filter((x) => x.id === a.data.result.id).length,
    1,
  );
  assert.equal(
    (
      await call(
        "command",
        { ...body, args: [e.id, { amount: 1, method: "Tiền mặt" }] },
        s,
      )
    ).status,
    422,
  );
});
test("API07: lỗi ghi SQLite rollback, không báo thành công và không tăng revision", async () => {
  const s = await login(),
    count = s.db.students.length;
  app.database.sql.exec(
    "CREATE TRIGGER reject_test BEFORE INSERT ON students WHEN json_extract(NEW.payload,'$.name')='Disk failure' BEGIN SELECT RAISE(ABORT,'simulated write failure'); END;",
  );
  try {
    const r = await command(s, "saveMaster", [
      "students",
      null,
      { name: "Disk failure" },
    ]);
    assert.equal(r.status, 500);
    const state = (await call("state", null, s)).data;
    assert.equal(state.db.students.length, count);
    assert.equal(state.db.meta.revision, s.db.meta.revision);
  } finally {
    app.database.sql.exec("DROP TRIGGER reject_test");
  }
});
test("API08: backup không có hash; restore thiếu bảng/đứt liên kết rollback", async () => {
  const s = await login(),
    backup = (await call("backup", null, s)).data;
  assert(!JSON.stringify(backup).includes("password_hash"));
  assert(!JSON.stringify(backup).includes("123456"));
  const corrupt = structuredClone(backup);
  delete corrupt.db.sessions;
  const r = await call(
    "restore",
    { backup: corrupt, confirm: "KHOI PHUC", revision: s.db.meta.revision },
    s,
  );
  assert.equal(r.status, 422);
  assert.equal(
    (await call("state", null, s)).data.db.meta.revision,
    s.db.meta.revision,
  );
  const badref = structuredClone(backup);
  badref.db.rooms[0].branchId = "missing";
  assert.equal(
    (
      await call(
        "restore",
        { backup: badref, confirm: "KHOI PHUC", revision: s.db.meta.revision },
        s,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await call(
        "restore",
        { backup, confirm: "KHOI PHUC", revision: s.db.meta.revision },
        s,
      )
    ).status,
    200,
  );
});
test("API09: trạng thái thực sự được lưu khi mở lại SQLite", async () => {
  const db2 = openDatabase(join(dir, "data.sqlite"));
  try {
    assert(db2.load().students.some((x) => x.name === "API Shared"));
    assert(db2.load().payments.some((p) => p.amount === 100000));
  } finally {
    db2.close();
  }
});
test("API10: lead public kiểm tra đầu vào, nhân viên ghi danh đọc được cùng máy chủ", async () => {
  assert.equal(
    (await call("leads", { name: "   ", phone: "0901234567", courseId: "co2" }))
      .status,
    422,
  );
  assert.equal(
    (
      await call("leads", {
        name: "Tư vấn API",
        phone: "0901234567",
        courseId: "co2",
        branchId: "br1",
      })
    ).status,
    200,
  );
  const s = await login("ghidanh");
  assert(s.db.leads.some((x) => x.name === "Tư vấn API"));
});
test("API11: đổi mật khẩu kiểm tra mật khẩu cũ, hủy các phiên khác, logout thật", async () => {
  const a = await login("ketoan"),
    b = await login("ketoan");
  assert.equal(
    (await call("change-password", { current: "wrong", password: "abcdef" }, a))
      .status,
    422,
  );
  assert.equal(
    (
      await call(
        "change-password",
        { current: "123456", password: "abcdef" },
        a,
      )
    ).status,
    200,
  );
  assert.equal((await call("state", null, b)).data.user, null);
  assert.equal(
    (await call("login", { username: "ketoan", password: "123456" })).status,
    401,
  );
  assert.equal(
    (await call("login", { username: "ketoan", password: "abcdef" })).status,
    200,
  );
  assert.equal((await call("logout", {}, a)).status, 200);
  assert.equal((await call("state", null, a)).data.user, null);
});
test("API12: Origin ngoài bị chặn, gọi action nội bộ không được phép", async () => {
  const s = await login();
  assert.equal(
    (
      await call(
        "leads",
        { name: "X", phone: "0901234567", courseId: "co2" },
        null,
        { origin: "http://evil.test" },
      )
    ).status,
    403,
  );
  assert.equal((await command(s, "_pay", [])).status, 422);
});

// Reset giữ tài khoản riêng và thông tin giáo viên cần cho khóa liên kết.
test("API13: reset demo giữ tài khoản và giáo viên đã thêm", async () => {
  let s = await login();
  const a = await command(s, "saveMaster", [
    "teachers",
    null,
    { name: "Teacher Reset", status: "Đang dạy", specialty: "Giao tiếp", branchIds: ["br1"] },
  ]);
  assert.equal(a.status, 200);
  s = { ...a.data, cookie: s.cookie };
  const teacher = s.db.teachers.find((t) => t.name === "Teacher Reset");
  const b = await command(s, "saveUser", [
    null,
    {
      name: "Teacher Reset",
      username: "teacher.reset",
      password: "abcdef",
      role: "teacher",
      teacherId: teacher.id,
      branchIds: ["br1"],
    },
  ]);
  assert.equal(b.status, 200);
  s = { ...b.data, cookie: s.cookie };
  const reset = await call(
    "reset",
    { confirm: "RESET DEMO", revision: s.db.meta.revision },
    s,
  );
  assert.equal(reset.status, 200);
  assert(reset.data.db.users.some((u) => u.username === "teacher.reset"));
  assert(reset.data.db.teachers.some((t) => t.id === teacher.id));
  const teacherLogin = await call("login", {
    username: "teacher.reset",
    password: "abcdef",
  });
  assert.equal(teacherLogin.status, 200);
});

test("API14: reset từ phiên cũ bị chặn, không xóa cập nhật mới", async () => {
  const old = await login();
  const saved = await command(old, "saveMaster", [
    "students",
    null,
    { name: "Không được reset mất" },
  ]);
  assert.equal(saved.status, 200);
  const reset = await call(
    "reset",
    { confirm: "RESET DEMO", revision: old.db.meta.revision },
    old,
  );
  assert.equal(reset.status, 409);
  assert(
    app.database.load().students.some((s) => s.name === "Không được reset mất"),
  );
});

test("API15: JSON null/mảng/primitive và backup thiếu db trả lỗi đầu vào, không lỗi 500", async () => {
  const s = await login();
  const before = app.database.load();
  for (const value of [null, [], "login", 12, true]) {
    const res = await fetch(base + "login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    assert.equal(res.status, 422, JSON.stringify(value));
  }
  for (const db of [null, undefined, [], "invalid"]) {
    const r = await call(
      "restore",
      {
        confirm: "KHOI PHUC",
        revision: s.db.meta.revision,
        backup: { format: "ABC-English-v2", db },
      },
      s,
    );
    assert.equal(r.status, 422);
    assert.deepEqual(app.database.load(), before);
  }
});

test("API16: giới hạn đăng nhập dùng chung khóa khi đổi hoa/thường và khoảng trắng", async () => {
  for (let i = 0; i < 8; i++) {
    const r = await call("login", {
      username: i % 2 ? "  UNKNOWN.LOGIN  " : "unknown.login",
      password: "wrong",
    });
    assert.equal(r.status, 401);
  }
  const r = await call("login", {
    username: " unknown.login ",
    password: "wrong",
  });
  assert.equal(r.status, 429);
});
