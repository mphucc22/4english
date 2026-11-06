import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { scopeData } from "../src/lib/branch-access.js";
import { isLoginAllowed } from "../src/lib/teacher-identity.js";

const directory = mkdtempSync(join(tmpdir(), "4english-teacher-api-"));
const app = createApp({ dbPath: join(directory, "teachers.sqlite") });
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}/api/`;
after(async () => {
  await app.close();
  rmSync(directory, { recursive: true, force: true });
});

async function call(path, session, body) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(session ? { cookie: session.cookie, "x-csrf-token": session.csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

async function login(username = "quanly") {
  const result = await call("login", null, { username, password: "123456" });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return { ...result.data, cookie: result.cookie };
}

async function command(session, action, args) {
  const snapshot = await call("state", session);
  return call("command", session, {
    action,
    args,
    revision: snapshot.data.db.meta.revision,
    requestId: crypto.randomUUID(),
  });
}

async function createTeacher(manager, name, branchIds = ["br1"]) {
  const result = await command(manager, "saveMaster", ["teachers", null, {
    name,
    branchIds,
    phone: "0901234567",
    email: "teacher@example.test",
    specialty: "Giao tiếp",
    status: "Đang dạy",
  }]);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const profile = result.data.db.teachers.find((teacher) => teacher.name === name);
  assert(profile, "The saved teacher must be returned in the central snapshot.");
  return profile;
}

async function createTeacherAccount(manager, profile, username, extra = {}) {
  const result = await command(manager, "saveUser", [null, {
    name: "Tên tài khoản không được thay hồ sơ",
    username,
    role: "teacher",
    teacherId: profile.id,
    branchIds: profile.branchIds,
    password: "123456",
    ...extra,
  }]);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data.db.users.find((user) => user.username === username);
}

async function saveTeacher(manager, teacherId, updates) {
  const current = (await call("state", manager)).data.db.teachers.find((teacher) => teacher.id === teacherId);
  return command(manager, "saveMaster", ["teachers", teacherId, { ...current, ...updates }]);
}

test("TEACHAPI01: teacher login uses canonical name and one profile cannot receive duplicate accounts", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Canonical API");
  const account = await createTeacherAccount(manager, profile, "teacher.canonical");
  assert.equal(account.name, profile.name);
  assert.deepEqual(account.branchIds, profile.branchIds);
  const teacher = await login(account.username);
  assert.equal(teacher.user.name, profile.name);
  assert.equal(teacher.user.teacherId, profile.id);
  const before = app.database.load();
  const duplicate = await command(manager, "saveUser", [null, {
    name: profile.name,
    username: "teacher.duplicate",
    role: "teacher",
    teacherId: profile.id,
    branchIds: profile.branchIds,
    password: "123456",
  }]);
  assert.equal(duplicate.status, 422);
  assert.deepEqual(app.database.load(), before, "Rejected duplicate must not write or advance the revision.");
});

test("TEACHAPI02: profile rename and work-location changes synchronize the linked account and live session", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Rename API");
  const account = await createTeacherAccount(manager, profile, "teacher.rename");
  const session = await login(account.username);
  const renamed = await saveTeacher(manager, profile.id, { name: "Teacher Canonical Renamed API" });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  assert.equal(renamed.data.db.users.find((user) => user.id === account.id).name, "Teacher Canonical Renamed API");
  const afterRename = await call("state", session);
  assert.equal(afterRename.data.user.name, "Teacher Canonical Renamed API");
  const moved = await saveTeacher(manager, profile.id, { branchIds: ["br2"] });
  assert.equal(moved.status, 200, JSON.stringify(moved.data));
  assert.deepEqual(moved.data.db.users.find((user) => user.id === account.id).branchIds, ["br2"]);
  const afterMove = await call("state", session);
  assert.deepEqual(afterMove.data.user.branchIds, ["br2"]);
  assert.deepEqual(afterMove.data.db.branches.map((branch) => branch.id), ["br2"]);
});

test("TEACHAPI03: forged account branches cannot diverge from the teacher profile", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Branch Guard API");
  const before = app.database.load();
  const forged = await command(manager, "saveUser", [null, {
    name: profile.name,
    username: "teacher.forged.scope",
    role: "teacher",
    teacherId: profile.id,
    branchIds: ["br2"],
    password: "123456",
  }]);
  assert.equal(forged.status, 422);
  assert.deepEqual(app.database.load(), before);
  const inferred = await command(manager, "saveUser", [null, {
    username: "teacher.derived.scope",
    role: "teacher",
    teacherId: profile.id,
    password: "123456",
  }]);
  assert.equal(inferred.status, 200, JSON.stringify(inferred.data));
  const account = inferred.data.db.users.find((user) => user.username === "teacher.derived.scope");
  assert.equal(account.name, profile.name);
  assert.deepEqual(account.branchIds, ["br1"]);
});

test("TEACHAPI04: a branch manager cannot link a profile with work locations outside their authority", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Multi Branch API", ["br1", "br2"]);
  const created = await command(manager, "saveUser", [null, {
    name: "Local supervisor",
    username: "teacher.local.manager",
    password: "123456",
    role: "branch_manager",
    branchIds: ["br1"],
  }]);
  assert.equal(created.status, 200);
  const supervisor = await login("teacher.local.manager");
  const before = app.database.load();
  const blocked = await command(supervisor, "saveUser", [null, {
    name: profile.name,
    username: "teacher.foreign.profile",
    password: "123456",
    role: "teacher",
    teacherId: profile.id,
    branchIds: ["br1", "br2"],
  }]);
  assert.equal(blocked.status, 422);
  assert.deepEqual(app.database.load(), before);
});

test("TEACHAPI05: stopped profile blocks new login, revokes the old session, and reactivation does not revive it", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Leave API");
  const account = await createTeacherAccount(manager, profile, "teacher.leave");
  const oldSession = await login(account.username);
  const stopped = await saveTeacher(manager, profile.id, { status: "Nghỉ" });
  assert.equal(stopped.status, 200, JSON.stringify(stopped.data));
  assert.equal((await call("login", null, { username: account.username, password: "123456" })).status, 401);
  assert.equal((await call("state", oldSession)).data.user, null);
  const forbidden = await call("change-password", oldSession, { current: "123456", password: "654321" });
  assert.equal(forbidden.status, 401);
  const active = await saveTeacher(manager, profile.id, { status: "Đang dạy" });
  assert.equal(active.status, 200);
  assert.equal((await call("state", oldSession)).data.user, null);
  const current = await login(account.username);
  assert.equal(current.user.teacherId, profile.id);
});

test("TEACHAPI06: manual account lock survives profile reactivation and old cookies remain revoked", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Manual Lock API");
  const account = await createTeacherAccount(manager, profile, "teacher.manual.lock");
  const oldSession = await login(account.username);
  const locked = await command(manager, "saveUser", [account.id, { ...account, disabled: true }]);
  assert.equal(locked.status, 200, JSON.stringify(locked.data));
  assert.equal((await call("state", oldSession)).data.user, null);
  assert.equal((await call("login", null, { username: account.username, password: "123456" })).status, 401);
  assert.equal((await saveTeacher(manager, profile.id, { status: "Nghỉ" })).status, 200);
  assert.equal((await saveTeacher(manager, profile.id, { status: "Đang dạy" })).status, 200);
  assert.equal((await call("login", null, { username: account.username, password: "123456" })).status, 401);
  const unlocked = await command(manager, "saveUser", [account.id, { ...account, disabled: false }]);
  assert.equal(unlocked.status, 200);
  assert.equal((await call("state", oldSession)).data.user, null);
  await login(account.username);
});

test("TEACHAPI07: scheduling honors teacher work locations without requiring a login account", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Scheduling API");
  const state = (await call("state", manager)).data.db;
  const term = state.terms[1];
  const created = await command(manager, "createClass", [{ courseId: "co2", branchId: "br2", termId: term.id }]);
  assert.equal(created.status, 200);
  const classId = created.data.result.id;
  const schedule = {
    weekdays: [2, 4],
    start: "12:00",
    end: "13:30",
    roomId: "br2r3",
    teacherId: profile.id,
    startDate: term.start,
  };
  const before = app.database.load();
  const wrongBranch = await command(manager, "setSchedule", [classId, schedule]);
  assert.equal(wrongBranch.status, 422);
  assert.deepEqual(app.database.load(), before);
  const expanded = await saveTeacher(manager, profile.id, { branchIds: ["br1", "br2"] });
  assert.equal(expanded.status, 200);
  assert(!expanded.data.db.users.some((user) => user.role === "teacher" && user.teacherId === profile.id));
  const scheduled = await command(manager, "setSchedule", [classId, schedule]);
  assert.equal(scheduled.status, 200, JSON.stringify(scheduled.data));
  assert(scheduled.data.db.sessions.some((session) => session.classId === classId && session.teacherId === profile.id));
  assert.equal((await command(manager, "openRegistration", [classId])).status, 200);
  const snapshot = app.database.load();
  assert.equal((await saveTeacher(manager, profile.id, { branchIds: ["br1"] })).status, 422);
  assert.deepEqual(app.database.load(), snapshot);
  assert.equal((await saveTeacher(manager, profile.id, { status: "Nghỉ" })).status, 422);
  assert.deepEqual(app.database.load(), snapshot);
});

test("TEACHAPI08: restoring an older backup preserves current teacher grants and resynchronizes the retained login name", async () => {
  const manager = await login();
  const profile = await createTeacher(manager, "Teacher Backup Baseline API", ["br1", "br2"]);
  const account = await createTeacherAccount(manager, profile, "teacher.restore.scope");
  const backup = await call("backup", manager);
  assert.equal(backup.status, 200);
  const restricted = await saveTeacher(manager, profile.id, {
    name: "Teacher Restricted Since Backup API",
    branchIds: ["br1"],
  });
  assert.equal(restricted.status, 200);
  const beforeRestore = (await call("state", manager)).data;
  const restored = await call("restore", manager, {
    confirm: "KHOI PHUC",
    backup: backup.data,
    revision: beforeRestore.db.meta.revision,
  });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  const retained = restored.data.db.users.find((user) => user.id === account.id);
  const restoredProfile = restored.data.db.teachers.find((teacher) => teacher.id === profile.id);
  assert.equal(retained.username, account.username);
  assert.equal(retained.teacherId, profile.id);
  assert.equal(restoredProfile.name, profile.name);
  assert.equal(retained.name, restoredProfile.name);
  assert.deepEqual(restoredProfile.branchIds, ["br1"]);
  assert.deepEqual(retained.branchIds, ["br1"], "Restoring wider historic work locations must not widen retained login grants.");
  const session = await login(account.username);
  assert.equal(session.user.id, account.id);
  assert.deepEqual(session.db.branches.map((branch) => branch.id), ["br1"]);
});

test("TEACHAPI09: resetting demo data retains restricted grants rather than restoring seed-wide teacher access", async () => {
  const manager = await login();
  const current = (await call("state", manager)).data.db;
  const account = current.users.find((user) => user.username === "gv1");
  assert(account);
  const restricted = await saveTeacher(manager, account.teacherId, { branchIds: ["br1"] });
  assert.equal(restricted.status, 200, JSON.stringify(restricted.data));
  const beforeReset = (await call("state", manager)).data;
  const reset = await call("reset", manager, {
    confirm: "RESET DEMO",
    revision: beforeReset.db.meta.revision,
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.data));
  const retained = reset.data.db.users.find((user) => user.id === account.id);
  const resetProfile = reset.data.db.teachers.find((teacher) => teacher.id === account.teacherId);
  assert.equal(retained.username, account.username);
  assert.equal(retained.teacherId, account.teacherId);
  assert.deepEqual(retained.branchIds, ["br1"]);
  assert.deepEqual(resetProfile.branchIds, ["br1"]);
  assert.equal(retained.name, resetProfile.name);
  const session = await login(account.username);
  assert.equal(session.user.id, account.id);
  assert.deepEqual(session.db.branches.map((branch) => branch.id), ["br1"]);
  assert(session.db.sessions.every((item) => item.teacherId === account.teacherId));
});

test("TEACHAPI10: account activity labels remain correct when selecting one branch from the API snapshot", async () => {
  const manager = await login();
  const activeProfile = await createTeacher(manager, "Teacher Projection Active API", ["br1", "br2"]);
  const active = await createTeacherAccount(manager, activeProfile, "teacher.projection.active");
  const lockedProfile = await createTeacher(manager, "Teacher Projection Locked API", ["br1", "br2"]);
  const locked = await createTeacherAccount(manager, lockedProfile, "teacher.projection.locked", { disabled: true });
  const saved = await command(manager, "saveUser", [null, {
    name: "Projection supervisor",
    username: "teacher.projection.manager",
    password: "123456",
    role: "branch_manager",
    branchIds: ["br1", "br2"],
  }]);
  assert.equal(saved.status, 200);
  const supervisor = await login("teacher.projection.manager");
  const snapshot = (await call("state", supervisor)).data.db;
  const original = structuredClone(snapshot);
  const stored = app.database.load();
  assert.equal(isLoginAllowed(stored, stored.users.find((user) => user.id === active.id)), true);
  assert.equal(isLoginAllowed(stored, stored.users.find((user) => user.id === locked.id)), false);
  for (const branchId of ["br1", "br2"]) {
    const selected = scopeData(snapshot, supervisor.user, branchId);
    assert.deepEqual(selected.branches.map((branch) => branch.id), [branchId]);
    const activeAccount = selected.users.find((user) => user.id === active.id);
    const lockedAccount = selected.users.find((user) => user.id === locked.id);
    assert(activeAccount && lockedAccount, "Both accounts work at either selected branch.");
    assert.equal(activeAccount.loginAllowed, true);
    assert.equal(lockedAccount.loginAllowed, false);
    assert.equal(activeAccount.name, selected.teachers.find((teacher) => teacher.id === activeProfile.id).name);
  }
  assert.deepEqual(snapshot, original, "Selecting a branch must not alter the server snapshot used by other views.");
});
