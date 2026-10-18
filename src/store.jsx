import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { request, newRequestId } from "./lib/api.js";
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);
export function StoreProvider({ children }) {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [toasts, setToasts] = useState([]),
    [modal, setModal] = useState(null);
  const current = useRef(null),
    modalRevision = useRef(null),
    authEpoch = useRef(0),
    authPending = useRef(false),
    retries = useRef(new Map());
  const apply = useCallback((s) => {
    if (s.db) {
      const previous = current.current;
      if (
        previous &&
        previous.user?.id === s.user?.id &&
        previous.db.meta.revision > s.db.meta.revision
      )
        return;
      current.current = s;
      setState(s);
      setError("");
      setConnectionError("");
    }
  }, []);
  const toast = useCallback((msg, type = "ok") => {
    const id = newRequestId();
    setToasts((ts) => [...ts, { id, msg, type }]);
    setTimeout(
      () => setToasts((ts) => ts.filter((t) => t.id !== id)),
      type === "err" ? 6500 : 3500,
    );
  }, []);
  const refresh = useCallback(async () => {
    if (authPending.current) return current.current;
    const epoch = authEpoch.current;
    try {
      const s = await request("state");
      if (epoch === authEpoch.current) apply(s);
      return current.current || s;
    } catch (e) {
      if (epoch === authEpoch.current && current.current)
        setConnectionError(
          "Chưa thể đồng bộ với máy chủ. Dữ liệu đang hiển thị có thể chưa cập nhật.",
        );
      throw e;
    }
  }, [apply]);
  useEffect(() => {
    let active = true;
    request("state")
      .then((s) => active && apply(s))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [apply]);
  useEffect(() => {
    if (modal) return;
    const id = setInterval(() => refresh().catch(() => {}), 4000);
    return () => clearInterval(id);
  }, [modal, refresh]);
  const openModal = useCallback((m) => {
    modalRevision.current = current.current?.db.meta.revision;
    setModal(m);
  }, []);
  const closeModal = useCallback(() => {
    setModal(null);
    modalRevision.current = null;
  }, []);
  const handleFailure = useCallback(
    async (e) => {
      if (e.status === 409) {
        const s = await refresh();
        modalRevision.current = s.db.meta.revision;
      }
      if (e.status === 401) {
        await refresh();
        closeModal();
        location.hash = "#/login";
      }
    },
    [refresh, closeModal],
  );
  const execute = useCallback(
    async (action, ...args) => {
      const s = current.current,
        revision = modalRevision.current ?? s.db.meta.revision,
        // Retry cùng nội dung giữ mã dù polling đã tăng revision.
        key = JSON.stringify([s.user.id, action, args]);
      const requestId = retries.current.get(key) || newRequestId();
      retries.current.set(key, requestId);
      try {
        const data = await request("command", {
          csrf: s.csrf,
          body: { action, args, revision, requestId },
        });
        apply(data);
        retries.current.delete(key);
        return data.result;
      } catch (e) {
        if (e.status && e.status < 500) {
          retries.current.delete(key);
        }
        await handleFailure(e);
        if (!e.status || e.status >= 500)
          e.message +=
            " Chưa xác nhận kết quả thao tác. Kiểm tra dữ liệu hoặc thử lại cùng nội dung trước khi tạo thao tác khác.";
        throw e;
      }
    },
    [apply, handleFailure],
  );
  const act = useCallback(
    async (fn, okMsg) => {
      try {
        const r = await fn();
        toast(typeof r === "string" ? r : okMsg || "Đã lưu");
        return true;
      } catch (e) {
        toast(e.message, "err");
        return false;
      }
    },
    [toast],
  );
  const login = useCallback(
    async (username, password) => {
      const epoch = ++authEpoch.current;
      authPending.current = true;
      try {
        const s = await request("login", { body: { username, password } });
        if (epoch === authEpoch.current) {
          retries.current.clear();
          apply(s);
        }
      } finally {
        if (epoch === authEpoch.current) authPending.current = false;
      }
    },
    [apply],
  );
  const logout = useCallback(async () => {
    const epoch = ++authEpoch.current;
    authPending.current = true;
    try {
      const s = await request("logout", {
        csrf: current.current.csrf,
        body: {},
      });
      if (epoch !== authEpoch.current) return;
      retries.current.clear();
      apply(s);
      closeModal();
      location.hash = "#/";
    } finally {
      if (epoch === authEpoch.current) authPending.current = false;
    }
  }, [apply, closeModal]);
  const special = useCallback(
    async (path, body) => {
      try {
        const s = await request(path, {
          csrf: current.current?.csrf,
          body: {
            ...body,
            revision:
              modalRevision.current ?? current.current?.db.meta.revision,
          },
        });
        apply(s);
        return s.result;
      } catch (e) {
        await handleFailure(e);
        throw e;
      }
    },
    [apply, handleFailure],
  );
  const reset = useCallback(
    () => act(() => special("reset", { confirm: "RESET DEMO" })),
    [act, special],
  );
  const value = useMemo(
    () =>
      state && {
        db: state.db,
        ver: state.db.meta.revision,
        user: state.user,
        execute,
        toast,
        act,
        login,
        logout,
        reset,
        special,
        refresh,
        modal,
        openModal,
        closeModal,
      },
    [
      state,
      execute,
      toast,
      act,
      login,
      logout,
      reset,
      special,
      refresh,
      modal,
      openModal,
      closeModal,
    ],
  );
  if (!state)
    return (
      <div className="boot-screen">
        <div className="brand-mark">A</div>
        <h1>ABC English</h1>
        <p>{error || "Đang kết nối dữ liệu trung tâm…"}</p>
        {error && (
          <button onClick={() => refresh().catch((e) => setError(e.message))}>
            Thử kết nối lại
          </button>
        )}
      </div>
    );
  return (
    <Ctx.Provider value={value}>
      {connectionError && (
        <div className="connection-notice" role="status" aria-live="polite">
          <span>{connectionError}</span>
          <button
            type="button"
            onClick={() => refresh().catch((e) => toast(e.message, "err"))}
          >
            Kết nối lại
          </button>
        </div>
      )}
      {children}
      {modal}
      <div
        className="fixed right-4 bottom-4 z-[99] flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-lg ${t.type === "err" ? "bg-red-700" : "bg-teal-800"}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const fn = () => setH(location.hash);
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  return h.replace(/^#\/?/, "").split("/");
}
