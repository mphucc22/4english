import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { courseContent } from "../src/lib/course-content.js";
import { createApp } from "../server/app.js";

async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(size.content <= size.viewport + 1, `${label}: ${size.content}px > ${size.viewport}px`);
}

async function selectedContext(page, klass) {
  await page.waitForFunction((expected) =>
    document.querySelector('[name="courseId"]')?.value === expected.courseId &&
    document.querySelector('[name="branchId"]')?.value === expected.branchId &&
    document.querySelector('[name="classId"]')?.value === expected.id,
  { courseId: klass.courseId, branchId: klass.branchId, id: klass.id });
}

export async function runPublicSiteTests({ test, reset, read, url, out, screenCoverage }) {
  await test("UI41", "Trang riêng 4 cơ sở, bản đồ đúng địa chỉ và bố cục 320–1440px", async (make) => {
    const { page } = await make({});
    // This suite verifies our integration, not Google's availability or map tiles.
    await page.route("https://www.google.com/**", (request) => request.abort());
    const data = read();
    for (const branch of data.branches) {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 950 });
        const response = await page.goto(`${url}/co-so/${encodeURIComponent(branch.id)}`, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200);
        await page.getByRole("heading", { name: branch.name, exact: true, level: 1 }).waitFor();
        const iframe = page.locator(".branch-location-section iframe");
        await iframe.waitFor({ state: "attached" });
        assert((await iframe.getAttribute("title")).includes(branch.name));
        const embed = new URL(await iframe.getAttribute("src"));
        assert.equal(embed.origin, "https://www.google.com");
        assert.equal(embed.searchParams.get("q"), branch.address.trim());
        assert.equal(embed.searchParams.get("output"), "embed");
        assert.equal(await iframe.getAttribute("loading"), "lazy");
        const map = page.locator(".branch-location-section .branch-map");
        const search = new URL(await map.getByRole("link", { name: /Mở Google Maps/ }).getAttribute("href"));
        assert.equal(search.searchParams.get("query"), branch.address.trim());
        const directions = new URL(await map.getByRole("link", { name: /Chỉ đường/ }).getAttribute("href"));
        assert.equal(directions.searchParams.get("destination"), branch.address.trim());
        assert.match(response.headers()["content-security-policy"] || "", /frame-src[^;]*https:\/\/www\.google\.com/);
        const classes = data.classes.filter((item) => item.branchId === branch.id && item.status === "Mở đăng ký");
        assert.equal(await page.locator(".branch-class-section .open-class").count(), classes.length);
        for (const klass of classes) {
          const card = page.locator(".branch-class-section .open-class").filter({ hasText: klass.code });
          assert.equal(await card.count(), 1);
          const href = new URL(await card.locator(".class-cta").getAttribute("href"), url);
          assert.equal(href.pathname, `/tu-van/${klass.courseId}`);
          assert.equal(href.searchParams.get("branch"), branch.id);
          assert.equal(href.searchParams.get("class"), klass.id);
        }
        await noOverflow(page, `${branch.code}/${width}`);
        screenCoverage.push({ account: "public", route: `/co-so/${branch.id}`, width });
      }
    }
    await page.screenshot({ path: join(out, "public-branch-mobile.png"), fullPage: false });
    await page.locator(".branch-location-section").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(out, "public-branch-map-mobile.png"), fullPage: false });
  });

  await test("UI42", "Tư vấn từ lớp giữ khóa/cơ sở/lớp, lưu giờ liên hệ và hiển thị xác nhận", async (make) => {
    const klass = read().classes.find((item) => item.status === "Mở đăng ký");
    assert(klass, "Cần một lớp mở đăng ký trong dữ liệu kiểm thử");
    const branch = read().branches.find((item) => item.id === klass.branchId);
    const course = read().courses.find((item) => item.id === klass.courseId);
    const { page } = await make({ width: 390 });
    await page.goto(`${url}/khoa-hoc/${klass.courseId}`);
    const card = page.locator(".detail-classes .open-class").filter({ hasText: klass.code });
    await card.locator(".class-cta").click();
    await selectedContext(page, klass);
    await page.locator('[name="name"]').fill("Tư vấn đúng lớp UI42");
    await page.locator('[name="phone"]').fill("0901234567");
    await page.locator('[name="contactTime"]').selectOption("evening");
    await page.locator('[name="note"]').fill("Muốn trao đổi lịch học của lớp vừa chọn.");
    const saved = page.waitForResponse((response) => response.url().endsWith("/api/leads") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Gửi yêu cầu tư vấn", exact: true }).click();
    const response = await saved;
    assert.equal(response.status(), 200);
    const heading = page.getByRole("heading", { name: "Đã nhận yêu cầu tư vấn", exact: true });
    await heading.waitFor();
    const receipt = page.locator(".consult-receipt");
    for (const text of [branch.name, course.name, klass.code, "Buổi tối"]) {
      assert((await receipt.innerText()).includes(text), `Thiếu ${text} trong xác nhận`);
    }
    const lead = read().leads.find((item) => item.name === "Tư vấn đúng lớp UI42");
    assert(lead);
    assert.equal(lead.courseId, klass.courseId);
    assert.equal(lead.branchId, klass.branchId);
    assert.equal(lead.classId, klass.id);
    assert.equal(lead.contactTime, "evening");
    assert.equal(lead.classCode, klass.code);
    assert.equal(await heading.evaluate((element) => element === document.activeElement), true);
    await noOverflow(page, "Xác nhận tư vấn trên điện thoại");
    await page.screenshot({ path: join(out, "public-consult-confirmation.png"), fullPage: false });

    // The branch page must produce the same selection contract as the course page.
    await page.route("https://www.google.com/**", (request) => request.abort());
    await page.goto(`${url}/co-so/${branch.id}`, { waitUntil: "domcontentloaded" });
    await page.locator(".branch-class-section .open-class").filter({ hasText: klass.code }).locator(".class-cta").click();
    await selectedContext(page, klass);
    const anotherBranch = read().branches.find((item) => item.id !== branch.id);
    await page.locator('[name="branchId"]').selectOption(anotherBranch.id);
    assert.equal(await page.locator('[name="classId"]').inputValue(), "");
    const available = await page.locator('[name="classId"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    assert.deepEqual(available.sort(), read().classes.filter((item) => item.status === "Mở đăng ký" && item.courseId === klass.courseId && item.branchId === anotherBranch.id).map((item) => item.id).sort());
  });

  await test("UI43", "Bài luyện thử của 6 chương trình có phản hồi và tải đúng tài liệu", async (make) => {
    const { page } = await make({ width: 390 });
    const courses = read().courses;
    for (const course of courses) {
      const content = courseContent(course);
      if (!content.activity) continue;
      await page.goto(`${url}/khoa-hoc/${course.id}`);
      await page.getByRole("heading", { name: course.name, exact: true, level: 1 }).waitFor();
      const activity = page.locator(".course-practice-card");
      await activity.waitFor();
      const button = activity.getByRole("button", { name: "Xem giải thích", exact: true });
      assert.equal(await button.isDisabled(), true);
      const wrong = (content.activity.answer + 1) % content.activity.options.length;
      await activity.locator('input[type="radio"]').nth(wrong).check();
      await button.click();
      assert((await activity.locator(".course-practice-feedback").innerText()).includes(content.activity.options[content.activity.answer]));
      await activity.locator('input[type="radio"]').nth(content.activity.answer).check();
      assert.equal(await activity.locator(".course-practice-feedback").count(), 0);
      await button.click();
      assert((await activity.locator(".course-practice-feedback").innerText()).includes("Bạn chọn đúng rồi!"));
      const link = activity.getByRole("link", { name: "Tải bài luyện tập (.txt)", exact: true });
      const download = await page.request.get(new URL(await link.getAttribute("href"), url).href);
      assert.equal(download.status(), 200);
      assert((await download.text()).includes(content.activity.prompt));
      await noOverflow(page, `Bài luyện ${course.code}`);
      screenCoverage.push({ account: "public", route: `/khoa-hoc/${course.id}`, width: 390 });
      if (course.code === "A1") {
        const [file] = await Promise.all([page.waitForEvent("download"), link.click()]);
        assert.equal(file.suggestedFilename(), "4english-a1-practice.txt");
        assert(readFileSync(await file.path(), "utf8").includes(content.activity.explanation));
        await page.screenshot({ path: join(out, "public-course-practice-mobile.png"), fullPage: false });
      }
    }
  });

  await test("UI44", "URL công khai có tiêu đề và chia sẻ riêng, liên kết cũ còn hoạt động", async (make) => {
    const { page } = await make({});
    await page.route("https://www.google.com/**", (request) => request.abort());
    const titles = new Set();
    const pages = [
      ["/", "4ENGLISH"],
      ["/khoa-hoc/co2", read().courses.find((item) => item.id === "co2").name],
      ["/co-so/br1", read().branches.find((item) => item.id === "br1").name],
      ["/kiem-tra-dau-vao", "Kiểm tra đầu vào"],
      ["/chinh-sach-bao-mat", "Thông tin và quyền riêng tư"],
      ["/dieu-khoan", "Hướng dẫn đăng ký học"],
    ];
    for (const [path, fragment] of pages) {
      const response = await page.goto(url + path, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200);
      await page.locator("main h1").waitFor();
      await page.waitForFunction((fragment) => document.title.includes(fragment), fragment);
      const title = await page.title();
      titles.add(title);
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute("content"), title);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), url + path);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    }
    assert.equal(titles.size, pages.length);
    await page.goto(url + "/#/course/co2");
    await page.getByRole("heading", { name: read().courses.find((item) => item.id === "co2").name, level: 1, exact: true }).waitFor();
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), url + "/khoa-hoc/co2");
    await page.goto(url + "/co-so/khong-ton-tai", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Chưa tìm thấy cơ sở", exact: true }).waitFor();
    await page.waitForFunction(() => document.title.includes("Không tìm thấy"));
  });

  await test("UI45", "Tạm dừng chuyển động được ghi nhớ và tôn trọng thiết lập giảm chuyển động", async (make) => {
    const { page } = await make({});
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const pause = page.getByRole("button", { name: "Tạm dừng chuyển động", exact: true });
    await pause.waitFor();
    await pause.click();
    await page.waitForFunction(() => document.querySelector(".motion-root")?.classList.contains("motion-paused"));
    assert.equal(await page.evaluate(() => localStorage.getItem("4english.motion.paused")), "1");
    assert.equal(await page.locator('[data-motion="pending"]').count(), 0);
    assert.equal(await page.locator(".skill-ribbon-track").evaluate((element) => getComputedStyle(element).animationName), "none");
    await page.reload();
    const resume = page.getByRole("button", { name: "Bật chuyển động", exact: true });
    await resume.waitFor();
    assert.equal(await page.locator(".motion-root.motion-paused").count(), 1);
    await resume.click();
    await page.waitForFunction(() => !document.querySelector(".motion-root")?.classList.contains("motion-paused"));
    assert.equal(await page.evaluate(() => localStorage.getItem("4english.motion.paused")), "0");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await pause.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.querySelector(".motion-root")?.classList.contains("motion-reduced"));
    assert.equal(await page.locator(".prep-hero").evaluate((element) => getComputedStyle(element, "::before").animationName), "none");
  });

  await test("UI46", "Lớp vừa đóng đăng ký khi đang điền form được cảnh báo, không tự đổi thành tư vấn chung", async (make) => {
    const snapshot = read();
    const klass = snapshot.classes.find((item) => item.status === "Mở đăng ký");
    assert(klass, "Cần một lớp mở đăng ký để kiểm tra thay đổi đồng thời");
    const { page } = await make({ width: 390 });
    // Select locally: this catches races that initial-URL validation alone cannot cover.
    await page.locator('[name="courseId"]').selectOption(klass.courseId);
    await page.locator('[name="branchId"]').selectOption(klass.branchId);
    await page.locator('[name="classId"]').selectOption(klass.id);
    await page.locator('[name="name"]').fill("Giữ nội dung khi lịch lớp thay đổi");
    await page.locator('[name="phone"]').fill("0901234567");
    await selectedContext(page, klass);
    const nextPoll = page.waitForResponse((response) => response.url() === url + "/api/state" && response.ok(), { timeout: 12000 });
    reset((db) => {
      // Preserve IDs and relations; Seed.build() generates fresh IDs on each reset.
      Object.assign(db, snapshot);
      db.classes.find((item) => item.id === klass.id).status = "Đang học";
    });
    await nextPoll;
    await page.getByRole("alert").filter({ hasText: "Lớp vừa chọn đã ngừng nhận đăng ký" }).waitFor({ timeout: 12000 });
    assert.equal(await page.locator('[name="classId"]').inputValue(), klass.id);
    assert((await page.locator('[name="classId"] option:checked').innerText()).includes("Lớp đã thay đổi"));
    assert.equal(await page.locator('[name="name"]').inputValue(), "Giữ nội dung khi lịch lớp thay đổi");
    const submit = page.getByRole("button", { name: "Gửi yêu cầu tư vấn", exact: true });
    assert.equal(await submit.isDisabled(), true);
    await page.locator('[name="classId"]').selectOption("");
    assert.equal(await page.locator('[name="classId"]').inputValue(), "");
    assert.equal(await submit.isDisabled(), false);
    assert.equal(read().leads.length, snapshot.leads.length);
  });

  await test("UI47", "Chế độ vận hành ẩn tài khoản/reset demo và giữ cấu hình liên hệ sau đăng nhập", async (make) => {
    const production = createApp({
      dbPath: ":memory:",
      demoMode: false,
      contact: {
        email: "qa@example.test",
        hotline: "024 0000 9999",
        hours: "Giờ đón tiếp kiểm thử",
        zaloUrl: "https://zalo.me/4english-test",
      },
    });
    await new Promise((resolve, reject) => {
      production.server.once("error", reject);
      production.server.listen(0, "127.0.0.1", resolve);
    });
    const origin = `http://127.0.0.1:${production.server.address().port}`;
    let page;
    try {
      ({ page } = await make({ width: 1440 }));
      await page.route("https://www.google.com/**", (request) => request.abort());
      await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /Tự tin mở lời/, level: 1 }).waitFor();
      const footer = page.locator(".prep-footer");
      assert(!(await footer.innerText()).includes("Bản học tập"));
      assert(!(await footer.innerText()).includes("DT06"));
      assert.equal(await footer.locator('a[href="mailto:qa@example.test"]').count(), 1);
      assert.equal(await footer.locator('a[href="tel:02400009999"]').count(), 1);
      assert.equal(await footer.locator('a[href="https://zalo.me/4english-test"]').count(), 1);
      assert((await footer.innerText()).includes("Giờ đón tiếp kiểm thử"));
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index, follow");
      await page.goto(origin + "/dang-nhap");
      await page.locator('[name="u"]').waitFor();
      assert.equal(await page.locator(".demo-accounts").count(), 0);
      await page.locator('[name="u"]').fill("quanly");
      await page.locator('[name="p"]').fill("123456");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await page.locator(".app-sidebar").waitFor();
      assert.equal(await page.getByRole("button", { name: "Khôi phục demo", exact: true }).count(), 0);
      const config = await page.evaluate(async () => (await (await fetch("/api/state")).json()).site);
      assert.equal(config.demoMode, false);
      assert.equal(config.contact.email, "qa@example.test");
      assert.equal(config.contact.hotline, "024 0000 9999");
      await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /Tự tin mở lời/, level: 1 }).waitFor();
      assert(!(await footer.innerText()).includes("Bản học tập"));
      assert.equal(await footer.locator('a[href="mailto:qa@example.test"]').count(), 1);
    } finally {
      // Leave the isolated server before closing it so polling cannot keep it alive.
      if (page) await page.goto(url + "/", { waitUntil: "domcontentloaded" }).catch(() => {});
      await production.close();
    }
  });
}
