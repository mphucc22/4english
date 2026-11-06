import { useState } from "react";
import { useStore } from "../store.jsx";
import { Icon } from "../icons.jsx";
import { PublicPage } from "../public-layout.jsx";
import {
  PLACEMENT_QUESTIONS,
  scorePlacement,
  recommendCourse,
} from "../lib/placement.js";
import { vnd } from "../lib/util.js";

export function Placement() {
  const { db } = useStore();
  const [started, setStarted] = useState(false),
    [finished, setFinished] = useState(false),
    [index, setIndex] = useState(0),
    [goal, setGoal] = useState("general"),
    [answers, setAnswers] = useState(
      Array(PLACEMENT_QUESTIONS.length).fill(null),
    );
  const question = PLACEMENT_QUESTIONS[index];
  const score = finished ? scorePlacement(answers) : 0;
  const recommended = finished
    ? recommendCourse(db.courses, score, goal)
    : null;
  const completed = answers.filter((answer) => answer !== null).length;
  const scroll = () =>
    requestAnimationFrame(() =>
      document
        .querySelector(
          ".placement-intro, .placement-quiz, .placement-result-summary",
        )
        ?.scrollIntoView({ block: "start" }),
    );
  const restart = () => {
    setAnswers(Array(PLACEMENT_QUESTIONS.length).fill(null));
    setIndex(0);
    setFinished(false);
    setStarted(false);
    scroll();
  };
  return (
    <PublicPage>
      <section className="prep-section placement-section">
        <div className="public-container placement-container">
          <a className="public-back" href="#/">
            <Icon name="arrow-left" size={19} />
            Về trang chủ
          </a>
          {!started ? (
            <div className="placement-intro">
              <span className="placement-emblem">
                <Icon name="attendance" size={35} />
              </span>
              <p className="section-kicker">HIỂU ĐIỂM BẮT ĐẦU CỦA BẠN</p>
              <h1 id="placement-heading">Kiểm tra đầu vào ngắn</h1>
              <p>
                Thử sức với 10 câu hỏi ngữ pháp và từ vựng để tham khảo chương
                trình phù hợp tại 4ENGLISH.
              </p>
              <div className="placement-facts">
                <span>
                  <Icon name="book" size={19} />
                  10 câu trắc nghiệm
                </span>
                <span>
                  <Icon name="clock" size={19} />
                  Khoảng 5–10 phút
                </span>
                <span>
                  <Icon name="check" size={19} />
                  Xem đáp án và giải thích
                </span>
              </div>
              <fieldset className="placement-goal">
                <legend>Mục tiêu bạn quan tâm</legend>
                {[
                  ["general", "Nền tảng & giao tiếp"],
                  ["ielts", "Luyện thi IELTS"],
                ].map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="learningGoal"
                      value={value}
                      checked={goal === value}
                      onChange={() => setGoal(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                className="prep-button"
                onClick={() => {
                  setStarted(true);
                  scroll();
                }}
              >
                Bắt đầu kiểm tra
                <Icon name="arrow" size={21} />
              </button>
              <p className="placement-disclaimer">
                Kết quả chỉ mang tính tham khảo. Bài thử không đánh giá đầy đủ
                nghe, nói, viết và không quy đổi thành chứng chỉ hay điểm IELTS.
              </p>
            </div>
          ) : !finished ? (
            <div className="placement-quiz">
              <div className="quiz-progress-label">
                <span>
                  Câu {index + 1}/{PLACEMENT_QUESTIONS.length}
                </span>
                <span>{completed} câu đã trả lời</span>
              </div>
              <progress
                aria-label="Tiến độ trả lời"
                value={completed}
                max={PLACEMENT_QUESTIONS.length}
              />
              <h1 id="placement-heading">Chọn đáp án phù hợp</h1>
              <fieldset className="quiz-question">
                <legend>{question.text}</legend>
                <div className="quiz-options">
                  {question.options.map((option, i) => (
                    <label
                      key={i}
                      className={answers[index] === i ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={i}
                        checked={answers[index] === i}
                        onChange={() =>
                          setAnswers((old) =>
                            old.map((answer, k) => (k === index ? i : answer)),
                          )
                        }
                      />
                      <span className="quiz-option-letter" aria-hidden="true">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{option}</span>
                      <Icon name="check" size={19} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="quiz-help" aria-live="polite">
                {answers[index] === null
                  ? "Chọn một đáp án để tiếp tục."
                  : "Bạn có thể quay lại để kiểm tra hoặc đổi đáp án."}
              </p>
              <div className="quiz-actions">
                <button
                  type="button"
                  className="quiz-back"
                  disabled={index === 0}
                  onClick={() => {
                    setIndex(index - 1);
                    scroll();
                  }}
                >
                  <Icon name="arrow-left" size={19} />
                  Câu trước
                </button>
                <button
                  type="button"
                  className="prep-button"
                  disabled={answers[index] === null}
                  onClick={() => {
                    if (index === PLACEMENT_QUESTIONS.length - 1)
                      setFinished(true);
                    else setIndex(index + 1);
                    scroll();
                  }}
                >
                  {index === PLACEMENT_QUESTIONS.length - 1
                    ? "Xem kết quả"
                    : "Câu tiếp theo"}
                  <Icon name="arrow" size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="placement-results">
              <div className="placement-result-summary">
                <p className="section-kicker">BẠN ĐÃ HOÀN THÀNH BÀI THỬ</p>
                <h1 id="placement-heading">Kết quả bài kiểm tra</h1>
                <div className="placement-score">
                  <strong>{score}</strong>
                  <span>/ {PLACEMENT_QUESTIONS.length}</span>
                </div>
                <p>
                  Bạn trả lời đúng {score}/{PLACEMENT_QUESTIONS.length} câu hỏi.
                </p>
                <p className="placement-disclaimer">
                  Đây là kết quả tham khảo về ngữ pháp và từ vựng, chưa xác định
                  đầy đủ trình độ tiếng Anh. Hãy trao đổi với 4ENGLISH trước khi chọn
                  lớp.
                </p>
              </div>
              <div className="placement-recommendation">
                <span className="section-kicker">
                  CHƯƠNG TRÌNH NÊN THAM KHẢO
                </span>
                {recommended ? (
                  <>
                    <h2>{recommended.name}</h2>
                    <p>{recommended.desc}</p>
                    <span className="recommendation-meta">
                      {recommended.sessions} buổi · {vnd(recommended.fee)}
                    </span>
                    <div className="result-actions">
                      <a
                        className="prep-button"
                        href={`/khoa-hoc/${encodeURIComponent(recommended.id)}`}
                      >
                        Xem khóa được gợi ý<Icon name="arrow" size={19} />
                      </a>
                      <a
                        className="detail-text-link"
                        href={`/tu-van/${encodeURIComponent(recommended.id)}`}
                      >
                        Nhận tư vấn khóa học
                        <Icon name="leads" size={18} />
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>4ENGLISH sẽ tư vấn thêm cho bạn</h2>
                    <p>
                      Hiện chưa có chương trình phù hợp trong danh sách đang
                      giới thiệu. Để lại mục tiêu học tập để được hướng dẫn.
                    </p>
                    <a className="prep-button" href="/tu-van">
                      Nhận tư vấn
                      <Icon name="arrow" size={19} />
                    </a>
                  </>
                )}
              </div>
              <details className="quiz-review">
                <summary>
                  Xem đáp án và giải thích
                  <Icon name="chevron" size={19} />
                </summary>
                {PLACEMENT_QUESTIONS.map((q, i) => (
                  <article key={q.text}>
                    <h3>
                      Câu {i + 1}. {q.text}
                    </h3>
                    <p
                      className={
                        answers[i] === q.answer
                          ? "answer-correct"
                          : "answer-incorrect"
                      }
                    >
                      Bạn chọn: {q.options[answers[i]]} ·{" "}
                      {answers[i] === q.answer ? "Đúng" : "Chưa đúng"}
                    </p>
                    <p>
                      <b>Đáp án đúng:</b> {q.options[q.answer]}
                    </p>
                    <p>{q.explanation}</p>
                  </article>
                ))}
              </details>
              <button type="button" className="quiz-restart" onClick={restart}>
                <Icon name="refresh" size={18} />
                Làm lại bài kiểm tra
              </button>
            </div>
          )}
        </div>
      </section>
    </PublicPage>
  );
}
