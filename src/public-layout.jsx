import { useEffect, useState } from "react";
import { useStore } from "./store.jsx";
import { Brand, Icon } from "./icons.jsx";
import { LinkBtn } from "./ui.jsx";
import { phoneHref } from "./lib/branch-public.js";

const NAV = [
  ["khoa-hoc", "Khóa học"],
  ["lo-trinh", "Lộ trình học"],
  ["giang-vien", "Giảng viên"],
  ["lop-mo", "Lịch khai giảng"],
  ["chi-nhanh", "Cơ sở"],
];
const sectionHref = (id) => id === "khoa-hoc" ? "/khoa-hoc" : id === "chi-nhanh" ? "/co-so" : id === "tu-van" ? "/tu-van" : `/#${id}`;

const readMotionPaused = () => {
  try {
    return localStorage.getItem("4english.motion.paused") === "1";
  } catch {
    return false;
  }
};

export function PublicHeader({ onNavigate }) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(readMotionPaused);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onPreferenceChange = (event) => setReducedMotion(event.matches);
    const onMotionChange = (event) => {
      if (typeof event.detail?.paused === "boolean")
        setMotionPaused(event.detail.paused);
    };
    preference?.addEventListener("change", onPreferenceChange);
    window.addEventListener("4english:motion-change", onMotionChange);
    return () => {
      preference?.removeEventListener("change", onPreferenceChange);
      window.removeEventListener("4english:motion-change", onMotionChange);
    };
  }, []);
  const toggleMotion = () => {
    const paused = !motionPaused;
    setMotionPaused(paused);
    try {
      localStorage.setItem("4english.motion.paused", paused ? "1" : "0");
    } catch {
      // The current page still honors the choice when browser storage is blocked.
    }
    window.dispatchEvent(new CustomEvent("4english:motion-change", {
      detail: { paused },
    }));
  };
  useEffect(() => {
    const close = (e) => {
      if (e.type === "hashchange" || e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("hashchange", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("hashchange", close);
    };
  }, []);
  const link = (id) => ({
    href: onNavigate ? `#${id}` : sectionHref(id),
    onClick: (e) => {
      setOpen(false);
      if (onNavigate) onNavigate(id)(e);
    },
  });
  return (
    <>
      <a
        className="skip-link"
        href="#noi-dung"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("noi-dung");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Chuyển đến nội dung
      </a>
      <div className="prep-announcement">
        <span>Khởi đầu hành trình tiếng Anh cùng 4ENGLISH</span>
        <a href="/kiem-tra-dau-vao">
          Thử kiểm tra đầu vào
          <Icon name="arrow" size={16} />
        </a>
        {!reducedMotion && <button type="button" className="motion-toggle" onClick={toggleMotion} aria-pressed={motionPaused} aria-label={motionPaused ? "Bật chuyển động" : "Tạm dừng chuyển động"} title={motionPaused ? "Bật chuyển động" : "Tạm dừng chuyển động"}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{motionPaused ? <path d="M4 2v12l10-6z" /> : <path d="M3 2h4v12H3zM9 2h4v12H9z" />}</svg>
          <span className="motion-toggle-label">{motionPaused ? "Bật chuyển động" : "Tạm dừng chuyển động"}</span>
        </button>}
      </div>
      <header className="prep-header">
        <div className="public-container prep-navbar">
          <Brand />
          <nav className="prep-desktop-nav" aria-label="Điều hướng chính">
            {NAV.map(([id, label]) => (
              <a key={id} {...link(id)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="prep-nav-actions">
            <LinkBtn
              v="ghost"
              className="nav-login"
              href={user ? "/#/app/dashboard" : "/dang-nhap"}
            >
              {user ? "Vào hệ thống" : "Cổng nhân viên"}
              <Icon name="arrow" size={16} />
            </LinkBtn>
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              aria-controls="public-mobile-menu"
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "close" : "menu"} size={23} />
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="public-mobile-menu"
            className="prep-mobile-nav"
            aria-label="Điều hướng trên điện thoại"
          >
            {NAV.map(([id, label]) => (
              <a key={id} {...link(id)}>
                {label}
                <Icon name="arrow" size={17} />
              </a>
            ))}
            <a href="/kiem-tra-dau-vao" onClick={() => setOpen(false)}>
              Kiểm tra đầu vào
              <Icon name="attendance" size={18} />
            </a>
            <a href="/lien-he" onClick={() => setOpen(false)}>Liên hệ<Icon name="leads" size={18} /></a>
            <a {...link("tu-van")}>
              Nhận tư vấn
              <Icon name="leads" size={17} />
            </a>
          </nav>
        )}
        <span className="reading-progress" aria-hidden="true" />
      </header>
    </>
  );
}

export function PublicFooter({ onNavigate }) {
  const { user, site } = useStore();
  const contact = site?.contact || {};
  const link = (id) => ({
    href: onNavigate ? `#${id}` : sectionHref(id),
    onClick: onNavigate?.(id),
  });
  return (
    <footer className="prep-footer">
      <div className="public-container">
        <div className="footer-main">
          <div className="footer-about">
            <Brand dark />
            <p>
              Mỗi buổi học, một bước tiến mới.
              <br />
              Cùng 4ENGLISH mở rộng tương lai của bạn.
            </p>
            <p className="footer-hours"><Icon name="clock" size={16} />{contact.hours || "Liên hệ từng cơ sở để xác nhận giờ đón tiếp."}</p>
          </div>
          <div>
            <h2>Khám phá 4ENGLISH</h2>
            {NAV.map(([id, label]) => (
              <a key={id} {...link(id)}>
                {label}
              </a>
            ))}
          </div>
          <div>
            <h2>Kết nối với 4ENGLISH</h2>
            <a href="/lien-he">Liên hệ và chỉ đường<Icon name="pin" size={15} /></a>
            {contact.hotline && <a href={phoneHref(contact.hotline)}>{contact.hotline}</a>}
            {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
            {contact.zaloUrl && <a href={contact.zaloUrl} target="_blank" rel="noopener noreferrer">Zalo 4ENGLISH</a>}
            {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook 4ENGLISH</a>}
            <a {...link("tu-van")}>Tư vấn chương trình học</a>
          </div>
          <div>
            <h2>Thông tin hữu ích</h2>
            <a href="/kiem-tra-dau-vao">Kiểm tra đầu vào</a>
            <a href="/dieu-khoan">Hướng dẫn đăng ký học</a>
            <a href="/chinh-sach-bao-mat">Thông tin quyền riêng tư</a>
            <a href={user ? "/#/app/dashboard" : "/dang-nhap"}>
              Cổng nhân viên
              <Icon name="arrow" size={15} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} 4ENGLISH{site?.demoMode !== false ? " · DT06 · Bản học tập" : ""}
          </span>
          <span>Học tự tin. Vươn xa hơn.</span>
        </div>
      </div>
    </footer>
  );
}

export function PublicPage({ children }) {
  return (
    <div className="prep-site">
      <PublicHeader />
      <main id="noi-dung" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
