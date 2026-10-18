import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { openDatabase, hashPassword, validateDb } from "./database.js";
import { authFor, verifyPassword, newSession, digest } from "./auth.js";
import { dispatch, visibleData } from "./services/actions.js";
import { R, U, RuleError } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
process.env.TZ = "Asia/Ho_Chi_Minh";
const bodyOf = async (req) => {
  let bytes = 0,
    chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 2 * 1024 * 1024)
      throw Object.assign(Error("Nội dung vượt 2 MB."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new RuleError("Nội dung JSON phải là một đối tượng.");
    return value;
  } catch (e) {
    if (e instanceof RuleError) throw e;
    throw new RuleError("JSON không hợp lệ.");
  }
};
export function createApp({
  dbPath = process.env.ABC_DB_PATH || resolve("data/abc-english.sqlite"),
  dist = resolve("dist"),
  origins = [],
} = {}) {
  const database = openDatabase(dbPath),
    attempts = new Map();
  const snapshot = (req) => {
    const auth = authFor(database, req);
    return {
      db: visibleData(database.load(), auth?.user),
      user: auth?.user || null,
      csrf: auth?.session.csrf || null,
    };
  };
  const audit = (db, user, action, args = []) => {
    db.audit.push({
      id: U.id("au"),
      at: new Date().toISOString(),
      by: user.name,
      userId: user.id,
      action,
      target: typeof args[0] === "string" ? args[0] : "",
      note: ["saveUser", "changePassword"].includes(action)
        ? "Thay đổi tài khoản (ẩn mật khẩu)"
        : "Đã ghi nhận thay đổi",
    });
  };
  const sweep = () =>
    database.transact(() => {
      const db = database.load();
      const n = R.sweepExpired(db);
      if (n) {
        db.meta.revision++;
        audit(db, { id: "sys", name: "Hệ thống" }, "expirePending", [
          String(n),
        ]);
        database.save(db);
      }
    });
  const send = (res, status, data, headers = {}) => {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    });
    res.end(JSON.stringify(data));
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(req.method))
          return send(res, 405, { error: "Không hỗ trợ phương thức này." });
        const file = resolve(
          dist,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        );
        if (
          !file.startsWith(dist + sep) ||
          !existsSync(file) ||
          !statSync(file).isFile()
        )
          return send(res, 404, {
            error: "Chưa build giao diện hoặc không tìm thấy tệp.",
          });
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".ico": "image/x-icon",
        };
        res.writeHead(200, {
          "content-type": types[extname(file)] || "application/octet-stream",
          "x-content-type-options": "nosniff",
          "content-security-policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
        });
        return res.end(req.method === "HEAD" ? undefined : readFileSync(file));
      }
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(res, 200, { ok: true, schema: 2 });
      sweep();
      const auth = authFor(database, req);
      if (req.method === "GET" && url.pathname === "/api/state")
        return send(res, 200, snapshot(req));
      if (req.method === "GET" && url.pathname === "/api/backup") {
        R.need(auth?.user, "master");
        const db = database.load();
        for (const u of db.users) delete u.password;
        return send(res, 200, {
          format: "ABC-English-v2",
          exportedAt: new Date().toISOString(),
          db,
        });
      }
      if (req.method !== "POST")
        return send(res, 404, { error: "API không tồn tại." });
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}` &&
        !origins.includes(origin)
      )
        return send(res, 403, {
          error: "Nguồn gửi yêu cầu không được chấp nhận.",
        });
      if (
        !String(req.headers["content-type"] || "").startsWith(
          "application/json",
        )
      )
        return send(res, 415, { error: "Chỉ nhận application/json." });
      const p = await bodyOf(req);
      if (url.pathname === "/api/login") {
        const username = String(p.username || "")
          .trim()
          .toLowerCase();
        const key = req.socket.remoteAddress + ":" + username,
          entry = attempts.get(key);
        if (entry?.count >= 8 && entry.until > Date.now())
          return send(res, 429, {
            error: "Quá nhiều lần đăng nhập. Thử lại sau 5 phút.",
          });
        const user = database.load().users.find((u) => u.username === username);
        const hash =
          user &&
          database.sql
            .prepare("SELECT password_hash FROM users WHERE id=?")
            .get(user.id)?.password_hash;
        if (
          !user ||
          typeof p.password !== "string" ||
          p.password.length > 256 ||
          !verifyPassword(p.password, hash)
        ) {
          attempts.set(key, {
            count: entry?.until > Date.now() ? entry.count + 1 : 1,
            until: Date.now() + 300000,
          });
          if (attempts.size > 2000)
            for (const [k, v] of attempts)
              if (v.until < Date.now()) attempts.delete(k);
          return send(res, 401, {
            error: "Tên đăng nhập hoặc mật khẩu không đúng.",
          });
        }
        attempts.delete(key);
        const { token, csrf } = newSession(database, user.id);
        return send(
          res,
          200,
          { db: visibleData(database.load(), user), user, csrf },
          {
            "set-cookie": `abc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.socket.encrypted ? "; Secure" : ""}`,
          },
        );
      }
      if (url.pathname === "/api/leads") {
        const key = "lead:" + req.socket.remoteAddress,
          entry = attempts.get(key);
        if (entry?.until > Date.now() && entry.count >= 5)
          return send(res, 429, {
            error: "Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.",
          });
        const result = database.transact(() => {
          const db = database.load();
          const r = R.createLead(db, p);
          db.meta.revision++;
          database.save(db);
          return r;
        });
        attempts.set(key, {
          count: entry?.until > Date.now() ? entry.count + 1 : 1,
          until: Date.now() + 300000,
        });
        return send(res, 200, { result });
      }
      if (!auth)
        return send(res, 401, {
          error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
      if (req.headers["x-csrf-token"] !== auth.session.csrf)
        return send(res, 403, {
          error: "Mã bảo vệ phiên không hợp lệ. Tải lại trang.",
        });
      if (url.pathname === "/api/logout") {
        database.sql
          .prepare("DELETE FROM auth_sessions WHERE token=?")
          .run(auth.session.token);
        return send(
          res,
          200,
          { ...snapshot(req), user: null, csrf: null },
          {
            "set-cookie":
              "abc_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          },
        );
      }
      if (url.pathname === "/api/command") {
        if (
          typeof p.requestId !== "string" ||
          !/^[a-zA-Z0-9_-]{12,100}$/.test(p.requestId)
        )
          throw new RuleError("Thiếu mã giao dịch hợp lệ.");
        const fingerprint = digest(JSON.stringify([p.action, p.args])),
          previous = database.sql
            .prepare("SELECT * FROM operations WHERE key=?")
            .get(p.requestId);
        if (previous) {
          if (
            previous.user_id !== auth.user.id ||
            previous.fingerprint !== fingerprint
          )
            throw new RuleError("Mã giao dịch đã dùng cho thao tác khác.");
          return send(res, 200, {
            ...snapshot(req),
            result: JSON.parse(previous.result),
          });
        }
        const result = database.transact(() => {
          const db = database.load();
          if (p.revision !== db.meta.revision)
            throw Object.assign(
              Error(
                "Dữ liệu đã được người khác cập nhật. Trang đã tải dữ liệu mới; hãy kiểm tra rồi lưu lại.",
              ),
              { status: 409 },
            );
          const result = dispatch(db, auth.user, p.action, p.args);
          audit(db, auth.user, p.action, p.args);
          db.meta.revision++;
          database.save(db);
          if (
            p.action === "deleteUser" ||
            (p.action === "saveUser" && p.args[0] && p.args[1]?.password)
          )
            database.sql
              .prepare("DELETE FROM auth_sessions WHERE user_id=? AND token<>?")
              .run(p.args[0], auth.session.token);
          const clean =
            typeof result === "object" ? structuredClone(result) : result;
          if (clean && typeof clean === "object") {
            delete clean.password;
            delete clean.passwordHash;
          }
          database.sql
            .prepare("INSERT INTO operations VALUES(?,?,?,?,?)")
            .run(
              p.requestId,
              auth.user.id,
              fingerprint,
              JSON.stringify(clean ?? null),
              Date.now(),
            );
          return clean;
        });
        return send(res, 200, { ...snapshot(req), result });
      }
      if (url.pathname === "/api/change-password") {
        const hash = database.sql
          .prepare("SELECT password_hash FROM users WHERE id=?")
          .get(auth.user.id).password_hash;
        if (typeof p.current !== "string" || !verifyPassword(p.current, hash))
          throw new RuleError("Mật khẩu hiện tại không đúng.");
        if (
          typeof p.password !== "string" ||
          p.password.length < 6 ||
          p.password.length > 256
        )
          throw new RuleError("Mật khẩu mới cần 6–256 ký tự.");
        database.transact(() => {
          const db = database.load();
          audit(db, auth.user, "changePassword");
          db.meta.revision++;
          database.save(db, { [auth.user.id]: hashPassword(p.password) });
          database.sql
            .prepare("DELETE FROM auth_sessions WHERE user_id=? AND token<>?")
            .run(auth.user.id, auth.session.token);
        });
        return send(res, 200, {
          ...snapshot(req),
          result: "Đã đổi mật khẩu và đăng xuất các phiên khác.",
        });
      }
      if (url.pathname === "/api/restore") {
        R.need(auth.user, "master");
        if (p.confirm !== "KHOI PHUC")
          throw new RuleError("Nhập KHOI PHUC để xác nhận.");
        const data = p.backup;
        if (
          data?.format !== "ABC-English-v2" ||
          !data.db ||
          typeof data.db !== "object" ||
          Array.isArray(data.db)
        )
          throw new RuleError("Định dạng sao lưu không hợp lệ.");
        database.transact(() => {
          const old = database.load();
          if (p.revision !== old.meta.revision)
            throw Object.assign(
              Error("Dữ liệu đã thay đổi; tải lại trước khi khôi phục."),
              { status: 409 },
            );
          const db = structuredClone(data.db);
          db.users = old.users;
          try {
            validateDb(db);
          } catch (e) {
            throw new RuleError(e.message);
          }
          db.meta.revision = old.meta.revision + 1;
          audit(db, auth.user, "restore");
          database.save(db);
          database.sql.exec("DELETE FROM operations");
        });
        return send(res, 200, {
          ...snapshot(req),
          result:
            "Đã khôi phục dữ liệu nghiệp vụ; tài khoản hiện tại được giữ lại.",
        });
      }
      if (url.pathname === "/api/reset") {
        R.need(auth.user, "master");
        if (p.confirm !== "RESET DEMO")
          throw new RuleError("Thiếu xác nhận RESET DEMO.");
        database.transact(() => {
          const old = database.load();
          if (p.revision !== old.meta.revision)
            throw Object.assign(
              Error("Dữ liệu đã thay đổi; tải lại trước khi khôi phục demo."),
              { status: 409 },
            );
          const db = Seed.build();
          db.users = old.users;
          for (const u of old.users.filter((u) => u.role === "teacher"))
            if (!db.teachers.some((t) => t.id === u.teacherId))
              db.teachers.push(old.teachers.find((t) => t.id === u.teacherId));
          db.meta.revision = old.meta.revision + 1;
          validateDb(db);
          audit(db, auth.user, "resetDemo");
          database.save(db);
          database.sql.exec("DELETE FROM operations");
        });
        return send(res, 200, {
          ...snapshot(req),
          result: "Đã khôi phục dữ liệu demo; giữ nguyên tài khoản.",
        });
      }
      return send(res, 404, { error: "API không tồn tại." });
    } catch (e) {
      const status = e.status || (e instanceof RuleError ? 422 : 500);
      if (status === 500) console.error("API:", e.message);
      send(res, status, {
        error:
          status === 500
            ? "Không thể lưu/đọc dữ liệu. Máy chủ đã hủy giao dịch; hãy kiểm tra terminal và bản sao lưu."
            : e.message,
      });
    }
  });
  return {
    server,
    database,
    close: async () => {
      await new Promise((r) => server.close(r));
      database.close();
    },
  };
}
