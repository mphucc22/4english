import test from "node:test";
import assert from "node:assert/strict";
import {
  PLACEMENT_QUESTIONS,
  scorePlacement,
  recommendCourse,
} from "../src/lib/placement.js";
import { Seed } from "../src/lib/seed.js";
import { visibleData } from "../server/services/actions.js";

const courses = Seed.minimal().courses;
test("PL01: bài thử có đủ 10 câu, các đáp án hợp lệ và có giải thích", () => {
  assert.equal(PLACEMENT_QUESTIONS.length, 10);
  for (const q of PLACEMENT_QUESTIONS) {
    assert(q.text && q.explanation);
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert(q.answer >= 0 && q.answer < q.options.length);
  }
});
test("PL02: chấm đúng cả điểm tối đa và điểm 0", () => {
  assert.equal(scorePlacement(PLACEMENT_QUESTIONS.map((q) => q.answer)), 10);
  assert.equal(
    scorePlacement(PLACEMENT_QUESTIONS.map((q) => (q.answer + 1) % 4)),
    0,
  );
});
test("PL03: từ chối bài chưa đủ câu hoặc đáp án không hợp lệ", () => {
  for (const answers of [
    null,
    [],
    Array(10).fill(null),
    Array(10).fill(-1),
    Array(10).fill(4),
    Array(10).fill("1"),
    Array(10).fill(1.5),
  ])
    assert.throws(() => scorePlacement(answers));
});
test("PL04: các ngưỡng gợi ý chương trình giao tiếp chính xác", () => {
  for (const [score, code] of [
    [0, "A1"],
    [3, "A1"],
    [4, "A2"],
    [6, "A2"],
    [7, "B1"],
    [8, "B1"],
    [9, "B2"],
    [10, "B2"],
  ])
    assert.equal(recommendCourse(courses, score).code, code);
});
test("PL05: mục tiêu IELTS gợi ý nền tảng trước ngưỡng và IELTS khi đủ điểm bài thử", () => {
  assert.equal(recommendCourse(courses, 6, "ielts").code, "A2");
  assert.equal(recommendCourse(courses, 7, "ielts").code, "IELTS");
});
test("PL06: không gợi ý khóa đã gỡ hoặc khóa thiếu nhi khi danh sách trống", () => {
  assert.equal(recommendCourse([], 8), null);
  assert.equal(
    recommendCourse(
      courses.filter((c) => c.code === "KID"),
      0,
    ),
    null,
  );
  assert.equal(
    recommendCourse(
      courses.filter((c) => c.code !== "B2"),
      10,
    ),
    null,
  );
});
test("PL07: từ chối điểm và mục tiêu ngoài phạm vi", () => {
  for (const score of [-1, 11, 0.5, NaN])
    assert.throws(() => recommendCourse(courses, score));
  assert.throws(() => recommendCourse(courses, 5, "unknown"));
});
test("PL08: giới thiệu công khai chỉ có giảng viên đang dạy và không lộ thông tin liên hệ", () => {
  const db = Seed.minimal();
  db.teachers[0].status = "Nghỉ";
  const visible = visibleData(db, null);
  assert.equal(visible.teachers.length, db.teachers.length - 1);
  assert(!visible.teachers.some((t) => t.id === db.teachers[0].id));
  for (const teacher of visible.teachers)
    assert.deepEqual(Object.keys(teacher).sort(), ["id", "name", "specialty"]);
  assert.equal(
    visibleData(db, { role: "manager" }).teachers.length,
    db.teachers.length,
  );
});
