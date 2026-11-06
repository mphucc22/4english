import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classDurationMinutes, courseContent } from "../src/lib/course-content.js";

test("CD01: thời lượng lấy từ giờ học thật, không tự gán 90 phút", () => {
  assert.equal(classDurationMinutes({ start: "18:00", end: "19:30" }), 90);
  assert.equal(classDurationMinutes({ start: "08:15", end: "10:20" }), 125);
  assert.equal(classDurationMinutes({ start: "23:00", end: "23:59" }), 59);
  for (const schedule of [
    {}, { start: "18:00", end: "18:00" }, { start: "19:30", end: "18:00" },
    { start: "24:00", end: "25:00" }, { start: "8:00", end: "09:00" },
    { start: "18:60", end: "20:00" }, null,
  ]) assert.equal(classDurationMinutes(schedule), null);
});

test("CD02: bài tải về khớp câu hỏi và giải thích hiển thị của từng chương trình", () => {
  const titles = new Set();
  for (const code of ["KID", "A1", "A2", "B1", "B2", "IELTS"]) {
    const content = courseContent({ code });
    const { activity } = content;
    titles.add(activity.title);
    assert(activity.options.length >= 3);
    assert(Number.isInteger(activity.answer));
    assert(activity.answer >= 0 && activity.answer < activity.options.length);
    const download = readFileSync(resolve("public", content.samplePath.slice(1)), "utf8");
    assert(download.includes(activity.prompt));
    assert(download.includes(activity.options[activity.answer]));
    assert(download.includes(activity.explanation));
    assert(download.includes(activity.extension));
    assert(download.includes("không phải đề thi chính thức"));
  }
  assert.equal(titles.size, 6);
});

test("CD03: khóa chưa có nội dung không bị gán nhầm giáo trình hay bài mẫu của khóa khác", () => {
  for (const code of ["CUSTOM", "constructor", "toString"]) {
    const content = courseContent({ code, desc: "Khóa mới của trung tâm" });
    assert.deepEqual(content.topics, ["Khóa mới của trung tâm"]);
    assert.equal(content.activity, null);
    assert.equal(content.samplePath, "");
    assert.deepEqual(content.objectives, []);
  }
});
