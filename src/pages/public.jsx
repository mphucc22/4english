import { useState } from "react";
import { useStore } from "../store.jsx";
import { Btn, LinkBtn, Card, Table, Fld, In, Sel, Empty } from "../ui.jsx";
import { Icon, Brand } from "../icons.jsx";
import { request } from "../lib/api.js";
import { R, CFG } from "../lib/rules.js";
import { by, vnd, dmy } from "../lib/util.js";

function LanguageArt() {
  return (
    <div className="language-art" aria-hidden="true">
      <div className="art-grid" />
      <span className="art-eyebrow">YOUR NEXT CHAPTER</span>
      <div className="art-globe">
        <Icon name="globe" size={180} />
      </div>
      <div className="art-card art-card-one">
        <span className="art-letter">Aa</span>
        <span>
          Speak with
          <br />
          <b>confidence.</b>
        </span>
      </div>
      <div className="art-card art-card-two">
        <Icon name="book" size={28} />
        <span>
          Learn a little.
          <br />
          <b>Go a long way.</b>
        </span>
      </div>
      <div className="art-caption">
        <i /> Mỗi buổi học, một bước tiến mới.
      </div>
    </div>
  );
}
function LeadForm() {
  const { db, toast } = useStore();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const r = await request("leads", {
        body: Object.fromEntries(new FormData(form)),
      });
      form.reset();
      toast(r.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-6">
      <form onSubmit={submit}>
        <Fld label="Họ và tên">
          <In required name="name" maxLength={120} />
        </Fld>
        <Fld label="Số điện thoại">
          <In required name="phone" type="tel" pattern="[+0-9 .-]{9,20}" />
        </Fld>
        <Fld label="Khóa quan tâm">
          <Sel
            required
            name="courseId"
            ph="Chọn chương trình"
            options={db.courses.map((c) => [c.id, c.name])}
          />
        </Fld>
        <Fld label="Ghi chú">
          <In name="note" maxLength={500} />
        </Fld>
        {error && (
          <p role="alert" className="mb-3 text-red-700">
            {error}
          </p>
        )}
        <Btn
          disabled={busy || !db.courses.length}
          type="submit"
          className="w-full"
        >
          {busy ? "Đang gửi…" : "Gửi yêu cầu tư vấn"}
          <Icon name="arrow" size={18} />
        </Btn>
        <p className="mt-3 text-xs text-slate-500">
          Thông tin dùng để tư vấn khóa học tại trung tâm.
        </p>
      </form>
    </Card>
  );
}
function Section({ id, eyebrow, title, sub, children, alt = false }) {
  return (
    <section id={id} className={`public-section ${alt ? "section-alt" : ""}`}>
      <div className="public-container">
        <div className="section-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {sub && <p className="section-sub">{sub}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
export function Landing() {
  const { db, user } = useStore(),
    open = db.classes.filter((c) => c.status === "Mở đăng ký");
  const jump = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <>
      <div className="announcement">Học cùng ABC · Tự tin hơn mỗi ngày</div>
      <header className="public-header">
        <div className="public-container flex flex-wrap items-center gap-5 py-5">
          <Brand />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold md:flex">
            {[
              ["khoa-hoc", "Khóa học"],
              ["lop-mo", "Lớp đang mở"],
              ["chi-nhanh", "Chi nhánh"],
              ["tu-van", "Tư vấn"],
            ].map(([id, name]) => (
              <a href={"#" + id} onClick={jump(id)} key={id}>
                {name}
              </a>
            ))}
          </nav>
          <LinkBtn
            sm
            v="ghost"
            className="ml-auto md:ml-0"
            href={user ? "#/app/dashboard" : "#/login"}
          >
            <Icon name="staff" size={17} />
            {user ? "Vào hệ thống" : "Đăng nhập"}
          </LinkBtn>
        </div>
      </header>
      <section className="public-hero">
        <div className="public-container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">TRUNG TÂM TIẾNG ANH ABC</p>
            <h1>
              Tự tin mở lời.
              <br />
              <span>Mở rộng tương lai.</span>
            </h1>
            <p className="hero-description">
              Một lộ trình vừa sức, một lớp học gần gũi. Tìm chương trình tiếng
              Anh và lịch học phù hợp với bạn tại ABC.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkBtn href="#khoa-hoc" onClick={jump("khoa-hoc")}>
                Khám phá khóa học
                <Icon name="arrow" size={18} />
              </LinkBtn>
              <LinkBtn v="ghost" href="#tu-van" onClick={jump("tu-van")}>
                Nhận tư vấn
              </LinkBtn>
            </div>
            <div className="hero-stats">
              {[
                [db.branches.length, "chi nhánh"],
                [CFG.maxStudents, "học viên tối đa / lớp"],
                [db.courses.length, "chương trình"],
              ].map(([n, l]) => (
                <div key={l}>
                  <b>{n}</b>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <LanguageArt />
        </div>
      </section>
      <Section
        id="khoa-hoc"
        eyebrow="BẮT ĐẦU TỪ ĐÚNG TRÌNH ĐỘ"
        title="Một lộ trình dành cho bạn"
        sub="Xem số buổi và học phí từng chương trình; trung tâm sẽ tư vấn trước khi ghi danh."
      >
        {db.courses.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {db.courses.map((c, i) => (
              <Card key={c.id} className="course-card">
                <div className="flex items-center justify-between">
                  <span className="course-code">{c.code}</span>
                  <Icon name={i === 5 ? "globe" : "book"} size={27} />
                </div>
                <h3 className="mt-5 text-xl font-bold">{c.name}</h3>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-slate-500">
                  {c.desc}
                </p>
                <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-5">
                  <div>
                    <b className="text-xl text-teal-800">{vnd(c.fee)}</b>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.sessions} buổi / khóa
                    </p>
                  </div>
                  <a
                    className="flex items-center gap-1 text-sm font-semibold text-teal-800"
                    href="#tu-van"
                    onClick={jump("tu-van")}
                  >
                    Tư vấn
                    <Icon name="arrow" size={16} />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Chương trình đào tạo đang được cập nhật.</Empty>
        )}
      </Section>
      <Section
        alt
        eyebrow="HỌC TẬP CÓ KẾ HOẠCH"
        title="Rõ ràng từ buổi học đầu tiên"
      >
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "staff",
              "Lớp học gần gũi",
              `Tối đa ${CFG.maxStudents} học viên mỗi lớp.`,
            ],
            [
              "timetable",
              "Lịch học phù hợp",
              "Xem cơ sở, khung giờ và đợt khai giảng trước khi ghi danh.",
            ],
            [
              "payments",
              "Học phí minh bạch",
              `Đóng từ ${CFG.minPaidPct * 100}% để xác nhận chỗ.`,
            ],
            [
              "refresh",
              "Hỗ trợ khi bạn bận",
              "Gửi yêu cầu bảo lưu, chuyển lớp và học bù theo điều kiện trung tâm.",
            ],
          ].map(([icon, title, desc]) => (
            <div key={title}>
              <span className="feature-icon">
                <Icon name={icon} size={25} />
              </span>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </Section>
      <Section
        id="lop-mo"
        eyebrow="CHỌN THỜI GIAN CỦA BẠN"
        title="Lớp đang nhận đăng ký"
        sub={`Lớp cần ít nhất ${CFG.minStudents} học viên đã xác nhận để khai giảng.`}
      >
        <Table
          head={[
            "Lớp",
            "Chương trình",
            "Chi nhánh",
            "Lịch học",
            "Khai giảng",
            "Học phí",
          ]}
          rows={open.map((c) => (
            <tr key={c.id}>
              <td className="font-bold">{c.code}</td>
              <td>{by(db, "courses", c.courseId).name}</td>
              <td>{by(db, "branches", c.branchId).name}</td>
              <td>{R.scheduleText(c)}</td>
              <td>{dmy(c.startDate)}</td>
              <td className="font-semibold text-teal-800">
                {vnd(by(db, "courses", c.courseId).fee)}
              </td>
            </tr>
          ))}
        />
      </Section>
      <Section
        id="chi-nhanh"
        alt
        eyebrow="GẦN HƠN VỚI BẠN"
        title="Các chi nhánh ABC"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {db.branches.map((b) => (
            <Card key={b.id}>
              <Icon name="pin" size={23} />
              <h3 className="mt-4 font-bold">{b.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {b.address}
              </p>
              <a
                className="mt-4 block text-sm font-semibold text-teal-800"
                href={"tel:" + b.phone.replace(/\s/g, "")}
              >
                {b.phone}
              </a>
            </Card>
          ))}
        </div>
      </Section>
      <section id="tu-van" className="public-section">
        <div className="public-container grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">BƯỚC NHỎ, KHỞI ĐẦU MỚI</p>
            <h2 className="public-title">
              Cùng tìm lớp học
              <br />
              phù hợp với bạn.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-slate-500">
              Để lại thông tin và chương trình quan tâm. Nhân viên ghi danh sẽ
              tư vấn lịch học, trình độ và học phí.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-teal-800">
              <Icon name="shield" />
              Thông tin của bạn được lưu tại trung tâm.
            </div>
          </div>
          <LeadForm />
        </div>
      </section>
      <footer className="public-footer">
        <div className="public-container flex flex-wrap items-center justify-between gap-5">
          <Brand dark />
          <p className="text-xs text-slate-300">
            © {new Date().getFullYear()} ABC English · DT06 · Bản học tập
          </p>
        </div>
      </footer>
    </>
  );
}
export function Login() {
  const { login } = useStore();
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
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
    <div className="login-screen">
      <div className="login-story">
        <Brand dark />
        <p className="eyebrow mt-20">ABC ENGLISH · TRAINING WORKSPACE</p>
        <h1>
          Thêm thời gian
          <br />
          cho việc dạy.
          <br />
          <span>Ít hơn cho giấy tờ.</span>
        </h1>
        <p className="mt-7 max-w-sm text-slate-300">
          Quản lý lớp học, lịch dạy, ghi danh và học phí tại một nơi.
        </p>
        <div className="mt-14 flex gap-5 text-sm text-slate-300">
          <Icon name="shield" />
          Phân quyền theo từng vai trò
        </div>
      </div>
      <div className="login-panel">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p>
          <h2 className="mt-3 text-3xl font-bold">Đăng nhập hệ thống</h2>
          <p className="mb-8 mt-3 text-sm text-slate-500">
            Dùng tài khoản được trung tâm cấp cho bạn.
          </p>
          <Fld label="Tên đăng nhập">
            <In
              required
              name="u"
              autoComplete="username"
              autoFocus
              maxLength={100}
            />
          </Fld>
          <Fld label="Mật khẩu">
            <In
              required
              name="p"
              type="password"
              autoComplete="current-password"
              maxLength={256}
            />
          </Fld>
          {err && (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {err}
            </p>
          )}
          <Btn disabled={busy} type="submit" className="mt-2 w-full">
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            <Icon name="arrow" size={18} />
          </Btn>
          <LinkBtn v="ghost" className="mt-3 w-full" href="#/">
            Về trang giới thiệu
          </LinkBtn>
          <details className="mt-7 text-xs text-slate-500">
            <summary className="cursor-pointer">
              Tài khoản mẫu cho bản học tập
            </summary>
            <p className="mt-3 leading-6">
              quanly · ghidanh · ketoan · gv1 · gv2
              <br />
              Mật khẩu ban đầu: 123456
              <br />
              Có thể đổi mật khẩu sau khi đăng nhập.
            </p>
          </details>
        </form>
      </div>
    </div>
  );
}
