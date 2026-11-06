import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { openDatabase, hashPassword, validateDb } from "./database.js";
import { authFor, verifyPassword, newSession, digest } from "./auth.js";
import { dispatch, visibleData, actions } from "./services/actions.js";
import { R, U, RuleError } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
import { allowedBranchIds, actionBranchIds } from "../src/lib/branch-access.js";
import { migrateBranchData } from "./branch-migration.js";
import { migrateTeacherData } from "./teacher-migration.js";
import { isLoginAllowed } from "../src/lib/teacher-identity.js";
import { pageMeta } from "../src/lib/page-meta.js";
import { parseLocation } from "../src/lib/navigation.js";
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
  demoMode = process.env.ABC_DEMO_MODE !== "false",
  contact = {},
  publicUrl = process.env.ABC_PUBLIC_URL || "",
} = {}) {
  const text = (value, max = 160) => typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
  const socialUrl = (value, hosts) => {
    try {
      const url = new URL(text(value, 500));
      return url.protocol === "https:" && !url.username && !url.password &&
        hosts.includes(url.hostname.toLowerCase()) ? url.href : "";
    } catch { return ""; }
  };
  const email = text(contact.email ?? process.env.ABC_CONTACT_EMAIL, 254);
  const hotline = text(contact.hotline ?? process.env.ABC_HOTLINE, 30);
  let publicOrigin = "";
  try {
    const address = new URL(publicUrl);
    if (["https:", "http:"].includes(address.protocol) && !address.username && !address.password &&
        address.pathname === "/" && !address.search && !address.hash) publicOrigin = address.origin;
  } catch { /* Canonical URLs use the validated request host when no public URL is configured. */ }
  const site = {
    demoMode: demoMode !== false,
    publicUrl: publicOrigin,
    contact: {
      email: /^[^\s@<>:"\\]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) ? email : "",
      hotline: /^\+?[\d .()-]{7,25}$/.test(hotline) && hotline.replace(/\D/g, "").length >= 7 && hotline.replace(/\D/g, "").length <= 15 ? hotline : "",
      hours: text(contact.hours ?? process.env.ABC_OPENING_HOURS),
      zaloUrl: socialUrl(contact.zaloUrl ?? process.env.ABC_ZALO_URL, ["zalo.me", "www.zalo.me", "oa.zalo.me"]),
      facebookUrl: socialUrl(contact.facebookUrl ?? process.env.ABC_FACEBOOK_URL, ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"]),
    },
  };
  const database = openDatabase(dbPath),
    attempts = new Map();
  const snapshot = (req) => {
    const auth = authFor(database, req);
    return {
      db: visibleData(database.load(), auth?.user),
      user: auth?.user || null,
      csrf: auth?.session.csrf || null,
      site,
    };
  };
  const audit = (db, user, action, args = []) => {
    db.audit.push({
      id: U.id("au"),
      at: new Date().toISOString(),
      by: user.name,
      userId: user.id,
      branchIds: user.auditBranchIds || [],
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
  const escapeMarkup = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const requestOrigin = (req) => {
    if (publicOrigin) return publicOrigin;
    const host = String(req.headers.host || "");
    if (!/^(?:[A-Za-z0-9.-]+|\[[A-Fa-f0-9:]+\])(?::\d{1,5})?$/.test(host)) return "http://localhost";
    try { return new URL(`${req.socket.encrypted ? "https" : "http"}://${host}`).origin; }
    catch { return "http://localhost"; }
  };
  const publicHtml = (template, meta, origin) => {
    const title = escapeMarkup(meta.title), description = escapeMarkup(meta.description);
    const canonical = escapeMarkup(origin + meta.path);
    const head = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="robots" content="${meta.noindex ? "noindex, nofollow" : "index, follow"}" />`,
      `<link rel="canonical" href="${canonical}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      `<meta property="og:image" content="${escapeMarkup(origin + "/images/4english-study-space-1448.webp")}" />`,
      '<meta property="og:image:alt" content="Góc học tiếng Anh 4ENGLISH với máy tính, sách và tai nghe, không có người" />',
      '<meta property="og:image:width" content="1448" />',
      '<meta property="og:image:height" content="1086" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="4ENGLISH" />',
    ].join("\n    ");
    return template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|robots|og:title|og:description|og:url|og:type|og:site_name|og:image(?::alt|:width|:height)?)["'][^>]*>/gi, "")
      .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, "")
      .replace(/<\/head>/i, () => `${head}\n  </head>`);
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(req.method))
          return send(res, 405, { error: "Không hỗ trợ phương thức này." });
        if (["/robots.txt", "/sitemap.xml"].includes(url.pathname)) {
          const origin = requestOrigin(req);
          const robots = site.demoMode ? "User-agent: *\nDisallow: /\n" : [
            "User-agent: *", "Disallow: /api/", "Disallow: /app/", "Disallow: /dang-nhap",
            "Disallow: /tu-van", `Sitemap: ${origin}/sitemap.xml`, "",
          ].join("\n");
          const db = database.load();
          const paths = site.demoMode ? [] : [
            "/", "/co-so", "/khoa-hoc", "/kiem-tra-dau-vao", "/lien-he", "/chinh-sach-bao-mat", "/dieu-khoan",
            ...db.branches.map((branch) => `/co-so/${encodeURIComponent(branch.id)}`),
            ...db.courses.map((course) => `/khoa-hoc/${encodeURIComponent(course.id)}`),
          ];
          const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            [...new Set(paths)].map((path) => `  <url><loc>${escapeMarkup(origin + path)}</loc></url>`).join("\n") + "\n</urlset>\n";
          res.writeHead(200, { "content-type": url.pathname === "/robots.txt" ? "text/plain; charset=utf-8" : "application/xml; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" });
          return res.end(req.method === "HEAD" ? undefined : url.pathname === "/robots.txt" ? robots : sitemap);
        }
        const publicRoute = /^\/(?:co-so|khoa-hoc)(?:\/[A-Za-z0-9_-]+)?\/?$/.test(url.pathname) ||
          /^\/tu-van(?:\/[A-Za-z0-9_-]+)?\/?$/.test(url.pathname) ||
          /^\/(?:kiem-tra-dau-vao|lien-he|chinh-sach-bao-mat|dieu-khoan|dang-nhap)\/?$/.test(url.pathname);
        const file = resolve(
          dist,
          "." +
            decodeURIComponent(
              url.pathname === "/" || publicRoute ? "/index.html" : url.pathname,
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
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".avif": "image/avif",
          ".pdf": "application/pdf",
          ".txt": "text/plain; charset=utf-8",
          ".ico": "image/x-icon",
        };
        const isAppHtml = file === resolve(dist, "index.html");
        const pageDb = isAppHtml ? database.load() : null;
        const segments = parseLocation({ pathname: url.pathname === "/index.html" ? "/" : url.pathname, search: url.search }).segments;
        const meta = isAppHtml ? pageMeta(segments, pageDb, site) : null;
        const missingPage = meta && (segments[0] === "not-found" ||
          (segments[0] === "branch" && !pageDb.branches.some((branch) => branch.id === segments[1])) ||
          (segments[0] === "course" && !pageDb.courses.some((course) => course.id === segments[1])));
        res.writeHead(missingPage ? 404 : 200, {
          "content-type": types[extname(file)] || "application/octet-stream",
          "x-content-type-options": "nosniff",
          "content-security-policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; frame-ancestors 'none'",
        });
        return res.end(req.method === "HEAD" ? undefined : isAppHtml
          ? publicHtml(readFileSync(file, "utf8"), meta, requestOrigin(req)) : readFileSync(file));
      }
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(res, 200, { ok: true, schema: 2 });
      sweep();
      let auth = authFor(database, req);
      if (req.method === "GET" && url.pathname === "/api/state")
        return send(res, 200, snapshot(req));
      if (req.method === "GET" && url.pathname === "/api/backup") {
        R.need(auth?.user, "system");
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
        const loginDb = database.load();
        const user = loginDb.users.find((u) => u.username === username);
        const hash =
          user &&
          database.sql
            .prepare("SELECT password_hash FROM users WHERE id=?")
            .get(user.id)?.password_hash;
        if (
          !user ||
          !isLoginAllowed(loginDb, user) ||
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
          { db: visibleData(database.load(), user), user, csrf, site },
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
        const outcome = database.transact(() => {
          const db = database.load();
          const r = R.createLead(db, p);
          db.meta.revision++;
          database.save(db);
          const lead = db.leads.at(-1);
          return {
            result: r,
            receipt: Object.fromEntries([
              "id", "name", "phone", "courseId", "course", "branchId", "branchName",
              "classId", "classCode", "classSchedule", "contactTime", "contactTimeLabel", "createdAt",
            ].map((key) => [key, lead[key]])),
          };
        });
        attempts.set(key, {
          count: entry?.until > Date.now() ? entry.count + 1 : 1,
          until: Date.now() + 300000,
        });
        return send(res, 200, outcome);
      }
      // Body parsing yields to other requests; re-read grants and session now.
      auth = authFor(database, req);
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
        if (typeof p.action !== "string" || !Object.hasOwn(actions, p.action) ||
          !Array.isArray(p.args) || p.args.length > 5)
          throw new RuleError("Thao tác không hợp lệ.");
        if (p.branchId !== undefined && typeof p.branchId !== "string")
          throw new RuleError("Cơ sở đang chọn không hợp lệ.");
        const branchId = p.branchId || "";
        if (branchId && !allowedBranchIds(database.load(), auth.user).includes(branchId))
          throw Object.assign(new RuleError("Bạn không được thao tác tại cơ sở này."), { status: 403 });
        const actor = { ...auth.user, activeBranchId: branchId };
        if (
          typeof p.requestId !== "string" ||
          !/^[a-zA-Z0-9_-]{12,100}$/.test(p.requestId)
        )
          throw new RuleError("Thiếu mã giao dịch hợp lệ.");
        const fingerprint = digest(JSON.stringify([p.action, p.args, branchId])),
          previous = database.sql
            .prepare("SELECT * FROM operations WHERE key=?")
            .get(p.requestId);
        if (previous) {
          if (
            previous.user_id !== auth.user.id ||
            previous.fingerprint !== fingerprint
          )
            throw new RuleError("Mã giao dịch đã dùng cho thao tác khác.");
          // A cached result never bypasses a newly revoked role or branch grant.
          R.authorizeAction(database.load(), actor, p.action, p.args);
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
          const touched = [...new Set(actionBranchIds(db, p.action, p.args)
            .filter((id) => db.branches.some((b) => b.id === id)))];
          const oldUsers = new Map(db.users.map((user) => [user.id, { ...user }]));
          const result = dispatch(db, actor, p.action, p.args);
          audit(db, { ...auth.user, auditBranchIds: touched }, p.action, p.args);
          db.meta.revision++;
          database.save(db);
          for (const [id, oldUser] of oldUsers) {
            const updated = db.users.find((user) => user.id === id);
            if (!isLoginAllowed(db, updated) || updated?.role !== oldUser.role ||
              updated?.teacherId !== oldUser.teacherId)
              database.sql.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(id);
          }
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
        R.need(auth.user, "system");
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
          // Keep the branches referenced by retained staff assignments.
          if (Array.isArray(db.branches))
            for (const branch of old.branches)
              if (old.users.some((u) => u.branchIds?.includes(branch.id)) &&
                !db.branches.some((b) => b.id === branch.id)) db.branches.push(branch);
          if (Array.isArray(db.teachers))
            for (const account of old.users.filter((user) => user.role === "teacher")) {
              const profile = db.teachers.find((teacher) => teacher.id === account.teacherId);
              if (profile) profile.branchIds = [...account.branchIds];
            }
          try {
            validateDb(db, { allowTeacherResync: true });
            migrateBranchData(db);
            // Restored profiles must match the retained current accounts.
            delete db.meta.teacherIdentityVersion;
            migrateTeacherData(db);
            validateDb(db);
          } catch (e) {
            throw new RuleError(e.message);
          }
          db.meta.revision = old.meta.revision + 1;
          audit(db, auth.user, "restore");
          database.save(db);
          for (const user of db.users)
            if (!isLoginAllowed(db, user))
              database.sql.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
          database.sql.exec("DELETE FROM operations");
        });
        return send(res, 200, {
          ...snapshot(req),
          result:
            "Đã khôi phục dữ liệu nghiệp vụ; tài khoản hiện tại được giữ lại.",
        });
      }
      if (url.pathname === "/api/reset") {
        if (!site.demoMode)
          return send(res, 403, { error: "Khôi phục dữ liệu demo đã tắt ở chế độ vận hành." });
        R.need(auth.user, "system");
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
          for (const branch of old.branches)
            if (old.users.some((u) => u.branchIds?.includes(branch.id)) &&
              !db.branches.some((b) => b.id === branch.id)) db.branches.push(branch);
          for (const u of old.users.filter((u) => u.role === "teacher"))
            if (!db.teachers.some((t) => t.id === u.teacherId))
              db.teachers.push(old.teachers.find((t) => t.id === u.teacherId));
          for (const account of old.users.filter((user) => user.role === "teacher")) {
            const profile = db.teachers.find((teacher) => teacher.id === account.teacherId);
            if (profile) profile.branchIds = [...account.branchIds];
          }
          delete db.meta.teacherIdentityVersion;
          migrateTeacherData(db);
          db.meta.revision = old.meta.revision + 1;
          validateDb(db);
          audit(db, auth.user, "resetDemo");
          database.save(db);
          for (const user of db.users)
            if (!isLoginAllowed(db, user))
              database.sql.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
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
