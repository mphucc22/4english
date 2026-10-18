import { useStore } from "../store.jsx";
import { by } from "../lib/util.js";
export const Head = ({ title, children }) => (
  <div className="mb-5 flex flex-wrap items-center gap-3">
    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
      {title}
    </h1>
    <div className="flex-1" />
    {children}
  </div>
);
export const Stu = ({ id }) => {
  const { db } = useStore();
  const s = by(db, "students", id);
  return (
    <>
      {s.name} <small className="text-slate-500">{s.code}</small>
    </>
  );
};
export const Muted = ({ children }) => (
  <small className="text-slate-500">{children}</small>
);
export const statuses = (a) => a.map((s) => [s, s]);
