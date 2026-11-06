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
import { scopeData } from "./lib/branch-access.js";
import { parseLocation } from "./lib/navigation.js";
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);
export function StoreProvider({ children }) {
  const [route] = useHash();
  const [state, setState] = useState(null),
    [selectedBranchId, setSelectedBranchId] = useState(""),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [toasts, setToasts] = useState([]),
    [modal, setModal] = useState(null);
  const current = useRef(null),
    branchContext = useRef(""),
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
      s = { ...s, site: s.site || previous?.site || { demoMode: true, contact: {} } };
      current.current = s;
      if (
        previous?.user?.id !== s.user?.id ||
        (branchContext.current && !s.db.branches.some((branch) => branch.id === branchContext.current))
      ) {
        setSelectedBranchId("");
        branchContext.current = "";
        setModal(null);
        modalRevision.current = null;
      }
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
  const setBranchId = useCallback((id) => {
    if (id && !current.current?.db.branches.some((branch) => branch.id === id)) return;
    branchContext.current = id;
    setSelectedBranchId(id);
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
        branchId = branchContext.current,
        key = JSON.stringify([s.user.id, branchId, action, args]);
      const requestId = retries.current.get(key) || newRequestId();
      retries.current.set(key, requestId);
      try {
        const data = await request("command", {
          csrf: s.csrf,
          body: { action, args, revision, requestId, branchId },
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
  const branches = state?.db.branches || [];
  const branchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : state?.user?.role !== "manager" && branches.length === 1
      ? branches[0].id
      : "";
  branchContext.current = branchId;
  const displayedDb = useMemo(
    () => state && route === "app" && branchId
      ? scopeData(state.db, state.user, branchId)
      : state?.db,
    [state, route, branchId],
  );
  const value = useMemo(
    () =>
      state && {
        db: displayedDb,
        branches,
        branchId,
        setBranchId,
        ver: state.db.meta.revision,
        user: state.user,
        site: state.site,
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
      displayedDb,
      branches,
      branchId,
      setBranchId,
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
        <div className="brand-mark">4</div>
        <h1>4ENGLISH</h1>
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
export function useRoute() {
  const [route, setRoute] = useState(() => parseLocation(location));
  useEffect(() => {
    const fn = () => setRoute(parseLocation(location));
    addEventListener("hashchange", fn);
    addEventListener("popstate", fn);
    return () => {
      removeEventListener("hashchange", fn);
      removeEventListener("popstate", fn);
    };
  }, []);
  return route;
}
export function useHash() { return useRoute().segments; }
