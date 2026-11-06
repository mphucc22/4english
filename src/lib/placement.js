export const PLACEMENT_QUESTIONS = [
  {
    text: "She ___ a student.",
    options: ["am", "is", "are", "be"],
    answer: 1,
    explanation: "Chủ ngữ She đi với is ở thì hiện tại đơn.",
  },
  {
    text: "We have an English class ___ Monday.",
    options: ["in", "at", "on", "to"],
    answer: 2,
    explanation: "Dùng on trước các ngày trong tuần.",
  },
  {
    text: "There aren't ___ apples in the fridge.",
    options: ["some", "any", "much", "a"],
    answer: 1,
    explanation:
      "Any thường được dùng với danh từ số nhiều trong câu phủ định.",
  },
  {
    text: "I ___ TV when the phone rang.",
    options: ["watch", "am watching", "was watching", "have watched"],
    answer: 2,
    explanation:
      "Hành động đang diễn ra trong quá khứ dùng quá khứ tiếp diễn: was watching.",
  },
  {
    text: "If it rains tomorrow, we ___ at home.",
    options: ["would stay", "stayed", "have stayed", "will stay"],
    answer: 3,
    explanation:
      "Câu điều kiện loại 1 dùng If + hiện tại đơn, will + động từ nguyên mẫu.",
  },
  {
    text: "Could you tell me where ___?",
    options: [
      "is the station",
      "the station is",
      "does the station",
      "the station does",
    ],
    answer: 1,
    explanation:
      "Trong câu hỏi gián tiếp, dùng trật tự chủ ngữ trước động từ: the station is.",
  },
  {
    text: "This book is ___ than that one.",
    options: [
      "more interesting",
      "most interesting",
      "interest",
      "the interesting",
    ],
    answer: 0,
    explanation:
      "Interesting là tính từ dài; dạng so sánh hơn là more interesting.",
  },
  {
    text: "She ___ here since 2022.",
    options: ["lives", "is living", "has lived", "will live"],
    answer: 2,
    explanation:
      "Since chỉ mốc bắt đầu; dùng hiện tại hoàn thành cho sự việc tiếp tục đến hiện tại.",
  },
  {
    text: "If I ___ more free time, I would learn another language.",
    options: ["have", "had", "will have", "am having"],
    answer: 1,
    explanation:
      "Câu điều kiện loại 2 dùng If + quá khứ đơn, would + động từ nguyên mẫu.",
  },
  {
    text: "The report ___ before the meeting started yesterday.",
    options: [
      "has finished",
      "will finish",
      "is finishing",
      "had been finished",
    ],
    answer: 3,
    explanation:
      "Báo cáo được hoàn thành trước một thời điểm quá khứ: dùng bị động quá khứ hoàn thành had been finished.",
  },
];

export function scorePlacement(answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== PLACEMENT_QUESTIONS.length ||
    answers.some(
      (answer, index) =>
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer >= PLACEMENT_QUESTIONS[index].options.length,
    )
  ) {
    throw Error("Hãy trả lời đủ các câu hỏi trước khi xem kết quả.");
  }
  return answers.reduce(
    (score, answer, i) =>
      score + Number(answer === PLACEMENT_QUESTIONS[i].answer),
    0,
  );
}

export function recommendCourse(courses, score, goal = "general") {
  if (
    !Number.isInteger(score) ||
    score < 0 ||
    score > PLACEMENT_QUESTIONS.length ||
    !["general", "ielts"].includes(goal)
  )
    throw Error("Kết quả bài kiểm tra không hợp lệ.");
  const target =
    goal === "ielts" && score >= 7
      ? "IELTS"
      : score <= 3
        ? "A1"
        : score <= 6
          ? "A2"
          : score <= 8
            ? "B1"
            : "B2";
  const available = courses.filter(
    (c) => String(c.code).toUpperCase() !== "KID",
  );
  return available.find((c) => String(c.code).toUpperCase() === target) || null;
}
