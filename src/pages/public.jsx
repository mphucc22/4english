import { useEffect, useState } from "react";
import { useStore } from "../store.jsx";
import { Btn, Fld, In, Empty } from "../ui.jsx";
import { Icon, Brand } from "../icons.jsx";
import { R, CFG } from "../lib/rules.js";
import { by, vnd, dmy } from "../lib/util.js";
import { PublicHeader, PublicFooter } from "../public-layout.jsx";
import { MotionText, SkillRibbon } from "../components/motion-content.jsx";
import { LeadForm } from "../components/lead-form.jsx";
import { BranchMap } from "../components/branch-map.jsx";
import { consultHref, phoneHref } from "../lib/branch-public.js";

const GROUPS = [
  ["all", "Tất cả khóa học"],
  ["general", "Tiếng Anh giao tiếp"],
  ["ielts", "Luyện thi IELTS"],
  ["kids", "Tiếng Anh thiếu nhi"],
];
const groupOf = (c) =>
  /ielts/i.test(`${c.code} ${c.name}`)
    ? "ielts"
    : /kid|thiếu nhi/i.test(`${c.code} ${c.name}`)
      ? "kids"
      : "general";

function scrollToSection(id) {
  const reduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches || document.querySelector(".motion-root")?.classList.contains("motion-paused");
  document.getElementById(id)?.scrollIntoView({
    behavior: reduced ? "instant" : "smooth",
    block: "start",
  });
}

function LearningArt({ courses, branches }) {
  return (
    <div className="learning-art" data-parallax="hero">
      <div className="learning-orbit" aria-hidden="true">
        <span className="orbit-dot orbit-dot-one" />
        <span className="orbit-dot orbit-dot-two" />
      </div>
      <span className="art-spark art-spark-one" aria-hidden="true">
        ✦
      </span>
      <span className="art-spark art-spark-two" aria-hidden="true">
        ✧
      </span>
      <div className="learning-photo">
        <img
          src="/images/4english-study-space-1448.webp"
          srcSet="/images/4english-study-space-480.webp 480w, /images/4english-study-space-768.webp 768w, /images/4english-study-space-1448.webp 1448w"
          sizes="(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 560px"
          alt="Góc học tiếng Anh 4ENGLISH với máy tính, sách, tai nghe và thẻ từ vựng trong không gian sáng, không có người"
          width="1448"
          height="1086"
          fetchPriority="high"
        />
      </div>
      <div className="art-note art-note-top">
        <span className="art-note-icon">
          <Icon name="check" size={19} />
        </span>
        <span>
          Lộ trình rõ ràng<b>Học đúng trình độ của bạn</b>
        </span>
      </div>
      <div className="art-note art-note-bottom">
        <span className="art-note-icon violet">
          <Icon name="students" size={25} />
        </span>
        <span>
          <b>{courses} chương trình</b>Khám phá tại {branches} cơ sở 4ENGLISH
        </span>
        <Icon name="arrow" size={21} />
      </div>
      <span className="art-word art-word-hello" aria-hidden="true">
        Hello!
      </span>
      <div className="art-audio-card" aria-hidden="true">
        <span className="art-audio-icon"><Icon name="chat" size={20} /></span>
        <div>
          <span className="art-audio-label">SPEAK WITH CONFIDENCE</span>
          <span className="art-audio-wave">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} style={{ "--bar-index": index }} />
            ))}
          </span>
        </div>
      </div>
      <span className="art-word art-word-future" aria-hidden="true">
        Your future starts here.
      </span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
  children,
}) {
  return (
    <div className={`new-section-heading ${center ? "heading-center" : ""}`}>
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2>{typeof title === "string" ? <MotionText text={title} /> : title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Landing({ initialCourseId = "", initialBranchId = "", initialClassId = "", initialSection = "" }) {
  const { db } = useStore();
  const [group, setGroup] = useState("all"),
    [query, setQuery] = useState(""),
    [branch, setBranch] = useState(""),
    [selection, setSelection] = useState({ courseId: initialCourseId, branchId: initialBranchId, classId: initialClassId });
  const teachers = (db.teachers || []).filter(
    (teacher) => !teacher.status || teacher.status === "Đang dạy",
  );
  const courses = db.courses.filter(
    (c) =>
      (group === "all" || groupOf(c) === group) &&
      `${c.name} ${c.code} ${c.desc}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi").trim()),
  );
  const open = db.classes.filter(
    (c) => c.status === "Mở đăng ký" && (!branch || c.branchId === branch),
  );
  const jump = (id) => (e) => {
    e.preventDefault();
    scrollToSection(id);
  };
  const consult = (id, branchId = "", classId = "") => (e) => {
    setSelection({ courseId: id, branchId, classId });
    jump("tu-van")(e);
  };
  const validInitialCourse = db.courses.some((c) => c.id === initialCourseId)
    ? initialCourseId
    : "";
  useEffect(() => {
    const chosenClass = db.classes.find((item) => item.id === initialClassId && item.status === "Mở đăng ký" &&
      (!initialCourseId || item.courseId === initialCourseId) && (!initialBranchId || item.branchId === initialBranchId));
    setSelection({
      courseId: chosenClass?.courseId || validInitialCourse,
      branchId: chosenClass?.branchId || (db.branches.some((item) => item.id === initialBranchId) ? initialBranchId : db.branches.length === 1 ? db.branches[0].id : ""),
      classId: chosenClass?.id || "",
    });
    if (!initialSection) return;
    const frame = requestAnimationFrame(() => scrollToSection(initialSection));
    return () => cancelAnimationFrame(frame);
  }, [validInitialCourse, initialCourseId, initialBranchId, initialClassId, initialSection]);
  return (
    <div className="prep-site">
      <PublicHeader onNavigate={jump} />
      <main id="noi-dung" tabIndex={-1}>
        <section className="prep-hero">
          <div className="public-container prep-hero-grid">
            <div className="prep-hero-copy">
              <span className="hero-label">
                <span />
                HỌC TỰ TIN, VƯƠN XA HƠN
              </span>
              <h1 className="motion-hero-title" aria-label="Tự tin mở lời. Mở rộng tương lai.">
                <MotionText text="Tự tin mở lời." className="hero-title-line hero-title-main" />
                <br />
                <MotionText text="Mở rộng tương lai." startIndex={4} className="hero-title-line hero-title-accent" />
              </h1>
              <p className="prep-hero-description">
                Mỗi mục tiêu, một lộ trình. Khám phá chương trình tiếng Anh phù
                hợp với trình độ, lịch học và hành trình của riêng bạn.
              </p>
              <div className="prep-hero-actions">
                <a
                  className="prep-button"
                  href="#khoa-hoc"
                  onClick={jump("khoa-hoc")}
                >
                  Khám phá khóa học
                  <Icon name="arrow" size={21} />
                </a>
                <a className="hero-secondary" href="/kiem-tra-dau-vao">
                  <span>
                    <Icon name="attendance" size={19} />
                  </span>
                  Thử kiểm tra đầu vào
                </a>
              </div>
              <div className="hero-footnote">
                <Icon name="check" size={16} />
                Đúng trình độ
                <span />
                Rõ học phí
                <span />
                Chủ động lịch học
              </div>
            </div>
            <LearningArt
              courses={db.courses.length}
              branches={db.branches.length}
            />
          </div>
          <div className="public-container">
            <div className="prep-facts">
              <p>
                Một hành trình học tốt
                <br />
                <b>bắt đầu từ sự phù hợp.</b>
              </p>
              {[
                [
                  String(db.branches.length).padStart(2, "0"),
                  "Cơ sở tại Hà Nội",
                  "pin",
                ],
                [
                  String(db.courses.length).padStart(2, "0"),
                  "Chương trình đào tạo",
                  "book",
                ],
                [CFG.maxStudents, "Học viên tối đa mỗi lớp", "staff"],
              ].map(([number, label, icon]) => (
                <div className="prep-fact" key={label}>
                  <Icon name={icon} size={25} />
                  <span>
                    <b>{number}</b>
                    <small>{label}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <SkillRibbon />
        <section id="khoa-hoc" className="prep-section">
          <div className="public-container">
            <SectionHeading
              eyebrow="CHỌN ĐÚNG ĐIỂM BẮT ĐẦU"
              title={
                <>
                  <MotionText text="Một mục tiêu của bạn." />
                  <br />
                  <span><MotionText text="Một lộ trình tại 4ENGLISH." startIndex={5} /></span>
                </>
              }
              description="Từ những câu giao tiếp đầu tiên đến mục tiêu IELTS. Tìm chương trình để bắt đầu hành trình của mình."
            >
              <a
                className="section-link"
                href="#tu-van"
                onClick={jump("tu-van")}
              >
                Chưa biết chọn khóa nào?
                <Icon name="arrow" size={19} />
              </a>
            </SectionHeading>
            {db.courses.length ? (
              <>
                <div className="course-toolbar">
                  <div
                    className="course-tabs"
                    role="group"
                    aria-label="Lọc chương trình đào tạo"
                  >
                    {GROUPS.map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        aria-pressed={group === id}
                        onClick={() => setGroup(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="course-search">
                    <Icon name="search" size={18} />
                    <input
                      aria-label="Tìm khóa học"
                      placeholder="Tìm khóa học…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <p className="visually-hidden" role="status">
                  Tìm thấy {courses.length} khóa học
                </p>
                <div className="prep-course-grid">
                  {courses.map((c) => {
                    const kind = groupOf(c);
                    return (
                      <article
                        className={`course-card prep-course-card course-${kind}`}
                        key={c.id}
                      >
                        <div className="course-art" aria-hidden="true">
                          <span className="course-art-word">{c.code}</span>
                          <span className="course-art-orbit" />
                          <div className="course-art-icon">
                            <Icon
                              name={
                                kind === "kids"
                                  ? "sparkles"
                                  : kind === "ielts"
                                    ? "globe"
                                    : "chat"
                              }
                              size={62}
                            />
                          </div>
                          <span className="course-art-tag">
                            {kind === "kids"
                              ? "LEARN & PLAY"
                              : kind === "ielts"
                                ? "READY FOR YOUR GOAL"
                                : "SPEAK YOUR WORLD"}
                          </span>
                          <span className="course-art-star">✦</span>
                        </div>
                        <div className="course-content">
                          <div className="course-meta">
                            <span>
                              {kind === "kids"
                                ? "Tiếng Anh thiếu nhi"
                                : kind === "ielts"
                                  ? "Luyện thi chứng chỉ"
                                  : "Tiếng Anh nền tảng & giao tiếp"}
                            </span>
                            <span>{c.sessions} buổi</span>
                          </div>
                          <h3>{c.name}</h3>
                          <p>{c.desc}</p>
                          <div className="course-bottom">
                            <div>
                              <small>Học phí trọn khóa</small>
                              <strong>{vnd(c.fee)}</strong>
                            </div>
                            <div className="course-card-actions">
                              <a
                                className="course-detail-button"
                                href={`/khoa-hoc/${encodeURIComponent(c.id)}`}
                                aria-label={`Xem chi tiết ${c.name}`}
                              >
                                Xem chi tiết
                                <Icon name="arrow" size={17} />
                              </a>
                              <a
                                className="course-consult-button"
                                href="#tu-van"
                                onClick={consult(c.id)}
                                aria-label={`Nhận tư vấn ${c.name}`}
                              >
                                Nhận tư vấn
                              </a>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {!courses.length && (
                  <div className="course-empty">
                    <Icon name="search" size={30} />
                    <h3>Chưa tìm thấy khóa học phù hợp</h3>
                    <p>Thử từ khóa khác hoặc xem lại tất cả chương trình.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setGroup("all");
                        setQuery("");
                      }}
                    >
                      Xem tất cả khóa học
                      <Icon name="arrow" size={17} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Empty>Chương trình đào tạo đang được cập nhật.</Empty>
            )}
          </div>
        </section>
        <section id="lo-trinh" className="prep-section journey-section">
          <div className="public-container">
            <SectionHeading
              center
              eyebrow="ĐỒNG HÀNH TRÊN TỪNG BƯỚC TIẾN"
              title={
                <>
                  <MotionText text="Học có định hướng." />
                  <br />
                  <span><MotionText text="Tiến bộ có hành trình." startIndex={4} /></span>
                </>
              }
              description="Không cần bắt đầu thật giỏi. Chỉ cần bắt đầu từ lộ trình phù hợp với bạn."
            />
            <div className="journey-layout">
              <div className="journey-image">
                <img
                  src="/images/4english-learning-journey-1536.webp"
                  srcSet="/images/4english-learning-journey-480.webp 480w, /images/4english-learning-journey-768.webp 768w, /images/4english-learning-journey-1536.webp 1536w"
                  sizes="(max-width: 640px) 90vw, 540px"
                  alt="Sách luyện tiếng Anh, sổ 4ENGLISH và thẻ từ vựng trên bàn học, không có người"
                  width="1536"
                  height="1024"
                  loading="lazy"
                  decoding="async"
                />
                <div className="journey-image-card">
                  <span>
                    <Icon name="students" size={25} />
                  </span>
                  <div>
                    <strong>Một lộ trình, từng bước tiến.</strong>
                    <small>Mỗi buổi học, một bước tiến mới.</small>
                  </div>
                </div>
              </div>
              <div className="journey-steps">
                {[
                  [
                    "01",
                    "Hiểu bạn, trước khi bắt đầu",
                    "Chia sẻ trình độ, mục tiêu và quỹ thời gian. 4ENGLISH tư vấn chương trình vừa sức để bạn có một khởi đầu rõ ràng.",
                  ],
                  [
                    "02",
                    "Chọn lớp vừa vặn với cuộc sống",
                    "Xem cơ sở, ngày khai giảng, khung giờ và học phí. Chọn lịch học bạn có thể theo đuổi đều đặn.",
                  ],
                  [
                    "03",
                    "Từng buổi học, gần hơn với mục tiêu",
                    `Học cùng lớp tối đa ${CFG.maxStudents} học viên. Khi lịch cá nhân thay đổi, liên hệ trung tâm để được hướng dẫn học bù, chuyển lớp hoặc bảo lưu theo điều kiện.`,
                  ],
                ].map(([number, title, text]) => (
                  <div className="journey-step" key={number}>
                    <span>{number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
                <a
                  className="section-link"
                  href="#tu-van"
                  onClick={jump("tu-van")}
                >
                  Tìm lộ trình của tôi
                  <Icon name="arrow" size={19} />
                </a>
              </div>
            </div>
          </div>
        </section>
        <section id="giang-vien" className="prep-section teacher-section">
          <div className="public-container">
            <SectionHeading
              eyebrow="ĐỘI NGŨ 4ENGLISH"
              title={
                <>
                  <MotionText text="Gặp người đồng hành" />
                  <br />
                  <span><MotionText text="trên hành trình của bạn." startIndex={4} /></span>
                </>
              }
              description="Tìm hiểu giảng viên và lĩnh vực chuyên môn tại trung tâm."
            />
            <div className="teacher-grid">
              {teachers.map((teacher, i) => (
                <article
                  className={`teacher-card teacher-tone-${i % 3}`}
                  key={teacher.id}
                >
                  <div className="teacher-avatar" aria-hidden="true">
                    {teacher.name
                      .trim()
                      .split(/\s+/)
                      .slice(-2)
                      .map((part) => part[0])
                      .join("") || "GV"}
                  </div>
                  <span className="teacher-role">GIẢNG VIÊN 4ENGLISH</span>
                  <h3>{teacher.name}</h3>
                  <p>
                    Chuyên môn: <b>{teacher.specialty || "Tiếng Anh"}</b>
                  </p>
                  <a href="#khoa-hoc" onClick={jump("khoa-hoc")}>
                    Khám phá khóa học
                    <Icon name="arrow" size={18} />
                  </a>
                </article>
              ))}
            </div>
            {!teachers.length && (
              <Empty>Thông tin giảng viên đang được cập nhật.</Empty>
            )}
          </div>
        </section>
        <section id="lop-mo" className="prep-section">
          <div className="public-container">
            <SectionHeading
              eyebrow="SẴN SÀNG CHO KHỞI ĐẦU MỚI"
              title={
                <>
                  <MotionText text="Lớp học sắp tới." />
                  <br />
                  <span><MotionText text="Chọn một lịch dành cho bạn." startIndex={4} /></span>
                </>
              }
              description={`Các lớp đang nhận đăng ký tại 4ENGLISH. Lớp cần ít nhất ${CFG.minStudents} học viên đã xác nhận để khai giảng.`}
            >
              <label className="branch-filter">
                <Icon name="pin" size={19} />
                <select
                  aria-label="Lọc lớp theo chi nhánh"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  <option value="">Tất cả cơ sở</option>
                  {db.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </SectionHeading>
            <div className="open-class-list">
              {open.map((c) => {
                const course = by(db, "courses", c.courseId);
                return (
                  <article className="open-class" key={c.id}>
                    <div className="class-date">
                      <Icon name="timetable" size={22} />
                      <span>{dmy(c.startDate)}</span>
                      <small>Khai giảng</small>
                    </div>
                    <div className="class-information">
                      <span className="class-code">{c.code}</span>
                      <h3>{course.name}</h3>
                      <div>
                        <span>
                          <Icon name="pin" size={15} />
                          <a href={`/co-so/${encodeURIComponent(c.branchId)}`}>{by(db, "branches", c.branchId).name}</a>
                        </span>
                        <span>
                          <Icon name="clock" size={15} />
                          {R.scheduleText(c)}
                        </span>
                      </div>
                    </div>
                    <div className="class-fee">
                      <small>Học phí trọn khóa</small>
                      <strong>{vnd(course.fee)}</strong>
                    </div>
                    <a
                      href={consultHref({ courseId: c.courseId, branchId: c.branchId, classId: c.id })}
                      className="class-cta"
                      onClick={consult(c.courseId, c.branchId, c.id)}
                    >
                      Nhận tư vấn
                      <Icon name="arrow" size={17} />
                    </a>
                  </article>
                );
              })}
              {!open.length && (
                <Empty>
                  Chưa có lớp đang nhận đăng ký tại cơ sở này. Bạn có thể chọn
                  cơ sở khác hoặc để lại thông tin tư vấn.
                </Empty>
              )}
            </div>
          </div>
        </section>
        <section className="abc-promise">
          <div className="public-container promise-grid">
            <div>
              <p className="section-kicker">AN TÂM ĐỂ TẬP TRUNG HỌC</p>
              <h2>
                Rõ ràng từ
                <br />
                buổi học đầu tiên.
              </h2>
            </div>
            {[
              [
                "staff",
                "Lớp học gần gũi",
                `Tối đa ${CFG.maxStudents} học viên mỗi lớp, thuận tiện để cùng thực hành.`,
              ],
              [
                "payments",
                "Học phí minh bạch",
                `Xem học phí trước khi ghi danh. Đóng từ ${CFG.minPaidPct * 100}% để xác nhận chỗ.`,
              ],
              [
                "refresh",
                "Linh hoạt khi cần",
                "Được hướng dẫn bảo lưu, chuyển lớp và học bù theo điều kiện trung tâm.",
              ],
            ].map(([icon, title, text]) => (
              <div className="promise-item" key={title}>
                <span>
                  <Icon name={icon} size={26} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="chi-nhanh" className="prep-section">
          <div className="public-container">
            <SectionHeading
              eyebrow="4ENGLISH GẦN BẠN HƠN"
              title={
                <>
                  <MotionText text="Gặp nhau tại " /><span><MotionText text="4ENGLISH." startIndex={3} /></span>
                </>
              }
              description="Chọn cơ sở thuận tiện cho việc học của bạn tại Hà Nội."
            />
            <div className="prep-branch-grid">
              {db.branches.map((b, i) => (
                <article className="prep-branch" key={b.id}>
                  <div className="branch-heading">
                    <span className="branch-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon name="pin" size={24} />
                  </div>
                  <h3><a href={`/co-so/${encodeURIComponent(b.id)}`}>{b.name}</a></h3>
                  <p>{b.address}</p>
                  {b.phone && <a href={phoneHref(b.phone)}>
                    <Icon name="leads" size={16} />
                    {b.phone}
                    <Icon name="arrow" size={17} />
                  </a>}
                  <BranchMap branch={b} compact />
                  <a className="branch-detail-link" href={`/co-so/${encodeURIComponent(b.id)}`}>Xem cơ sở và lịch lớp<Icon name="arrow" size={17} /></a>
                </article>
              ))}
              {!db.branches.length && (
                <Empty>Thông tin cơ sở đang được cập nhật.</Empty>
              )}
            </div>
          </div>
        </section>
        <section id="tu-van" className="prep-section consult-section">
          <div className="public-container consult-grid">
            <div className="consult-copy">
              <span className="consult-star" aria-hidden="true">
                ✦
              </span>
              <p className="section-kicker">
                MỤC TIÊU CỦA BẠN, HÀNH TRÌNH CÙNG 4ENGLISH
              </p>
              <h2>
                Bạn có mục tiêu.
                <br />
                <span>4ENGLISH có lộ trình.</span>
              </h2>
              <p>
                Bắt đầu bằng một cuộc trò chuyện. Chia sẻ điều bạn muốn cải
                thiện, 4ENGLISH sẽ giúp bạn tìm khóa học và lịch học phù hợp.
              </p>
              <ul>
                <li>
                  <Icon name="check" size={18} />
                  Tư vấn theo trình độ và mục tiêu
                </li>
                <li>
                  <Icon name="check" size={18} />
                  Thông tin học phí và lịch học rõ ràng
                </li>
                <li>
                  <Icon name="check" size={18} />
                  Chọn cơ sở thuận tiện với bạn
                </li>
              </ul>
              <span className="consult-signature">
                Your next chapter starts here.
              </span>
            </div>
            <LeadForm selection={selection} onSelectionChange={setSelection} notice={initialClassId && !db.classes.some((item) => item.id === initialClassId && item.status === "Mở đăng ký" && (!initialCourseId || item.courseId === initialCourseId) && (!initialBranchId || item.branchId === initialBranchId)) ? "Lựa chọn lớp từ đường dẫn đã thay đổi. Bạn hãy chọn lại lớp phù hợp hoặc gửi nhu cầu để được tư vấn." : ""} />
          </div>
        </section>
        <section className="prep-section faq-section">
          <div className="public-container faq-grid">
            <div>
              <p className="section-kicker">GIẢI ĐÁP CÙNG 4ENGLISH</p>
              <h2>
                Bạn hỏi.
                <br />
                <span>4ENGLISH giải đáp.</span>
              </h2>
              <p>Thêm một chút rõ ràng trước khi bạn bắt đầu.</p>
            </div>
            <div className="faq-list">
              {[
                [
                  "Chưa biết trình độ của mình thì nên chọn khóa nào?",
                  "Bạn có thể để lại thông tin tại mục tư vấn. Nhân viên ghi danh sẽ trao đổi về kiến thức hiện tại, mục tiêu và thời gian của bạn trước khi gợi ý chương trình.",
                ],
                [
                  "Tôi có thể xem học phí và lịch khai giảng ở đâu?",
                  "Học phí trọn khóa và số buổi được hiển thị ở mỗi thẻ khóa học. Mục Lịch khai giảng cho biết cơ sở, ngày bắt đầu và khung giờ của các lớp đang nhận đăng ký.",
                ],
                [
                  "Cần đóng bao nhiêu học phí để xác nhận chỗ?",
                  `Bạn cần đóng ít nhất ${CFG.minPaidPct * 100}% học phí để xác nhận chỗ. Nhân viên ghi danh sẽ hướng dẫn thời hạn giữ chỗ và cách đóng khoản phí còn lại.`,
                ],
                [
                  "Nếu bận đột xuất, tôi có thể chuyển lớp hoặc học bù không?",
                  "Bạn liên hệ nhân viên ghi danh để được kiểm tra điều kiện chuyển lớp, học bù hoặc bảo lưu. Yêu cầu được xử lý theo chính sách và tình trạng lớp thực tế của trung tâm.",
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter onNavigate={jump} />
    </div>
  );
}

export function Login() {
  const { login, site } = useStore();
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    try {
      await login(fd.get("u"), fd.get("p"));
      location.hash = "#/app/dashboard";
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-screen prep-login">
      <div className="login-story">
        <Brand dark />
        <div className="login-story-content">
          <span className="login-label">4ENGLISH · TRAINING WORKSPACE</span>
          <h1>
            Thêm thời gian
            <br />
            cho việc dạy.
            <br />
            <span>
              Gần hơn với
              <br />
              từng học viên.
            </span>
          </h1>
          <p>
            Lớp học, lịch dạy, ghi danh và học phí.
            <br />
            Mọi việc cùng một nơi, mỗi ngày gọn gàng hơn.
          </p>
          <div className="login-story-features">
            {[
              ["timetable", "Lịch học rõ ràng"],
              ["staff", "Kết nối đội ngũ"],
              ["shield", "Phân quyền theo vai trò"],
            ].map(([icon, label]) => (
              <span key={label}>
                <Icon name={icon} size={18} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <span className="login-story-footer">Học tự tin. Vươn xa hơn.</span>
        <div className="login-circle login-circle-one" aria-hidden="true" />
        <div className="login-circle login-circle-two" aria-hidden="true" />
      </div>
      <div className="login-panel">
        <a className="login-back" href="#/">
          <Icon name="arrow-left" size={18} />
          Về trang giới thiệu
        </a>
        <form onSubmit={submit} className="login-form" aria-busy={busy}>
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <span className="login-welcome-icon">
            <Icon name="book" size={28} />
          </span>
          <p className="section-kicker">CHÀO MỪNG TRỞ LẠI</p>
          <h2>Đăng nhập hệ thống</h2>
          <p className="login-description">
            Tiếp tục công việc của bạn tại 4ENGLISH.
          </p>
          <Fld label="Tên đăng nhập">
            <In
              required
              name="u"
              autoComplete="username"
              autoFocus
              placeholder="Nhập tên đăng nhập"
              maxLength={100}
            />
          </Fld>
          <Fld label="Mật khẩu">
            <span className="password-field">
              <In
                required
                name="p"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                maxLength={256}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={19} />
              </button>
            </span>
          </Fld>
          {err && (
            <p className="login-error" role="alert">
              {err}
            </p>
          )}
          <Btn disabled={busy} type="submit" className="login-submit">
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            <Icon name="arrow" size={19} />
          </Btn>
          <p className="login-help">
            <Icon name="shield" size={15} />
            Sử dụng tài khoản được trung tâm cấp cho bạn.
          </p>
          {site?.demoMode !== false && <details className="demo-accounts">
            <summary>
              Tài khoản mẫu cho bản học tập
              <Icon name="chevron" size={15} />
            </summary>
            <p>
              quanly · ghidanh · ketoan · gv1 · gv2
              <br />
              Mật khẩu ban đầu: <b>123456</b>
              <br />
              Có thể đổi mật khẩu sau khi đăng nhập.
            </p>
          </details>}
        </form>
        <span className="login-panel-footer">
          4ENGLISH · Không gian quản lý đào tạo
        </span>
      </div>
    </div>
  );
}
