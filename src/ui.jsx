import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "./store.jsx";
import { cx } from "./lib/util.js";
import { Icon } from "./icons.jsx";

const V = {
  pri: "bg-teal-800 text-white hover:bg-teal-900",
  ghost:
    "bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:bg-teal-50",
  ok: "bg-teal-700 text-white hover:bg-teal-800",
  bad: "bg-red-700 text-white hover:bg-red-800",
  warn: "bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200",
  line: "bg-transparent border border-white/40 text-white hover:bg-white/10",
};
const btnCls = (v, sm, extra) =>
  cx(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition duration-200  disabled:cursor-not-allowed disabled:opacity-50",
    sm ? "px-2.5 py-1 text-[13px]" : "px-4 py-2 text-sm",
    V[v || "pri"],
    extra,
  );
export const Btn = ({ v, sm, className, type = "button", ...p }) => (
  <button type={type} {...p} className={btnCls(v, sm, className)} />
);
export const LinkBtn = ({ v, sm, className, ...p }) => (
  <a {...p} className={btnCls(v, sm, className)} />
);

const BC = {
  "Mở đăng ký": "blue",
  "Đã hủy": "red",
  "Đang học": "green",
  "Chờ đóng phí": "amber",
  "Đã xác nhận": "green",
  "Bảo lưu": "purple",
  "Hoàn thành": "teal",
  "Chờ duyệt": "amber",
  "Đã duyệt": "green",
  "Từ chối": "red",
  "Hoạt động": "green",
  Ngừng: "red",
  "Đang dạy": "green",
  Nghỉ: "red",
  "Đang bảo lưu": "purple",
  "Đã học lại": "teal",
  "Hết hạn": "red",
  Mới: "amber",
  "Đã liên hệ": "blue",
  "Đã ghi danh": "green",
  "Có mặt": "green",
  Vắng: "red",
  "Học bù": "purple",
  "Đã học": "green",
  "Đủ điều kiện mở": "green",
  "Hôm nay": "blue",
};
const BCL = {
  gray: "bg-slate-100 text-slate-600",
  blue: "bg-teal-100 text-teal-800",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-teal-100 text-teal-800",
  teal: "bg-teal-100 text-teal-800",
};
const PENDING = ["Chờ duyệt", "Mới", "Chờ đóng phí"];
export const Badge = ({ t, c }) => (
  <span
    className={cx(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
      BCL[c || BC[t] || "gray"],
    )}
  >
    {PENDING.includes(t) && <i className="size-1.5  rounded-full bg-current" />}
    {t}
  </span>
);

export const Card = ({ className, ...p }) => (
  <div
    {...p}
    className={cx(
      "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] ",
      className,
    )}
  />
);
export const Note = ({ children }) => (
  <div className="mb-4 animate-fade-up rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">
    {children}
  </div>
);
export const Empty = ({ children }) => (
  <div className="p-6 text-center text-slate-500">{children}</div>
);
export const H3 = ({ children }) => (
  <h3 className="mb-2.5 text-base font-bold">{children}</h3>
);
export const Bar = ({ v, max, c = "bg-teal-600" }) => (
  <div className="h-2 min-w-[90px] overflow-hidden rounded-full bg-slate-200">
    <i
      className={cx("block h-full animate-grow rounded-full", c)}
      style={{ width: `${Math.min(100, max ? (v / max) * 100 : 0)}%` }}
    />
  </div>
);
export const Meter = ({ v, min }) => (
  <Bar v={v} max={min} c={v >= min ? "bg-green-600" : "bg-amber-500"} />
);

export function Table({ head, rows, right = [] }) {
  return (
    <div className="mb-5 animate-fade-in overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={cx(
                  "bg-slate-50/80 px-3.5 py-3 text-xs font-bold tracking-wide whitespace-nowrap text-slate-500 uppercase",
                  right.includes(i) ? "text-right" : "text-left",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="rows [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle [&_tr:last-child_td]:border-0 [&_tr:hover]:bg-teal-50/40 [&_tr]:transition-colors">
          {rows}
        </tbody>
      </table>
      {!rows.length && (
        <div className="sticky left-0 w-full">
          <Empty>Chưa có dữ liệu.</Empty>
        </div>
      )}
    </div>
  );
}

export const INP =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-teal-600 focus:ring-2 focus:ring-teal-700/15 focus:outline-none";
export const Fld = ({ label, children }) => (
  <label className="mb-3 flex flex-col gap-1 text-[13.5px] font-semibold text-slate-500">
    <span>{label}</span>
    {children}
  </label>
);
export const In = ({ className, ...p }) => (
  <input {...p} className={cx(INP, className)} />
);
export const Area = ({ className, ...p }) => (
  <textarea rows={3} {...p} className={cx(INP, className)} />
);
export const Sel = ({ options, ph, className, ...p }) => (
  <select {...p} className={cx(INP, className)}>
    {ph !== undefined && <option value="">{ph}</option>}
    {options.map(([v, l]) => (
      <option key={v} value={v}>
        {l}
      </option>
    ))}
  </select>
);
export const Filter = ({ className, ...p }) => (
  <Sel {...p} className={cx("w-auto min-w-[150px]", className)} />
);

function Dialog({ title, children, busy = false, lg = false, alert = false }) {
  const { closeModal } = useStore(),
    ref = useRef(null),
    label = useId();
  useEffect(() => {
    const previous = document.activeElement,
      root = ref.current;
    root?.querySelector("input,select,textarea,button")?.focus();
    return () => previous?.focus?.();
  }, []);
  useEffect(() => {
    const root = ref.current;
    const key = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        closeModal();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...root.querySelectorAll(
            "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
          ),
        ].filter((n) => !n.hidden);
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener("keydown", key);
    return () => root.removeEventListener("keydown", key);
  }, [busy, closeModal]);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4"
      onMouseDown={(e) => !busy && e.target === e.currentTarget && closeModal()}
    >
      <div
        ref={ref}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={label}
        aria-busy={busy}
        className={cx(
          "flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-xl",
          lg ? "max-w-4xl" : "max-w-xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id={label} className="text-lg font-bold">
            {title}
          </h2>
          <Btn
            v="ghost"
            sm
            disabled={busy}
            aria-label="Đóng"
            onClick={closeModal}
          >
            <Icon name="close" />
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({
  title,
  message,
  ok = "Xác nhận",
  danger,
  onConfirm,
}) {
  const { closeModal } = useStore();
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const result = await onConfirm();
      if (result !== false) closeModal();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title={title} busy={busy} alert>
      <div className="p-5">
        {message && <p className="text-slate-600">{message}</p>}
        {err && (
          <p role="alert" className="mt-3 text-red-700">
            {err}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Btn v="ghost" disabled={busy} onClick={closeModal}>
            Hủy
          </Btn>
          <Btn disabled={busy} v={danger ? "bad" : "pri"} onClick={run}>
            {busy ? "Đang xử lý…" : ok}
          </Btn>
        </div>
      </div>
    </Dialog>
  );
}
export const useAsk = () => {
  const { openModal } = useStore();
  return (o) => openModal(<Confirm {...o} />);
};
export function Form({ title, children, onSubmit, ok = "Lưu", lg, confirm }) {
  const { closeModal, toast } = useStore();
  const [err, setErr] = useState(""),
    [asking, setAsking] = useState(false),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!onSubmit || busy) return;
    if (confirm && !asking) {
      setErr("");
      setAsking(true);
      return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const msg = await onSubmit(fd);
      toast(typeof msg === "string" ? msg : "Đã lưu");
      closeModal();
    } catch (e) {
      setErr(e.message);
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title={title} busy={busy} lg={lg}>
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="overflow-auto px-5 py-4">{children}</div>
        {err && (
          <p
            role="alert"
            className="px-5 pb-3 text-sm font-semibold text-red-700"
          >
            {err}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {asking && (
            <span className="mr-auto text-sm text-amber-900">{confirm}</span>
          )}
          <Btn
            disabled={busy}
            v="ghost"
            onClick={() => (asking ? setAsking(false) : closeModal())}
          >
            {asking ? "Quay lại" : onSubmit ? "Hủy" : "Đóng"}
          </Btn>
          {onSubmit && (
            <Btn disabled={busy} type="submit">
              {busy ? "Đang lưu…" : asking ? "Xác nhận" : ok}
            </Btn>
          )}
        </div>
      </form>
    </Dialog>
  );
}
export const Row2 = ({ children }) => (
  <div className="grid gap-x-3.5 sm:grid-cols-2">{children}</div>
);
