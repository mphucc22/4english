import {
  createHash,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
export const digest = (s) => createHash("sha256").update(s).digest("hex");
export function verifyPassword(password, hash) {
  try {
    const [salt, hex] = hash.split(":");
    const expected = Buffer.from(hex, "hex"),
      actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export function authFor(database, req) {
  const value = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("abc_session="))
    ?.slice(12);
  if (!value) return null;
  const session = database.sql
    .prepare("SELECT * FROM auth_sessions WHERE token=? AND expires>?")
    .get(digest(value), Date.now());
  if (!session) return null;
  const user = database.load().users.find((u) => u.id === session.user_id);
  return user ? { user, session } : null;
}
export function newSession(database, userId) {
  const token = randomBytes(32).toString("hex"),
    csrf = randomBytes(24).toString("hex");
  database.sql
    .prepare("DELETE FROM auth_sessions WHERE expires<?")
    .run(Date.now());
  database.sql
    .prepare("INSERT INTO auth_sessions VALUES(?,?,?,?)")
    .run(digest(token), userId, csrf, Date.now() + 8 * 60 * 60 * 1000);
  return { token, csrf };
}
