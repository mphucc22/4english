import { useStore } from "../store.jsx";
import { PublicPage } from "../public-layout.jsx";
import { Icon } from "../icons.jsx";
import { BranchMap } from "../components/branch-map.jsx";
import { branchPublicData, consultHref, phoneHref } from "../lib/branch-public.js";
import { R } from "../lib/rules.js";
import { vnd, dmy } from "../lib/util.js";

export function BranchDetail({ id }) {
  const { db, site } = useStore();
  const data = branchPublicData(db, id);
  if (!data)
    return (
      <PublicPage>
        <section className="prep-section branch-detail-page">
          <div className="public-container missing-course">
            <Icon name="pin" size={44} />
            <h1>Chưa tìm thấy cơ sở</h1>
            <p>Cơ sở có thể đã thay đổi. Bạn hãy chọn lại trong danh sách của 4ENGLISH.</p>
            <a className="prep-button" href="/co-so">Xem các cơ sở<Icon name="arrow" /></a>
          </div>
        </section>
      </PublicPage>
    );

  const { branch, classes, courses } = data;
  const tel = phoneHref(branch.phone);
  const consult = consultHref({ branchId: branch.id });
  return (
    <PublicPage>
      <div className="branch-detail-page">
        <section className="branch-detail-hero">
          <div className="public-container">
            <nav className="public-breadcrumb" aria-label="Đường dẫn trang">
              <a href="#/">Trang chủ</a><span>/</span>
              <a href="/co-so">Cơ sở</a><span>/</span>
              <span aria-current="page">{branch.name}</span>
            </nav>
            <div className="branch-detail-hero-grid">
              <div className="branch-detail-intro">
                <span className="hero-label"><Icon name="pin" size={16} />CƠ SỞ {branch.code}</span>
                <h1>{branch.name}</h1>
                <p>Chọn nơi học thuận tiện, xem lịch lớp phù hợp và kết nối trực tiếp với cơ sở.</p>
                <div className="branch-detail-facts">
                  <div><strong>{classes.length}</strong><span>Lớp đang nhận đăng ký</span></div>
                  <div><strong>{courses.length}</strong><span>Chương trình có lớp mở</span></div>
                </div>
                <div className="branch-detail-actions">
                  <a className="prep-button" href={consult}>Tư vấn tại cơ sở này<Icon name="arrow" size={19} /></a>
                  <a className="branch-outline-link" href="#branch-classes" onClick={(event) => {
                    event.preventDefault();
                    document.getElementById("branch-classes")?.scrollIntoView({ behavior: "auto", block: "start" });
                  }}>Xem lịch khai giảng<Icon name="timetable" size={19} /></a>
                </div>
              </div>
              <figure className="branch-detail-visual">
                <picture>
                  <img src="/images/4english-study-space-1448.webp" srcSet="/images/4english-study-space-480.webp 480w, /images/4english-study-space-768.webp 768w, /images/4english-study-space-1448.webp 1448w" sizes="(max-width: 800px) 90vw, 560px" width="1448" height="1086" fetchPriority="high" alt="Góc học tiếng Anh với sách, máy tính và tai nghe mang nhận diện 4ENGLISH" />
                </picture>
                <figcaption>Không gian học tập 4ENGLISH · Ảnh minh họa</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="prep-section branch-location-section">
          <div className="public-container branch-location-grid">
            <div className="branch-contact-card">
              <p className="section-kicker">KẾT NỐI VỚI CƠ SỞ</p>
              <h2>Thuận tiện cho hành trình học.</h2>
              <dl className="branch-contact-list">
                <div><dt><Icon name="pin" size={20} />Địa chỉ</dt><dd>{branch.address || "Đang cập nhật địa chỉ"}</dd></div>
                <div><dt><Icon name="leads" size={20} />Điện thoại</dt><dd>{tel ? <a href={tel}>{branch.phone}</a> : "Vui lòng gửi yêu cầu tư vấn"}</dd></div>
                <div><dt><Icon name="clock" size={20} />Giờ đón tiếp</dt><dd>{branch.openingHours || site?.contact?.hours || "Liên hệ cơ sở để xác nhận giờ đón tiếp trước khi đến."}</dd></div>
              </dl>
              <a className="branch-outline-link" href={consult}>Để lại thông tin tư vấn<Icon name="arrow" size={18} /></a>
            </div>
            <div>
              <h2 className="branch-map-heading">Vị trí {branch.name}</h2>
              <BranchMap branch={branch} />
            </div>
          </div>
        </section>

        <section className="prep-section branch-program-section">
          <div className="public-container">
            <div className="new-section-heading"><div>
              <p className="section-kicker">CHƯƠNG TRÌNH TẠI CƠ SỞ</p>
              <h2>Tìm chương trình dành cho bạn.</h2>
              <p className="section-description">Danh sách được cập nhật theo các lớp đang mở đăng ký tại {branch.name}.</p>
            </div></div>
            {courses.length ? <div className="branch-course-grid">
              {courses.map((course) => <article className="branch-course-card" key={course.id}>
                <span className="branch-course-code">{course.code}</span>
                <h3>{course.name}</h3>
                <p>{course.desc}</p>
                <dl><div><dt>Học phí trọn khóa</dt><dd>{vnd(course.fee)}</dd></div><div><dt>Thời lượng</dt><dd>{course.sessions} buổi</dd></div></dl>
                <div className="branch-course-actions">
                  <a href={`/khoa-hoc/${encodeURIComponent(course.id)}`}>Xem chương trình<Icon name="arrow" size={17} /></a>
                  <a href={consultHref({ courseId: course.id, branchId: branch.id })}>Nhận tư vấn<span className="visually-hidden"> {course.name} tại {branch.name}</span></a>
                </div>
              </article>)}
            </div> : <div className="detail-empty"><Icon name="book" size={32} /><h3>Đang cập nhật lớp cho đợt tiếp theo</h3><p>Để lại nhu cầu để cơ sở tư vấn chương trình và lịch học phù hợp.</p><a className="prep-button" href={consult}>Nhận tư vấn<Icon name="arrow" size={18} /></a></div>}
          </div>
        </section>

        <section id="branch-classes" className="prep-section branch-class-section">
          <div className="public-container">
            <div className="new-section-heading"><div>
              <p className="section-kicker">LỊCH KHAI GIẢNG</p><h2>Các lớp tại {branch.name}</h2>
              <p className="section-description">Chọn lịch học rồi gửi yêu cầu. Khóa học, lớp và cơ sở sẽ được điền sẵn trong form tư vấn.</p>
            </div></div>
            <div className="open-class-list">
              {classes.map((item) => {
                const course = courses.find((c) => c.id === item.courseId);
                return <article className="open-class" key={item.id}>
                  <div className="class-date"><Icon name="timetable" size={24} /><span>{dmy(item.startDate)}</span><small>Khai giảng</small></div>
                  <div className="class-information"><span className="class-code">{item.code}</span><h3>{course.name}</h3><div><span><Icon name="clock" size={16} />{R.scheduleText(item)}</span></div></div>
                  <div className="class-fee"><small>Học phí trọn khóa</small><strong>{vnd(course.fee)}</strong></div>
                  <a className="class-cta" href={consultHref({ courseId: item.courseId, branchId: branch.id, classId: item.id })}>Nhận tư vấn<Icon name="arrow" size={18} /></a>
                </article>;
              })}
            </div>
            {!classes.length && <div className="detail-empty"><h3>Chưa có lớp đang nhận đăng ký</h3><p>Bạn vẫn có thể đăng ký tư vấn lịch học cho đợt tiếp theo tại cơ sở này.</p><a className="prep-button" href={consult}>Tư vấn lịch học<Icon name="arrow" size={18} /></a></div>}
          </div>
        </section>
      </div>
    </PublicPage>
  );
}
