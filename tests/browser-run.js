/** Kiểm thử trình duyệt thật. Chạy npm run build rồi npm run test:browser. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createApp } from "../server/app.js";
import { Seed } from "../src/lib/seed.js";
import { R, U } from "../src/lib/rules.js";
import { klass, fill, pastSession } from "./helpers.js";
import { runRedesignTests } from "./gui-redesign.js";
import { runPublicSiteTests } from "./public-site.js";
const temp = mkdtempSync(join(tmpdir(), "abc-browser-")),
  out = resolve("test-results");
mkdirSync(out, { recursive: true });
const app = createApp({ dbPath: join(temp, "data.sqlite") });
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${app.server.address().port}`;
let browser;
const results = [];
const screenCoverage = [];
const selected = new Set(process.argv.slice(2));
const reset = (change) =>
  app.database.transact(() => {
    const db = Seed.build();
    change?.(db);
    const current = app.database.load();
    db.meta.revision = current.meta.revision + 1;
    app.database.save(db);
    app.database.sql.exec("DELETE FROM operations");
  });
const read = () => app.database.load();
async function boot({
  username,
  hash = "#/",
  width = 1440,
  origin = url,
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    timezoneId: "Asia/Ho_Chi_Minh",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  // Proxy một origin HTTP không an toàn vào chính backend thật của ca kiểm thử.
  // Không cần DNS/mạng LAN của môi trường chạy và không giả dữ liệu API.
  if (origin !== url)
    await page.route(origin + "/**", async (route) => {
      const req = route.request(),
        target = new URL(req.url());
      const response = await fetch(url + target.pathname + target.search, {
        method: req.method(),
        headers: {
          ...(await req.allHeaders()),
          host: new URL(url).host,
          origin: url,
        },
        ...(req.postData() ? { body: req.postData() } : {}),
      });
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + (username ? "#/login" : hash));
  if (username) {
    await page.locator("[name=u]").fill(username);
    await page.locator("[name=p]").fill("123456");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.locator("main h1").waitFor();

    if (hash !== "#/") await page.goto(origin + hash);
  }
  return { page, context, errors };
}
async function route(page, hash, heading) {
  await page.goto(url + hash);
  await page.locator("main h1").filter({ hasText: heading }).waitFor();
}
async function formSave(page, { confirm = false } = {}) {
  const dialog = page.getByRole("dialog");
  await dialog.locator("button[type=submit]").click();
  if (confirm)
    await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
}
// Giữ một phản hồi đọc thật để kiểm tra thứ tự mạng, không giả dữ liệu.
async function holdNextState(page) {
  let release, captured, completed;
  const gate = new Promise((r) => {
    release = r;
  });
  const ready = new Promise((r) => {
    captured = r;
  });
  const done = new Promise((r) => {
    completed = r;
  });
  let first = true;
  const pattern = "**/api/state";
  const handler = async (route) => {
    if (!first) return route.continue();
    first = false;
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
    completed();
  };
  await page.route(pattern, handler);
  await ready;
  return async () => {
    release();
    await done;
    await page.unroute(pattern, handler);
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  };
}

async function test(id, name, fn) {
  if (selected.size && !selected.has(id)) return;
  reset();
  const contexts = [];
  const make = async (options) => {
    const f = await boot(options);
    contexts.push(f);
    return f;
  };
  try {
    await fn(make);
    for (const f of contexts)
      assert.equal(f.errors.length, 0, f.errors.join("\n"));
    results.push({ id, name, status: "Passed" });
    console.log("PASS", id, name);
  } catch (e) {
    results.push({ id, name, status: "Failed", error: e.message });
    console.error("FAIL", id, name, e.message);
    for (const f of contexts)
      try {
        await f.page.screenshot({
          path: join(out, id + "-failure.png"),
          fullPage: true,
        });
      } catch {}
  } finally {
    for (const f of contexts) await f.context.close();
  }
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--host-resolver-rules=MAP abc.test 127.0.0.1",
      "--no-proxy-server",
    ],
  });
  await test(
    "UI01",
    "Trang giới thiệu, palette thống nhất và mobile không tràn ngang",
    async (make) => {
      for (const width of [1440, 390]) {
        const { page } = await make({ width });
        await page.getByRole("heading", { name: /Tự tin mở lời/ }).waitFor();
        assert.equal(await page.locator(".course-card").count(), 6);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: join(
            out,
            width === 1440 ? "01-public-desktop.png" : "02-public-mobile.png",
          ),
          fullPage: true,
        });
      }
    },
  );
  await test(
    "UI02",
    "Đăng nhập sai, đăng nhập 5 vai trò và đăng xuất thật",
    async (make) => {
      const f = await make({ hash: "#/login" });
      await f.page.locator("[name=u]").fill("quanly");
      await f.page.locator("[name=p]").fill("sai");
      await f.page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await f.page.getByRole("alert").waitFor();
      for (const username of ["quanly", "ghidanh", "ketoan", "gv1", "gv2"]) {
        const { page } = await make({ username });
        await page
          .getByRole("button", { name: "Đăng xuất", exact: true })
          .click();
        await page.getByRole("heading", { name: /Tự tin mở lời/ }).waitFor();
        await page.goto(url + "#/app/staff");
        await page.locator("[name=u]").waitFor();
      }
    },
  );
  const headings = {
    dashboard: "Xin chào",
    classes: "Lớp học",
    timetable: "Thời khóa biểu",
    students: "Học viên",
    enrollments: "Đăng ký học",
    payments: "Học phí",
    requests: "Bảo lưu",
    attendance: "Điểm danh",
    staff: "Nhân viên",
    master: "Danh mục",
    leads: "Yêu cầu tư vấn",
    reports: "Báo cáo",
    system: "Hệ thống",
  };
  for (const [username, pages] of Object.entries({
    quanly: Object.keys(headings),
    ghidanh: [
      "dashboard",
      "students",
      "classes",
      "enrollments",
      "requests",
      "timetable",
      "leads",
    ],
    ketoan: ["dashboard", "payments", "enrollments", "classes", "reports"],
    gv1: ["dashboard", "timetable", "attendance"],
  }))
    await test(
      "P-" + username,
      "Mở toàn bộ trang được phép: " + username,
      async (make) => {
        const { page } = await make({ username });
        for (const key of pages)
          await route(page, "#/app/" + key, headings[key]);
      },
    );
  await test(
    "UI03",
    "Quản trị desktop/mobile; giáo viên URL nhân viên bị chặn",
    async (make) => {
      const { page } = await make({ username: "quanly" });
      await page.screenshot({
        path: join(out, "03-admin-desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(out, "04-admin-mobile.png"),
        fullPage: true,
      });
      const teacher = await make({ username: "gv1", hash: "#/app/staff" });
      await teacher.page
        .locator("main h1")
        .filter({ hasText: "Xin chào" })
        .waitFor();
      assert.equal(
        await teacher.page
          .getByRole("button", { name: "+ Thêm nhân viên" })
          .count(),
        0,
      );
    },
  );
  await test(
    "UI04",
    "CRUD học viên qua form, khoảng trắng bị chặn và hủy dialog không ghi dữ liệu",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/students",
      });
      const count = read().students.length;
      await page
        .getByRole("button", { name: "+ Thêm học viên", exact: true })
        .click();
      await page.locator("[name=name]").fill("   ");
      await page.locator("[name=branchId]").selectOption("br1");
      await page.locator("[name=dob]").fill("2000-01-01");
      await page.locator("[name=phone]").fill("0901234567");
      await page.getByRole("dialog").locator("button[type=submit]").click();
      await page.getByRole("alert").waitFor();
      assert.equal(read().students.length, count);
      await page.locator("[name=code]").fill("UI-HV");
      await page.locator("[name=name]").fill("Học viên giao diện");
      await formSave(page);
      assert(read().students.some((x) => x.code === "UI-HV"));
      let row = page.locator("tr").filter({ hasText: "UI-HV" });
      await row.getByRole("button", { name: "Sửa", exact: true }).click();
      await page.locator("[name=name]").fill("Đã sửa giao diện");
      await formSave(page, { confirm: true });
      assert.equal(
        read().students.find((x) => x.code === "UI-HV").name,
        "Đã sửa giao diện",
      );
      row = page.locator("tr").filter({ hasText: "UI-HV" });
      await row.getByRole("button", { name: "Xóa", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Hủy", exact: true })
        .click();
      assert(read().students.some((x) => x.code === "UI-HV"));
      await row.getByRole("button", { name: "Xóa", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Xóa", exact: true })
        .click();
      await page.getByRole("alertdialog").waitFor({ state: "hidden" });
      assert(!read().students.some((x) => x.code === "UI-HV"));
    },
  );
  await test(
    "UI05",
    "Tạo lớp → xếp lịch → mở đăng ký → ghi danh qua web",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/classes",
      });
      await page
        .getByRole("button", { name: "+ Tạo lớp", exact: true })
        .click();
      await page.locator("[name=courseId]").selectOption("co1");
      await page.locator("[name=branchId]").selectOption("br4");
      await page.locator("[name=termId]").selectOption("tm1");
      await formSave(page);
      await page.getByRole("button", { name: "Xếp lịch", exact: true }).click();
      await page.locator('input[name=wd][value="1"]').check();
      await page.locator("[name=roomId]").selectOption("br4r2");
      await page.locator("[name=teacherId]").selectOption("gv5");
      await formSave(page);
      await page
        .getByRole("button", { name: "Mở đăng ký", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Mở đăng ký", exact: true })
        .click();
      await page.getByRole("alertdialog").waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: "+ Đăng ký học viên", exact: true })
        .click();
      await page.locator("[name=studentId]").selectOption("hv1");
      await formSave(page);
      assert(
        read().enrollments.some(
          (e) =>
            e.studentId === "hv1" &&
            R.by(read(), "classes", e.classId).courseId === "co1",
        ),
      );
    },
  );
  await test(
    "UI06",
    "Thu phí từ kế toán, không khóa khoản nợ lớp hoàn thành",
    async (make) => {
      reset((db) => {
        const c = db.classes.find((c) => c.status === "Đang học"),
          e = R.live(db, c.id).find(
            (e) => R.due(db, e) > 0 && e.status === "Đã xác nhận",
          );
        R.sessions(db, c.id).forEach((s) => (s.held = true));
        R.finishClass(db, db.users[0], c.id);
        assert(e);
      });
      const { page } = await make({
        username: "ketoan",
        hash: "#/app/payments",
      });
      const e = read().enrollments.find(
        (e) => e.status === "Hoàn thành" && R.due(read(), e) > 0,
      );
      const row = page
        .locator("tr")
        .filter({ hasText: R.by(read(), "students", e.studentId).name })
        .filter({
          has: page.getByRole("button", { name: "Thu phí", exact: true }),
        })
        .first();
      await row.getByRole("button", { name: "Thu phí", exact: true }).click();
      await formSave(page, { confirm: true });
      assert.equal(R.due(read(), R.by(read(), "enrollments", e.id)), 0);
      await route(page, "#/app/enrollments", "Đăng ký học");
      await page.locator('main a[href^="#/app/class/"]').first().click();
      await page.locator("main h1").filter({ hasText: "Lớp" }).waitFor();
    },
  );
  await test(
    "UI07",
    "Nhân viên mới được lưu backend và đăng nhập bằng mật khẩu mới",
    async (make) => {
      const { page } = await make({ username: "quanly", hash: "#/app/staff" });
      await page
        .getByRole("button", { name: "+ Thêm nhân viên", exact: true })
        .click();
      await page.locator("[name=name]").fill("NV Giao diện");
      await page.locator("[name=username]").fill("ui.staff");
      await page.locator("[name=password]").fill("abcdef");
      await page.locator('[name=branchIds][value="br1"]').check();
      await formSave(page);
      assert(read().users.some((u) => u.username === "ui.staff"));
      assert.deepEqual(read().users.find((u) => u.username === "ui.staff").branchIds, ["br1"]);
      const { page: second } = await make({ hash: "#/login" });
      await second.locator("[name=u]").fill("ui.staff");
      await second.locator("[name=p]").fill("abcdef");
      await second
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await second
        .locator("main h1")
        .filter({ hasText: "NV Giao diện" })
        .waitFor();
    },
  );
  await test(
    "UI08",
    "Gửi tư vấn từ public hiển thị cho nhân viên ghi danh",
    async (make) => {
      const { page } = await make({});
      await page.locator("[name=name]").fill("Tư vấn giao diện");
      await page.locator("[name=phone]").fill("0901234567");
      await page.locator("[name=courseId]").selectOption("co2");
      await page.locator("[name=branchId]").selectOption("br1");
      await page
        .getByRole("button", { name: "Gửi yêu cầu tư vấn", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Đã nhận yêu cầu tư vấn" })
        .waitFor();
      assert.equal(read().leads.find((lead) => lead.name === "Tư vấn giao diện").branchId, "br1");
      const staff = await make({ username: "ghidanh", hash: "#/app/leads" });
      await staff.page
        .locator("tr")
        .filter({ hasText: "Tư vấn giao diện" })
        .waitFor();
    },
  );
  await test(
    "UI09",
    "Duyệt chuyển lớp giữ lịch sử; bảo lưu và học lại dùng tín dụng một lần",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/requests",
      });
      const requests = read().requests.filter((r) => r.status === "Chờ duyệt");
      assert.equal(requests.length, 2);
      for (const r of requests) {
        const name = R.by(read(), "students", r.studentId).name;
        await page
          .locator("tr")
          .filter({ hasText: name })
          .filter({
            has: page.getByRole("button", { name: "Duyệt", exact: true }),
          })
          .first()
          .getByRole("button", { name: "Duyệt", exact: true })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Duyệt", exact: true })
          .click();
        await page.getByRole("alertdialog").waitFor({ state: "hidden" });
        assert.equal(R.by(read(), "requests", r.id).status, "Đã duyệt");
      }
      const rv = read().reservations[0];
      await route(page, "#/app/students", "Học viên");
      await page
        .locator("tr")
        .filter({ hasText: R.by(read(), "students", rv.studentId).name })
        .getByRole("button", { name: "Hồ sơ", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Học lại", exact: true })
        .click();
      await page
        .locator("[name=classId]")
        .selectOption(
          read().classes.find(
            (c) => c.courseId === "co2" && c.status === "Mở đăng ký",
          ).id,
        );
      await formSave(page);
      assert.equal(R.by(read(), "reservations", rv.id).status, "Đã học lại");
    },
  );
  await test(
    "UI10",
    "Điểm danh thật chỉ liệt kê lớp chạy; chỉnh sửa buổi giữ lịch sử",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/attendance",
      });
      const labels = await page.locator("select option").allTextContents();
      const unopened = read().classes.find((c) => c.courseId === "co3");
      assert(!labels.some((l) => l.includes(unopened.code)));
      await page
        .getByRole("button", { name: /Cập nhật điểm danh|Lưu điểm danh/ })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Đã lưu điểm danh" })
        .waitFor();
      const c = read().classes.find(
        (x) => x.status === "Đang học" && x.courseId === "co2",
      );
      await route(page, "#/app/class/" + c.id, "Lớp");
      await page
        .getByRole("button", { name: "Điều chỉnh", exact: true })
        .first()
        .click();
      await page.locator("[name=start]").fill("15:00");
      await page.locator("[name=end]").fill("16:30");
      await page.locator("[name=note]").fill("Thay đổi ca kiểm thử");
      await formSave(page, { confirm: true });
      assert(
        read().sessions.some((s) =>
          s.changes?.some((x) => x.note === "Thay đổi ca kiểm thử"),
        ),
      );
    },
  );
  await test(
    "UI11",
    "Hai tab sửa: tab cũ nhận lỗi xung đột, không báo đã lưu",
    async (make) => {
      const { page, context } = await make({
        username: "quanly",
        hash: "#/app/students",
      });
      const second = await context.newPage();
      await second.goto(url + "#/app/students");
      await second
        .getByRole("button", { name: "+ Thêm học viên", exact: true })
        .click();
      await second.locator("[name=name]").fill("Tab cũ");
      await second.locator("[name=dob]").fill("2000-01-01");
      await second.locator("[name=phone]").fill("0901234567");
      await page
        .getByRole("button", { name: "+ Thêm học viên", exact: true })
        .click();
      await page.locator("[name=name]").fill("Tab mới");
      await page.locator("[name=dob]").fill("2000-01-01");
      await page.locator("[name=phone]").fill("0901234567");
      await formSave(page);
      await second.getByRole("dialog").locator("button[type=submit]").click();
      await second
        .getByRole("alert")
        .filter({ hasText: "đã được người khác cập nhật" })
        .waitFor();
      assert(read().students.some((x) => x.name === "Tab mới"));
      assert(!read().students.some((x) => x.name === "Tab cũ"));
    },
  );
  await test(
    "UI12",
    "Sao lưu và khôi phục JSON qua giao diện",
    async (make) => {
      const { page } = await make({ username: "quanly", hash: "#/app/system" });
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Tải bản sao lưu", exact: true })
        .click();
      const file = await download;
      await file.saveAs(join(temp, "backup.json"));
      await page
        .getByRole("button", { name: "Chọn tệp khôi phục", exact: true })
        .click();
      await page
        .locator("input[type=file]")
        .setInputFiles(join(temp, "backup.json"));
      await page.locator("[name=confirm]").fill("KHOI PHUC");
      await formSave(page, { confirm: true });
    },
  );
  await test(
    "UI14",
    "Học bù cùng buổi vắng của hai học viên: form không ẩn nhầm, duyệt và điểm danh học bù",
    async (make) => {
      let secondEid, targetId;
      reset((db) => {
        db.requests = [];
        const c = db.classes.find(
            (x) => x.courseId === "co2" && x.status === "Đang học",
          ),
          ens = R.confirmed(db, c.id),
          other = klass(db, { branch: "br2", room: "br2r2", teacher: "gv5" });
        fill(db, other, { prefix: "ui-makeup" });
        R.confirmOpen(db, db.users[0], other.id);
        const missed = pastSession(db, c, -1, [ens[0].id, ens[1].id]),
          target = R.sessions(db, other.id)[0];
        targetId = target.id;
        secondEid = ens[1].id;
        R.approve(
          db,
          db.users[0],
          R.createRequest(
            db,
            db.users[0],
            "makeup",
            {
              enrollmentId: ens[0].id,
              missedSessionId: missed.id,
              targetSessionId: target.id,
            },
            "Bu A",
          ).id,
        );
      });
      const { page } = await make({
          username: "quanly",
          hash: "#/app/enrollments",
        }),
        student = R.by(
          read(),
          "students",
          R.by(read(), "enrollments", secondEid).studentId,
        );
      await page
        .locator("tr")
        .filter({ hasText: student.name })
        .getByRole("button", { name: "Học bù", exact: true })
        .click();
      assert((await page.locator("[name=missed] option").count()) > 0);
      await page.locator("[name=target]").selectOption(targetId);
      await page.locator("[name=reason]").fill("Bu B");
      await formSave(page);
      const r = read().requests.find(
        (r) => r.data.enrollmentId === secondEid && r.type === "makeup",
      );
      assert(r);
      await route(page, "#/app/requests", "Bảo lưu");
      await page
        .locator("tr")
        .filter({ hasText: student.name })
        .getByRole("button", { name: "Duyệt", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Duyệt", exact: true })
        .click();
      await page.getByRole("alertdialog").waitFor({ state: "hidden" });
      app.database.transact(() => {
        const db = read();
        R.by(db, "sessions", targetId).date = U.today();
        db.meta.revision++;
        app.database.save(db);
      });
      await route(page, "#/app/attendance", "Điểm danh");
      await page.locator("main select").selectOption(targetId);
      await page.locator("tr").filter({ hasText: student.name }).waitFor();
      await page
        .getByRole("button", { name: "Lưu điểm danh", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Đã lưu điểm danh" })
        .waitFor();
      assert.equal(R.by(read(), "requests", r.id).data.done, true);
    },
  );
  await test(
    "UI15",
    "Hủy đăng ký cá nhân và hoàn số dư qua web có sổ chi",
    async (make) => {
      const db = read(),
        e = db.enrollments.find((x) => x.status === "Đã xác nhận"),
        st = R.by(db, "students", e.studentId);
      const { page } = await make({
        username: "quanly",
        hash: "#/app/enrollments",
      });
      await page
        .locator("tr")
        .filter({ hasText: st.name })
        .filter({ hasText: R.by(db, "classes", e.classId).code })
        .getByRole("button", { name: "Hủy đăng ký", exact: true })
        .click();
      await page.locator("[name=reason]").fill("Kiểm thử hủy cá nhân");
      await formSave(page, { confirm: true });
      const credit = R.by(read(), "students", st.id).balance;
      assert(credit > 0);
      await route(page, "#/app/students", "Học viên");
      await page
        .locator("tr")
        .filter({ hasText: st.name })
        .getByRole("button", { name: "Hồ sơ", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Hoàn tiền", exact: true })
        .click();
      await page.locator("[name=amount]").fill(String(credit));
      await page.locator("[name=note]").fill("Hoàn tiền kiểm thử");
      await formSave(page, { confirm: true });
      assert.equal(R.by(read(), "students", st.id).balance, 0);
      assert(
        read().refunds.some(
          (x) => x.studentId === st.id && x.amount === credit,
        ),
      );
    },
  );
  await test(
    "UI16",
    "Hủy phiếu thu sai qua web giữ chứng từ và khôi phục nợ",
    async (make) => {
      const p = read().payments[0],
        e = R.by(read(), "enrollments", p.enrollmentId),
        before = R.due(read(), e);
      const { page } = await make({
        username: "quanly",
        hash: "#/app/payments",
      });
      const input = page.getByPlaceholder("Nhập tên, mã lớp hoặc số phiếu…");
      await input.fill(p.no);
      await page
        .locator("tr")
        .filter({ hasText: p.no })
        .getByRole("button", { name: "Hủy phiếu", exact: true })
        .click();
      await page.locator("[name=reason]").fill("Phiếu thu sai khi kiểm thử");
      await formSave(page, { confirm: true });
      assert.equal(R.by(read(), "payments", p.id).voided, true);
      assert.equal(
        R.due(read(), R.by(read(), "enrollments", e.id)),
        before + p.amount,
      );
    },
  );
  await test(
    "UI17",
    "Đổi mật khẩu tại sidebar xác thực với backend",
    async (make) => {
      const { page } = await make({ username: "quanly" });
      await page
        .getByRole("button", { name: "Đổi mật khẩu", exact: true })
        .click();
      await page.locator("[name=current]").fill("123456");
      await page.locator("[name=password]").fill("abcdef");
      await page.locator("[name=confirm]").fill("abcdef");
      await formSave(page);
      await page
        .getByRole("button", { name: "Đăng xuất", exact: true })
        .click();
      await page.getByRole("heading", { name: /Tự tin mở lời/ }).waitFor();
      await page.goto(url + "#/login");
      await page.locator("[name=u]").fill("quanly");
      await page.locator("[name=p]").fill("abcdef");
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await page.locator("main h1").waitFor();
    },
  );
  await test(
    "UI18",
    "Hủy lớp chưa khai giảng trả tiền vào số dư đúng một lần",
    async (make) => {
      const db = read(),
        c = db.classes.find(
          (c) => c.status === "Mở đăng ký" && c.courseId === "co3",
        ),
        ens = R.live(db, c.id),
        expected = ens.reduce((sum, e) => sum + R.paid(db, e.id), 0);
      const { page } = await make({
        username: "quanly",
        hash: "#/app/class/" + c.id,
      });
      await page.getByRole("button", { name: "Hủy lớp", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Hủy lớp", exact: true })
        .click();
      await page.getByRole("alertdialog").waitFor({ state: "hidden" });
      assert.equal(R.by(read(), "classes", c.id).status, "Đã hủy");
      assert.equal(
        read().balanceLedger.reduce((sum, x) => sum + x.amount, 0),
        expected,
      );
      assert(R.sessions(read(), c.id).length > 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Hủy lớp", exact: true })
          .count(),
        0,
      );
    },
  );
  await test(
    "UI19",
    "Origin HTTP không secure vẫn lưu dữ liệu và hiển thị toast (proxy tới backend thật)",
    async (make) => {
      const origin = url.replace("127.0.0.1", "abc.test"),
        { page } = await make({
          username: "quanly",
          hash: "#/app/students",
          origin,
        });
      assert.equal(await page.evaluate(() => window.isSecureContext), false);
      await page
        .getByRole("button", { name: "+ Thêm học viên", exact: true })
        .click();
      await page.locator("[name=name]").fill("HTTP LAN");
      await page.locator("[name=dob]").fill("2000-01-01");
      await page.locator("[name=phone]").fill("0901234567");
      await formSave(page);
      assert(read().students.some((s) => s.name === "HTTP LAN"));
      await page.getByRole("status").filter({ hasText: "Đã lưu" }).waitFor();
    },
  );
  await test(
    "UI20",
    "Mất phản hồi thu phí rồi làm mới: retry không lập thêm phiếu",
    async (make) => {
      const { page } = await make({
        username: "ketoan",
        hash: "#/app/payments",
      });
      const e = read().enrollments.find(
        (e) =>
          R.due(read(), e) >= 300000 &&
          ["Chờ đóng phí", "Đã xác nhận"].includes(e.status),
      );
      assert(e);
      const name = R.by(read(), "students", e.studentId).name;
      const row = () =>
        page
          .locator("tr")
          .filter({ hasText: name })
          .filter({
            has: page.getByRole("button", { name: "Thu phí", exact: true }),
          })
          .first();
      const before = read().payments.length;
      let first = true;
      const pattern = "**/api/command";
      const handler = async (route) => {
        if (!first) return route.continue();
        first = false;
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        await route.abort("failed");
      };
      await page.route(pattern, handler);
      await row().getByRole("button", { name: "Thu phí", exact: true }).click();
      await page.locator("[name=amount]").fill("100000");
      await page.getByRole("dialog").locator("button[type=submit]").click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Không kết nối được máy chủ" })
        .waitFor();
      assert.equal(read().payments.length, before + 1);
      const refreshed = page.waitForResponse((r) =>
        r.url().endsWith("/api/state"),
      );
      await page.getByRole("button", { name: "Đóng", exact: true }).click();
      await refreshed;
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await row().getByRole("button", { name: "Thu phí", exact: true }).click();
      await page.locator("[name=amount]").fill("100000");
      await formSave(page, { confirm: true });
      assert.equal(read().payments.length, before + 1);
      await page.unroute(pattern, handler);
    },
  );
  await test(
    "UI21",
    "Phản hồi polling cũ không xóa dữ liệu vừa lưu trên màn hình",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/students",
      });
      const release = await holdNextState(page);
      await page
        .getByRole("button", { name: "+ Thêm học viên", exact: true })
        .click();
      await page.locator("[name=name]").fill("Phản hồi mới phải được giữ");
      await page.locator("[name=dob]").fill("2000-01-01");
      await page.locator("[name=phone]").fill("0901234567");
      await formSave(page);
      await release();
      assert(
        read().students.some((s) => s.name === "Phản hồi mới phải được giữ"),
      );
      assert.equal(
        await page
          .locator("tr")
          .filter({ hasText: "Phản hồi mới phải được giữ" })
          .count(),
        1,
      );
    },
  );
  await test(
    "UI22",
    "Polling đến muộn không đảo trạng thái đăng nhập hoặc đăng xuất",
    async (make) => {
      const { page } = await make({ hash: "#/login" });
      await page.locator("[name=u]").waitFor();
      const releaseAnonymous = await holdNextState(page);
      await page.locator("[name=u]").fill("quanly");
      await page.locator("[name=p]").fill("123456");
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await page.locator("main h1").waitFor();
      await releaseAnonymous();
      assert.equal(
        await page
          .getByRole("button", { name: "Đăng xuất", exact: true })
          .count(),
        1,
      );
      const releaseLoggedIn = await holdNextState(page);
      await page
        .getByRole("button", { name: "Đăng xuất", exact: true })
        .click();
      await page.getByRole("heading", { name: /Tự tin mở lời/ }).waitFor();
      await releaseLoggedIn();
      assert.equal(
        await page.getByRole("heading", { name: /Tự tin mở lời/ }).count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Đăng xuất", exact: true })
          .count(),
        0,
      );
      // Không polling với cookie cũ trong lúc đang chờ đăng nhập.
      await page.evaluate(() => {
        location.hash = "#/login";
      });
      await page.locator("[name=u]").waitFor();
      let releaseLogin, loginReady;
      const pendingLogin = new Promise((r) => {
        releaseLogin = r;
      });
      const loginCaptured = new Promise((r) => {
        loginReady = r;
      });
      const loginPattern = "**/api/login";
      const loginHandler = async (route) => {
        const req = route.request();
        const response = await fetch(req.url(), {
          method: req.method(),
          headers: await req.allHeaders(),
          body: req.postData(),
        });
        const body = await response.text();
        loginReady();
        await pendingLogin;
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body,
        });
      };
      await page.route(loginPattern, loginHandler);
      await page.locator("[name=u]").fill("quanly");
      await page.locator("[name=p]").fill("123456");
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await loginCaptured;
      let polls = 0;
      const countPoll = (req) => {
        if (req.url().endsWith("/api/state")) polls++;
      };
      page.on("request", countPoll);
      await page.waitForTimeout(4500);
      releaseLogin();
      await page.locator("main h1").waitFor();
      page.off("request", countPoll);
      await page.unroute(loginPattern, loginHandler);
      assert.equal(polls, 0, "Không polling trong lúc đổi phiên");
    },
  );

  await test(
    "UI23",
    "Mất kết nối khi polling có thông báo và kết nối lại xóa thông báo",
    async (make) => {
      const { page } = await make({ username: "quanly" });
      const pattern = "**/api/state";
      const handler = (route) => route.abort("failed");
      await page.route(pattern, handler);
      await page
        .getByText(
          "Chưa thể đồng bộ với máy chủ. Dữ liệu đang hiển thị có thể chưa cập nhật.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Kết nối lại", exact: true })
          .count(),
        1,
      );
      await page.setViewportSize({ width: 390, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(out, "05-connection-mobile.png"),
        fullPage: true,
      });
      await page.unroute(pattern, handler);
      await page
        .getByRole("button", { name: "Kết nối lại", exact: true })
        .click();
      await page.locator(".connection-notice").waitFor({ state: "hidden" });
      assert.equal(
        await page
          .getByRole("button", { name: "Đăng xuất", exact: true })
          .count(),
        1,
      );
    },
  );

  await test(
    "UI13",
    "Màn hình khóa học rỗng vẫn hiển thị, dữ liệu trình duyệt cũ không phá trang",
    async (make) => {
      reset((db) => {
        db.requests = [];
        db.attendance = [];
        db.payments = [];
        db.reservations = [];
        db.enrollments = [];
        db.sessions = [];
        db.classes = [];
        db.courses = [];
      });
      const { page } = await make({});
      await page
        .getByText("Chương trình đào tạo đang được cập nhật.")
        .waitFor();
      await page.evaluate(() =>
        localStorage.setItem("abc_center_db_react_v1", "invalid"),
      );
      await page.reload();
      await page.getByRole("heading", { name: /Tự tin mở lời/ }).waitFor();
    },
  );
  await runRedesignTests({
    test,
    reset,
    read,
    route,
    formSave,
    url,
    out,
    screenCoverage,
  });
  await runPublicSiteTests({ test, reset, read, route, formSave, url, out, screenCoverage });
} finally {
  if (browser) await browser.close();
  await app.close();
  rmSync(temp, { recursive: true, force: true });
}
writeFileSync(
  join(
    out,
    selected.size ? "browser-results-selected.json" : "browser-results.json",
  ),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      browser: browser?.version() || "Chromium",
      screenCoverage,
      results,
      total: results.length,
      passed: results.filter((r) => r.status === "Passed").length,
      failed: results.filter((r) => r.status === "Failed").length,
    },
    null,
    2,
  ),
);
console.log(
  `${results.filter((r) => r.status === "Passed").length}/${results.length} kiểm thử trình duyệt đạt`,
);
if (results.some((r) => r.status === "Failed")) process.exitCode = 1;
