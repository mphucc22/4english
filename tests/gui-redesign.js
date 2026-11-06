import assert from "node:assert/strict";
import { join } from "node:path";
import { PLACEMENT_QUESTIONS } from "../src/lib/placement.js";
import { vnd } from "../src/lib/util.js";

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  assert(
    dimensions.content <= dimensions.viewport + 1,
    `${label}: ${dimensions.content}px > ${dimensions.viewport}px`,
  );
}
async function count(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) =>
      document.querySelectorAll(selector).length === expected,
    { selector, expected },
  );
}
async function finishQuiz(page, correct = true) {
  for (let i = 0; i < PLACEMENT_QUESTIONS.length; i++) {
    const question = PLACEMENT_QUESTIONS[i];
    await page
      .locator(".quiz-options label")
      .nth(correct ? question.answer : (question.answer + 1) % 4)
      .click();
    await page
      .getByRole("button", {
        name:
          i === PLACEMENT_QUESTIONS.length - 1
            ? "Xem kết quả"
            : "Câu tiếp theo",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("heading", { name: "Kết quả bài kiểm tra", exact: true })
    .waitFor();
}

export async function runRedesignTests({
  test,
  reset,
  read,
  route,
  formSave,
  url,
  out,
  screenCoverage,
}) {
  await test(
    "UI24",
    "Bộ lọc khóa học, tìm kiếm và trạng thái không có kết quả",
    async (make) => {
      const { page } = await make({});
      await count(page, ".course-card", 6);
      for (const [name, expected] of [
        ["Tiếng Anh thiếu nhi", 1],
        ["Luyện thi IELTS", 1],
        ["Tiếng Anh giao tiếp", 4],
        ["Tất cả khóa học", 6],
      ]) {
        await page.getByRole("button", { name, exact: true }).click();
        await count(page, ".course-card", expected);
      }
      const search = page.getByRole("textbox", { name: "Tìm khóa học" });
      await search.fill("IELTS");
      await count(page, ".course-card", 1);
      await search.fill("Khóa không tồn tại 123");
      await page
        .getByRole("heading", { name: "Chưa tìm thấy khóa học phù hợp" })
        .waitFor();
      await page.getByRole("button", { name: "Xem tất cả khóa học" }).click();
      await count(page, ".course-card", 6);
      assert.equal(await search.inputValue(), "");
    },
  );

  await test(
    "UI25",
    "Chi tiết cả 6 khóa học, học phí, lịch lớp và mã khóa không tồn tại",
    async (make) => {
      const { page } = await make({});
      for (const course of read().courses) {
        await page.goto(url + "#/course/" + course.id);
        await page
          .getByRole("heading", { name: course.name, level: 1, exact: true })
          .waitFor();
        await page
          .getByText(vnd(course.fee), { exact: true })
          .first()
          .waitFor();
        await count(
          page,
          ".open-class",
          read().classes.filter(
            (c) => c.courseId === course.id && c.status === "Mở đăng ký",
          ).length,
        );
        await noOverflow(page, "Chi tiết " + course.code);
      }
      await page.screenshot({
        path: join(out, "06-course-detail-desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page, "Chi tiết khóa học mobile");
      await page.screenshot({
        path: join(out, "07-course-detail-mobile.png"),
        fullPage: true,
      });
      await page.goto(url + "#/course/khong-ton-tai");
      await page
        .getByRole("heading", { name: "Chưa tìm thấy khóa học" })
        .waitFor();
      await page
        .getByRole("link", { name: "Xem các khóa học", exact: true })
        .click();
      await count(page, ".course-card", 6);
    },
  );

  await test(
    "UI26",
    "Nút chi tiết và tư vấn giữ đúng khóa đã chọn khi đổi route",
    async (make) => {
      const { page } = await make({});
      await page
        .getByRole("link", {
          name: "Xem chi tiết Giao tiếp A1 – Mất gốc",
          exact: true,
        })
        .click();
      await page
        .getByRole("heading", {
          name: "Giao tiếp A1 – Mất gốc",
          level: 1,
          exact: true,
        })
        .waitFor();
      for (const course of [read().courses[1], read().courses[5]]) {
        await page.goto(url + "#/course/" + course.id);
        await page
          .getByRole("heading", { name: course.name, level: 1, exact: true })
          .waitFor();
        await page
          .getByRole("link", { name: "Nhận tư vấn khóa học", exact: true })
          .click();
        await page.waitForFunction(
          (id) => document.querySelector('[name="courseId"]')?.value === id,
          course.id,
        );
        assert.equal(
          await page.locator("[name=courseId]").inputValue(),
          course.id,
        );
      }
    },
  );

  await test(
    "UI27",
    "Giảng viên lấy từ dữ liệu thật, không công khai người đã nghỉ và thông tin liên hệ",
    async (make) => {
      const { page } = await make({});
      await count(page, ".teacher-card", 6);
      for (const teacher of read().teachers)
        await page
          .locator(".teacher-card")
          .getByRole("heading", { name: teacher.name, exact: true })
          .waitFor();
      const removed = read().teachers[0];
      reset((db) => {
        db.teachers[0].status = "Nghỉ";
      });
      await page.reload();
      await count(page, ".teacher-card", 5);
      assert.equal(
        await page
          .locator(".teacher-card")
          .getByRole("heading", { name: removed.name, exact: true })
          .count(),
        0,
      );
      const state = await page.evaluate(() =>
        fetch("/api/state").then((r) => r.json()),
      );
      assert(
        !state.db.teachers.some(
          (t) => t.phone || t.email || t.id === removed.id,
        ),
      );
    },
  );

  await test(
    "UI28",
    "Trang công khai ở 320/390/768/1440px, menu mobile, Escape và FAQ",
    async (make) => {
      const { page } = await make({});
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url + "#/");
        await count(page, ".course-card", 6);
        await noOverflow(page, "Trang chủ " + width);
        const login = page.locator(".prep-nav-actions .nav-login");
        const bounds = await login.boundingBox();
        assert(
          bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
          "Nút cổng nhân viên bị cắt",
        );
        if (width <= 640) {
          const font = await page
            .locator('[name="phone"]')
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
          assert(font >= 16);
        }
        screenCoverage.push({ account: "public", route: "#/", width });
        await page.screenshot({
          path: join(out, `public-viewport-${width}.png`),
          fullPage: false,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Mở menu", exact: true }).click();
      await page.locator("#public-mobile-menu").waitFor();
      await page.keyboard.press("Escape");
      await page.locator("#public-mobile-menu").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Mở menu", exact: true }).click();
      await page
        .locator("#public-mobile-menu")
        .getByRole("link", { name: "Giảng viên", exact: true })
        .click();
      await page.locator("#public-mobile-menu").waitFor({ state: "hidden" });
      const faq = page.locator(".faq-list details").first();
      await faq.locator("summary").click();
      assert.notEqual(await faq.getAttribute("open"), null);
      await faq.locator("summary").click();
      assert.equal(await faq.getAttribute("open"), null);
      await page.reload();
      await count(page, ".course-card", 6);
      await page.keyboard.press("Tab");
      assert(
        await page
          .locator(".skip-link")
          .evaluate((el) => el === document.activeElement),
      );
    },
  );

  await test(
    "UI29",
    "Lọc lịch khai giảng theo cả 4 cơ sở và trạng thái lớp rỗng",
    async (make) => {
      const { page } = await make({});
      const filter = page.getByRole("combobox", {
        name: "Lọc lớp theo chi nhánh",
      });
      for (const branch of read().branches) {
        await filter.selectOption(branch.id);
        const expected = read().classes.filter(
          (c) => c.status === "Mở đăng ký" && c.branchId === branch.id,
        ).length;
        await count(page, ".open-class", expected);
        if (!expected)
          await page
            .getByText("Chưa có lớp đang nhận đăng ký tại cơ sở này.", {
              exact: false,
            })
            .waitFor();
      }
      await filter.selectOption("");
      await count(
        page,
        ".open-class",
        read().classes.filter((c) => c.status === "Mở đăng ký").length,
      );
    },
  );

  await test(
    "UI30",
    "Bài thử: chặn câu bỏ trống, giữ đáp án khi quay lại, chấm 0 điểm và làm lại",
    async (make) => {
      const { page } = await make({ hash: "#/placement" });
      await page
        .getByRole("button", { name: "Bắt đầu kiểm tra", exact: true })
        .click();
      assert(
        await page
          .getByRole("button", { name: "Câu tiếp theo", exact: true })
          .isDisabled(),
      );
      const wrong = (PLACEMENT_QUESTIONS[0].answer + 1) % 4;
      await page.locator(".quiz-options label").nth(wrong).click();
      await page
        .getByRole("button", { name: "Câu tiếp theo", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Câu trước", exact: true })
        .click();
      assert(
        await page
          .locator(`input[name="question-0"][value="${wrong}"]`)
          .isChecked(),
      );
      await finishQuiz(page, false);
      assert.equal(
        await page.locator(".placement-score strong").textContent(),
        "0",
      );
      await page
        .getByRole("heading", { name: "Giao tiếp A1 – Mất gốc", exact: true })
        .waitFor();
      await page.locator(".quiz-review summary").click();
      await count(page, ".quiz-review article", 10);
      await page
        .getByRole("button", { name: "Làm lại bài kiểm tra", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Bắt đầu kiểm tra", exact: true })
        .click();
      assert.equal(await page.locator("progress").getAttribute("value"), "0");
      assert(
        await page
          .getByRole("button", { name: "Câu tiếp theo", exact: true })
          .isDisabled(),
      );
    },
  );

  await test(
    "UI31",
    "Bài thử 10 điểm với mục tiêu IELTS dẫn đúng khóa và form tư vấn",
    async (make) => {
      const { page } = await make({ hash: "#/placement" });
      await page.locator('input[name="learningGoal"][value="ielts"]').check();
      await page
        .getByRole("button", { name: "Bắt đầu kiểm tra", exact: true })
        .click();
      await finishQuiz(page);
      assert.equal(
        await page.locator(".placement-score strong").textContent(),
        "10",
      );
      await page
        .getByRole("heading", {
          name: "IELTS Foundation 5.0",
          level: 2,
          exact: true,
        })
        .waitFor();
      await page.screenshot({
        path: join(out, "11-placement-desktop.png"),
        fullPage: false,
      });
      await page
        .getByRole("link", { name: "Xem khóa được gợi ý", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "IELTS Foundation 5.0",
          level: 1,
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("link", { name: "Nhận tư vấn khóa học", exact: true })
        .click();
      await page.waitForFunction(
        () => document.querySelector('[name="courseId"]')?.value === "co6",
      );
    },
  );

  await test(
    "UI32",
    "Hoàn thành bài thử trên màn hình 320px, xem đáp án và gợi ý B2",
    async (make) => {
      const { page } = await make({ hash: "#/placement", width: 320 });
      await noOverflow(page, "Giới thiệu bài thử mobile");
      await page
        .getByRole("button", { name: "Bắt đầu kiểm tra", exact: true })
        .click();
      await noOverflow(page, "Câu hỏi bài thử mobile");
      await finishQuiz(page);
      await page
        .getByRole("heading", {
          name: "Tiếng Anh B2 – Trung cao cấp",
          exact: true,
        })
        .waitFor();
      await noOverflow(page, "Kết quả bài thử mobile");
      await page.locator(".quiz-review summary").click();
      await noOverflow(page, "Đáp án bài thử mobile");
      await page.screenshot({
        path: join(out, "08-placement-mobile.png"),
        fullPage: true,
      });
    },
  );

  await test(
    "UI33",
    "Hiện/ẩn mật khẩu, đăng nhập bằng Enter và nhận diện cổng nhân viên",
    async (make) => {
      const { page } = await make({ hash: "#/login", width: 390 });
      await page.locator("[name=u]").fill("quanly");
      await page.locator("[name=p]").fill("123456");
      await page
        .getByRole("button", { name: "Hiện mật khẩu", exact: true })
        .click();
      assert.equal(await page.locator("[name=p]").getAttribute("type"), "text");
      await page
        .getByRole("button", { name: "Ẩn mật khẩu", exact: true })
        .click();
      assert.equal(
        await page.locator("[name=p]").getAttribute("type"),
        "password",
      );
      await noOverflow(page, "Đăng nhập mobile");
      await page.screenshot({
        path: join(out, "09-login-mobile.png"),
        fullPage: true,
      });
      await page.locator("[name=p]").press("Enter");
      await page.locator("main h1").waitFor();
      await page.goto(url + "#/");
      await page
        .locator(".prep-nav-actions")
        .getByRole("link", { name: "Vào hệ thống", exact: true })
        .waitFor();
    },
  );

  await test(
    "UI34",
    "Toàn bộ màn hình theo 5 tài khoản ở desktop, tablet và điện thoại",
    async (make) => {
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
      const pages = {
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
        gv2: ["dashboard", "timetable", "attendance"],
      };
      for (const [username, menu] of Object.entries(pages)) {
        const { page, context } = await make({ username });
        for (const width of [1440, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const key of menu) {
            await route(page, "#/app/" + key, headings[key]);
            await noOverflow(page, username + "/" + key + "/" + width);
            assert.equal(
              await page
                .getByText("Chưa thể hiển thị trang này", { exact: true })
                .count(),
              0,
            );
            screenCoverage.push({
              account: username,
              route: "#/app/" + key,
              width,
            });
          }
          if (username === "quanly") {
            for (const c of read().classes) {
              await page.goto(url + "#/app/class/" + c.id);
              await page
                .locator("main h1")
                .filter({ hasText: "Lớp" })
                .waitFor();
              await noOverflow(page, "Chi tiết lớp " + c.code + "/" + width);
              screenCoverage.push({
                account: username,
                route: "#/app/class/" + c.id,
                width,
              });
            }
            if (width === 390)
              await page.screenshot({
                path: join(out, "10-class-detail-mobile.png"),
                fullPage: true,
              });
          }
        }
        await context.close();
      }
    },
  );

  await test(
    "UI35",
    "Cả 5 tab danh mục và các dialog tạo mới trên điện thoại, hủy không ghi dữ liệu",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/master",
        width: 390,
      });
      const revision = read().meta.revision;
      for (const tab of [
        "Giáo viên",
        "Chi nhánh",
        "Phòng học",
        "Khóa học",
        "Đợt đào tạo (3 tháng)",
      ]) {
        await page
          .locator("main")
          .getByRole("button", { name: tab, exact: true })
          .click();
        await page.getByRole("button", { name: "+ Thêm", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        const bounds = await dialog.boundingBox();
        assert(bounds.x >= 0 && bounds.x + bounds.width <= 391);
        await noOverflow(page, "Dialog " + tab);
        const controls = dialog.locator(
          "button:enabled,input:enabled,select:enabled,textarea:enabled",
        );
        await controls.last().focus();
        await page.keyboard.press("Tab");
        assert(
          await controls
            .first()
            .evaluate((el) => el === document.activeElement),
        );
        await page.keyboard.press("Shift+Tab");
        assert(
          await controls.last().evaluate((el) => el === document.activeElement),
        );
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
      }
      for (const [path, heading, button] of [
        ["students", "Học viên", "+ Thêm học viên"],
        ["classes", "Lớp học", "+ Tạo lớp"],
        ["staff", "Nhân viên", "+ Thêm nhân viên"],
      ]) {
        await route(page, "#/app/" + path, heading);
        await page.getByRole("button", { name: button, exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        await noOverflow(page, "Dialog " + path);
        await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
      }
      assert.equal(read().meta.revision, revision);
    },
  );

  await test(
    "UI36",
    "Từ chối yêu cầu qua dialog mobile có lý do và xác nhận",
    async (make) => {
      const pending = read().requests.find((r) => r.status === "Chờ duyệt");
      assert(pending);
      const { page } = await make({
        username: "quanly",
        hash: "#/app/requests",
        width: 390,
      });
      await page
        .getByRole("button", { name: "Từ chối", exact: true })
        .first()
        .click();
      await page
        .locator("[name=note]")
        .fill("Lý do kiểm thử giao diện: chưa đủ thông tin.");
      await formSave(page, { confirm: true });
      assert(
        read().requests.some(
          (r) =>
            r.status === "Từ chối" &&
            r.note.includes("Lý do kiểm thử giao diện"),
        ),
      );
    },
  );
  await test(
    "UI37",
    "Nút in báo cáo, chế độ in ẩn điều hướng và tạo được PDF",
    async (make) => {
      const { page } = await make({
        username: "ketoan",
        hash: "#/app/reports",
      });
      await page.evaluate(() => {
        window.__printCalls = 0;
        window.print = () => window.__printCalls++;
      });
      await page
        .getByRole("button", { name: "In báo cáo", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.__printCalls), 1);
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator(".app-sidebar").isVisible(), false);
      assert.equal(await page.locator(".app-topbar").isVisible(), false);
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      assert(pdf.subarray(0, 5).toString() === "%PDF-");
    },
  );
  await test(
    "UI38",
    "Điều hướng tuần và lọc cơ sở của thời khóa biểu trên điện thoại",
    async (make) => {
      const { page } = await make({
        username: "quanly",
        hash: "#/app/timetable",
        width: 390,
      });
      await page
        .locator("main h1")
        .filter({ hasText: "Thời khóa biểu" })
        .waitFor();
      const initial = await page.locator("main b").first().textContent();
      await page
        .getByRole("button", { name: "Tuần sau ›", exact: true })
        .click();
      await page.waitForFunction(
        (old) => document.querySelector("main b")?.textContent !== old,
        initial,
      );
      await page
        .getByRole("button", { name: "‹ Tuần trước", exact: true })
        .click();
      await page.waitForFunction(
        (old) => document.querySelector("main b")?.textContent === old,
        initial,
      );
      await page
        .getByRole("button", { name: "Tuần sau ›", exact: true })
        .click();
      await page.getByRole("button", { name: "Tuần này", exact: true }).click();
      await page.waitForFunction(
        (old) => document.querySelector("main b")?.textContent === old,
        initial,
      );
      for (const branch of read().branches) {
        await page.locator("main select").selectOption(branch.id);
        await noOverflow(page, "Thời khóa biểu/" + branch.id);
      }
    },
  );
  await test(
    "UI39",
    "Nhân viên cập nhật trạng thái tư vấn và dữ liệu giữ nguyên khi tải lại",
    async (make) => {
      const customer = await make({});
      await customer.page.locator("[name=name]").fill("Theo dõi tư vấn GUI");
      await customer.page.locator("[name=phone]").fill("0901234567");
      await customer.page.locator("[name=courseId]").selectOption("co2");
      await customer.page.locator("[name=branchId]").selectOption("br1");
      await customer.page
        .getByRole("button", { name: "Gửi yêu cầu tư vấn", exact: true })
        .click();
      await customer.page
        .getByRole("status")
        .filter({ hasText: "Đã nhận yêu cầu tư vấn" })
        .waitFor();
      assert.equal(read().leads.find((lead) => lead.name === "Theo dõi tư vấn GUI").branchId, "br1");
      const { page } = await make({
        username: "ghidanh",
        hash: "#/app/leads",
        width: 390,
      });
      const row = page.locator("tr").filter({ hasText: "Theo dõi tư vấn GUI" });
      for (const status of ["Đã liên hệ", "Đã ghi danh"]) {
        const saved = page.waitForResponse(
          (r) => r.url().endsWith("/api/command") && r.ok(),
        );
        await row.locator("select").selectOption(status);
        await saved;
        assert.equal(
          read().leads.find((l) => l.name === "Theo dõi tư vấn GUI").status,
          status,
        );
        await page.reload();
        await row.waitFor();
        assert.equal(await row.locator("select").inputValue(), status);
      }
    },
  );
  await test(
    "UI40",
    "Thanh điều hướng không che tiến độ và phần đầu kết quả bài thử",
    async (make) => {
      const { page } = await make({ hash: "#/placement", width: 390 });
      await page
        .getByRole("button", { name: "Bắt đầu kiểm tra", exact: true })
        .click();
      const visibleTop = (selector) =>
        page.waitForFunction((selector) => {
          const panel = document.querySelector(selector),
            header = document.querySelector(".prep-header");
          return (
            panel &&
            header &&
            panel.getBoundingClientRect().top >=
              header.getBoundingClientRect().bottom - 1
          );
        }, selector);
      await visibleTop(".placement-quiz");
      await finishQuiz(page);
      await visibleTop(".placement-result-summary");
    },
  );
}
