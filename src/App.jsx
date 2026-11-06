import { Component, useEffect } from "react";
import { StoreProvider, useStore, useRoute } from "./store.jsx";
import { Landing, Login } from "./pages/public.jsx";
import { CourseDetail } from "./pages/course-detail.jsx";
import { Placement } from "./pages/placement.jsx";
import { BranchDetail } from "./pages/branch-detail.jsx";
import { Contact, InformationPage, NotFound } from "./pages/contact.jsx";
import { PageMetadata } from "./components/page-metadata.jsx";
import {
  Dashboard,
  Classes,
  ClassDetail,
  Enrollments,
  Payments,
  Requests,
  Attendance,
  Timetable,
  Leads,
  Reports,
} from "./pages/pages.jsx";
import { Students, Master, Staff } from "./pages/master.jsx";
import { System, PasswordForm } from "./pages/system.jsx";
import { ROLE } from "./lib/util.js";
import { Btn, useAsk } from "./ui.jsx";
import { Icon, Brand } from "./icons.jsx";
const MENU = {
  dashboard: "Tổng quan",
  classes: "Lớp học",
  timetable: "Thời khóa biểu",
  students: "Học viên",
  enrollments: "Đăng ký học",
  payments: "Học phí",
  requests: "Yêu cầu học tập",
  attendance: "Điểm danh",
  staff: "Nhân viên",
  master: "Danh mục",
  leads: "Tư vấn",
  reports: "Báo cáo",
  system: "Hệ thống",
};
const ROLE_MENU = {
  manager: Object.keys(MENU),
  branch_manager: Object.keys(MENU).filter((key) => key !== "system"),
  enroll: [
    "dashboard",
    "students",
    "classes",
    "enrollments",
    "requests",
    "timetable",
    "leads",
  ],
  accountant: ["dashboard", "payments", "enrollments", "classes", "reports"],
  teacher: ["dashboard", "timetable", "attendance"],
};
const PAGES = {
  dashboard: Dashboard,
  classes: Classes,
  timetable: Timetable,
  students: Students,
  enrollments: Enrollments,
  payments: Payments,
  requests: Requests,
  attendance: Attendance,
  staff: Staff,
  master: Master,
  leads: Leads,
  reports: Reports,
  system: System,
};
function Shell({ page = "dashboard", arg }) {
  const { user, site, logout, reset, act, openModal, branches, branchId, setBranchId } = useStore(),
    ask = useAsk(),
    key = page === "class" ? "classes" : page,
    menu = ROLE_MENU[user.role] || [];
  useEffect(() => {
    if (!menu.includes(key)) location.hash = "#/app/dashboard";
  }, [key, menu]);
  if (!menu.includes(key)) return null;
  const Page = page === "class" ? ClassDetail : PAGES[page] || Dashboard;
  return (
    <div className="app-layout">
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <Brand compact dark />
          <p>TRAINING WORKSPACE</p>
        </div>
        <nav aria-label="Điều hướng nghiệp vụ" className="sidebar-nav">
          {menu.map((k) => (
            <a
              key={k}
              href={`#/app/${k}`}
              aria-current={key === k ? "page" : undefined}
              className={key === k ? "active" : ""}
            >
              <Icon name={k} />
              <span>{MENU[k]}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="user-avatar">
            {user.name.trim().split(" ").at(-1)?.[0]}
          </span>
          <div>
            <b>{user.name}</b>
            <small>{ROLE[user.role]}</small>
          </div>
        </div>
        <div className="sidebar-actions">
          <button onClick={() => openModal(<PasswordForm />)}>
            Đổi mật khẩu
          </button>
          <button onClick={() => act(logout)}>
            <Icon name="logout" size={15} />
            Đăng xuất
          </button>
          {user.role === "manager" && site?.demoMode !== false && (
            <button
              onClick={() =>
                ask({
                  title: "Khôi phục dữ liệu demo?",
                  message:
                    "Toàn bộ dữ liệu nghiệp vụ sẽ được thay bằng dữ liệu mẫu. Tài khoản hiện tại được giữ nguyên. Hãy tải bản sao lưu trước khi tiếp tục.",
                  ok: "Khôi phục demo",
                  danger: true,
                  onConfirm: reset,
                })
              }
            >
              Khôi phục demo
            </button>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="app-topbar no-print">
          <span>
            <b>4ENGLISH</b>
            <span className="hidden sm:inline"> / {MENU[key]}</span>
          </span>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden md:inline">Cơ sở</span>
            <select
              aria-label="Cơ sở đang quản lý"
              className="max-w-[45vw] rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm sm:max-w-48"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={!branches.length}
            >
              {(user.role === "manager" || branches.length !== 1) && (
                <option value="">
                  {user.role === "manager" ? "Tất cả cơ sở" : branches.length ? "Các cơ sở được giao" : "Chưa được giao cơ sở"}
                </option>
              )}
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <a href="#/" className="hidden items-center gap-2 text-sm sm:flex">
            Trang giới thiệu
            <Icon name="arrow" size={16} />
          </a>
        </header>
        <main className="app-main">
          {!branches.length && user.role !== "manager" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
              <h1 className="mb-2 text-xl font-bold">Chưa được giao cơ sở</h1>
              <p>Liên hệ quản trị toàn hệ thống để được gán cơ sở. Dữ liệu nghiệp vụ sẽ hiển thị sau khi quyền được cập nhật.</p>
            </div>
          ) : <Page key={`${page}/${arg}/${branchId}`} id={arg} />}
        </main>
      </div>
    </div>
  );
}
function Router() {
  const { user } = useStore(),
    { segments: [a, b, c], params } = useRoute();
  useEffect(() => {
    if (a === "app" && !user) location.hash = "#/login";
  }, [a, user]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [a, b]);
  if (a === "login") return <Login />;
  if (a === "course") return <CourseDetail id={b} />;
  if (a === "branch") return <BranchDetail id={b} />;
  if (a === "contact") return <Contact />;
  if (a === "privacy" || a === "terms") return <InformationPage type={a} />;
  if (a === "placement") return <Placement />;
  if (a === "consult")
    return <Landing initialCourseId={b} initialBranchId={params.get("branch") || ""} initialClassId={params.get("class") || ""} initialSection="tu-van" />;
  if (a === "section") return <Landing initialSection={b} />;
  if (a === "app") return user ? <Shell page={b || undefined} arg={c} /> : null;
  return a ? <NotFound /> : <Landing />;
}
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e) {
    console.error(e);
  }
  render() {
    return this.state.error ? (
      <div className="boot-screen">
        <h1>Chưa thể hiển thị trang này</h1>
        <p>
          Dữ liệu trên máy chủ được giữ nguyên. Tải lại trang để kết nối lại.
        </p>
        <Btn onClick={() => location.reload()}>Tải lại</Btn>
        <a href="#/" onClick={() => this.setState({ error: false })}>
          Về trang giới thiệu
        </a>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <PageMetadata />
        <Router />
      </StoreProvider>
    </ErrorBoundary>
  );
}
