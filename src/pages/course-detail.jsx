import { useEffect, useState } from "react";
import { useStore } from "../store.jsx";
import { PublicPage } from "../public-layout.jsx";
import { Icon } from "../icons.jsx";
import { courseContent, classDurationMinutes } from "../lib/course-content.js";
import { R, CFG } from "../lib/rules.js";
import { by, vnd, dmy } from "../lib/util.js";
import "../course-detail-extra.css";

function PracticeActivity({ content, code }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const activity = content.activity;
  if (!activity) return null;
  return (
    <div className="course-practice-card">
      <form onSubmit={(event) => { event.preventDefault(); setChecked(true); }}>
        <fieldset>
          <legend>{activity.title}</legend>
          <p className="course-practice-prompt" lang="en">{activity.prompt}</p>
          <div className="course-practice-options">
            {activity.options.map((option, index) => (
              <label key={option} className={selected === index ? "selected" : ""}>
                <input
                  type="radio"
                  name={`practice-${code}`}
                  value={index}
                  checked={selected === index}
                  onChange={() => { setSelected(index); setChecked(false); }}
                />
                <span lang="en">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="prep-button" disabled={selected === null}>
          Xem giải thích <Icon name="arrow" size={18} />
        </button>
        {checked && (
          <div className="course-practice-feedback" role="status">
            <strong>{selected === activity.answer ? "Bạn chọn đúng rồi!" : `Đáp án phù hợp: ${activity.options[activity.answer]}`}</strong>
            <p>{activity.explanation}</p>
            <p><b>Luyện thêm:</b> {activity.extension}</p>
          </div>
        )}
      </form>
      <div className="course-practice-download">
        <span className="course-practice-book"><Icon name="book" size={30} /></span>
        <h3>Tiếp tục luyện tập</h3>
        <p>Lưu câu hỏi, giải thích và gợi ý luyện thêm để tự học khi thuận tiện.</p>
        <a className="detail-text-link" href={content.samplePath} download>
          Tải bài luyện tập (.txt) <Icon name="arrow" size={18} />
        </a>
        <small>Bài minh họa để trải nghiệm cách luyện tập; không dùng để chứng nhận trình độ.</small>
      </div>
    </div>
  );
}

export function CourseDetail({ id }) {
  const { db } = useStore();
  const course = db.courses.find((c) => c.id === id);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  if (!course)
    return (
      <PublicPage>
        <section className="prep-section">
          <div className="public-container missing-course">
            <Icon name="search" size={45} />
            <h1>Chưa tìm thấy khóa học</h1>
            <p>
              Chương trình có thể đã thay đổi. Bạn hãy xem các khóa học đang
              được giới thiệu.
            </p>
            <a className="prep-button" href="/khoa-hoc">
              Xem các khóa học
              <Icon name="arrow" size={20} />
            </a>
          </div>
        </section>
      </PublicPage>
    );
  const content = courseContent(course);
  const classes = db.classes.filter(
    (c) => c.courseId === course.id && c.status === "Mở đăng ký",
  );
  const consult = `/tu-van/${encodeURIComponent(course.id)}`;
  const durations = [...new Set(classes.map(classDurationMinutes).filter(Boolean))];
  return (
    <PublicPage>
      <section className="course-detail-hero">
        <div className="public-container">
          <nav className="public-breadcrumb" aria-label="Đường dẫn trang">
            <a href="/">Trang chủ</a>
            <span>/</span>
            <a href="/khoa-hoc">Khóa học</a>
            <span>/</span>
            <span aria-current="page">{course.code}</span>
          </nav>
          <div className="course-detail-grid">
            <div>
              <span className="hero-label">CHƯƠNG TRÌNH {course.code}</span>
              <h1>{course.name}</h1>
              <p>{course.desc}</p>
              <div className="detail-quick-facts">
                <span>
                  <Icon name="timetable" size={19} />
                  {course.sessions} buổi học
                </span>
                <span>
                  <Icon name="staff" size={19} />
                  Tối đa {CFG.maxStudents} học viên/lớp
                </span>
              </div>
              <a className="prep-button" href={consult}>
                Nhận tư vấn khóa học
                <Icon name="arrow" size={20} />
              </a>
            </div>
            <aside className="course-summary">
              <span className="section-kicker">THÔNG TIN KHÓA HỌC</span>
              <small>Học phí trọn khóa</small>
              <strong>{vnd(course.fee)}</strong>
              <dl>
                <div>
                  <dt>Số buổi</dt>
                  <dd>{course.sessions} buổi</dd>
                </div>
                <div>
                  <dt>Xác nhận chỗ</dt>
                  <dd>Từ {CFG.minPaidPct * 100}% học phí</dd>
                </div>
                <div>
                  <dt>Lớp đang mở đăng ký</dt>
                  <dd>{classes.length} lớp</dd>
                </div>
                <div>
                  <dt>Thời lượng mỗi buổi</dt>
                  <dd>{durations.length === 1 ? `${durations[0]} phút` : "Theo lịch từng lớp"}</dd>
                </div>
              </dl>
              <p>
                Lịch học và cơ sở được xác nhận theo lớp bạn chọn. Trung tâm tư
                vấn trước khi ghi danh.
              </p>
              <a className="detail-text-link" href="/kiem-tra-dau-vao">
                Chưa rõ trình độ? Làm bài kiểm tra
                <Icon name="arrow" size={18} />
              </a>
            </aside>
          </div>
        </div>
      </section>
      <section className="prep-section">
        <div className="public-container detail-content-grid">
          <div>
            <p className="section-kicker">KHÓA HỌC NÀY DÀNH CHO AI?</p>
            <h2>Bắt đầu từ sự phù hợp.</h2>
            <p>{content.audience}</p>
            <div className="course-entry-note">
              <Icon name="attendance" size={23} />
              <div><h3>Trước khi chọn lớp</h3><p>{content.entry}</p></div>
            </div>
            {!!content.objectives.length && (
              <div className="course-objectives">
                <h3>Mục tiêu luyện tập</h3>
                <ul>{content.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
              </div>
            )}
          </div>
          <div>
            <p className="section-kicker">NỘI DUNG ĐỊNH HƯỚNG</p>
            <h2>Bạn sẽ học gì?</h2>
            <ul className="detail-topics">
              {content.topics.map((topic) => (
                <li key={topic}>
                  <Icon name="check" size={21} />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
            <p className="detail-note">
              Nội dung chi tiết được trung tâm tư vấn theo chương trình và lớp
              học thực tế.
            </p>
          </div>
        </div>
      </section>
      {!!content.outline.length && (
        <section className="prep-section course-learning-section">
          <div className="public-container">
            <div className="new-section-heading">
              <div>
                <p className="section-kicker">TỪ NỀN TẢNG ĐẾN THỰC HÀNH</p>
                <h2>Một lộ trình dễ theo dõi.</h2>
                <p className="section-description">Các nhóm nội dung giúp bạn hình dung hướng luyện tập của chương trình.</p>
              </div>
            </div>
            <ol className="course-learning-outline">
              {content.outline.map(([title, description], index) => (
                <li key={title}>
                  <span className="course-outline-number">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3><p>{description}</p>
                </li>
              ))}
            </ol>
            <div className="course-material-note">
              <Icon name="book" size={23} />
              <p><b>Giáo trình và kế hoạch học:</b> Tư vấn viên sẽ xác nhận tài liệu đang sử dụng và nội dung của lớp cụ thể trước khi ghi danh. Mục tiêu trên là định hướng luyện tập, không phải cam kết điểm thi hay chứng chỉ.</p>
            </div>
          </div>
        </section>
      )}
      {content.activity && (
        <section className="prep-section course-sample-section">
          <div className="public-container">
            <div className="new-section-heading">
              <div>
                <p className="section-kicker">THỬ MỘT HOẠT ĐỘNG NHỎ</p>
                <h2>Làm thử, hiểu cách học.</h2>
                <p className="section-description">Chọn một câu trả lời, xem giải thích rồi thử gợi ý luyện thêm.</p>
              </div>
            </div>
            <PracticeActivity key={course.id} content={content} code={course.code} />
          </div>
        </section>
      )}
      <section className="prep-section detail-classes">
        <div className="public-container">
          <div className="new-section-heading">
            <div>
              <p className="section-kicker">LỊCH KHAI GIẢNG</p>
              <h2>Các lớp đang nhận đăng ký</h2>
              <p className="section-description">
                Chọn lịch phù hợp rồi liên hệ 4ENGLISH để được hướng dẫn ghi danh.
              </p>
            </div>
          </div>
          <div className="open-class-list">
            {classes.map((c) => (
              <article className="open-class" key={c.id}>
                <div className="class-date">
                  <Icon name="timetable" size={24} />
                  <span>{dmy(c.startDate)}</span>
                  <small>Khai giảng</small>
                </div>
                <div className="class-information">
                  <span className="class-code">{c.code}</span>
                  <h3><a href={`/co-so/${encodeURIComponent(c.branchId)}`}>{by(db, "branches", c.branchId).name}</a></h3>
                  <div>
                    <span>
                      <Icon name="clock" size={16} />
                      {R.scheduleText(c)}
                    </span>
                    {classDurationMinutes(c) && <span>{classDurationMinutes(c)} phút/buổi</span>}
                  </div>
                </div>
                <div className="class-fee">
                  <small>Học phí trọn khóa</small>
                  <strong>{vnd(course.fee)}</strong>
                </div>
                <a className="class-cta" href={`${consult}?${new URLSearchParams({ branch: c.branchId, class: c.id })}`}>
                  Nhận tư vấn
                  <Icon name="arrow" size={18} />
                </a>
              </article>
            ))}
          </div>
          {!classes.length && (
            <div className="detail-empty">
              <Icon name="timetable" size={32} />
              <h3>Chưa có lớp đang nhận đăng ký</h3>
              <p>
                Để lại thông tin để 4ENGLISH tư vấn chương trình và đợt khai giảng
                phù hợp.
              </p>
              <a className="prep-button" href={consult}>
                Nhận tư vấn
                <Icon name="arrow" size={20} />
              </a>
            </div>
          )}
        </div>
      </section>
    </PublicPage>
  );
}
