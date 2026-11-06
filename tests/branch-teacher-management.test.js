import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { R } from "../src/lib/rules.js";
import { Seed } from "../src/lib/seed.js";
import { scopeData } from "../src/lib/branch-access.js";

const folder = mkdtempSync(join(tmpdir(), "4english-local-teachers-"));
const app = createApp({ dbPath: join(folder, "teachers.sqlite") });
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}/api/`;
after(async () => {
  await app.close();
  rmSync(folder, { recursive: true, force: true });
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

async function command(session, action, args, context = {}) {
  const current = await call("state", session);
  return call("command", session, {
    action, args, requestId: crypto.randomUUID(), revision: current.data.db.meta.revision, ...context,
  });
}

async function supervisor(manager, username, branchIds) {
  const saved = await command(manager, "saveUser", [null, {
    name: username, username, password: "123456", role: "branch_manager", branchIds,
  }]);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  return login(username);
}

const profilePayload = (name, branchIds) => ({
  name, branchIds, phone: "0901234567", email: "teacher@example.test",
  specialty: "Giao tiếp", status: "Đang dạy",
});

async function createTeacher(session, name, branchIds, context = {}) {
  const saved = await command(session, "saveMaster", ["teachers", null, profilePayload(name, branchIds)], context);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  return app.database.load().teachers.find((teacher) => teacher.name === name);
}

async function rejectedUnchanged(session, action, args, context = {}) {
  const before = app.database.load();
  const rejected = await command(session, action, args, context);
  assert([403, 422].includes(rejected.status), JSON.stringify(rejected));
  assert.deepEqual(app.database.load(), before, "Rejected action must not change records, grants, or revision.");
  return rejected;
}

test("BTEACH01: local manager creates a teacher, grants a login and edits the canonical profile", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.creator", ["br1"]);
  const teacher = await createTeacher(local, "Local teacher with login", ["br1"], { branchId: "br1" });
  const account = await command(local, "saveUser", [null, {
    username: "local.teacher.login", password: "123456", role: "teacher", teacherId: teacher.id,
  }]);
  assert.equal(account.status, 200, JSON.stringify(account.data));
  const session = await login("local.teacher.login");
  assert.equal(session.user.name, teacher.name);
  assert.deepEqual(session.user.branchIds, ["br1"]);
  const renamed = await command(local, "saveMaster", ["teachers", teacher.id, {
    ...teacher, name: "Local teacher renamed",
  }], { branchId: "br1" });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  const refreshed = await call("state", session);
  assert.equal(refreshed.data.user.name, "Local teacher renamed");
  assert.deepEqual(refreshed.data.user.branchIds, ["br1"]);
});

test("BTEACH02: local manager cannot create or extend a teacher outside assigned branches", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.scope", ["br1"]);
  for (const branches of [["br2"], ["br1", "br2"], [], ["unknown"], "all"])
    await rejectedUnchanged(local, "saveMaster", ["teachers", null, profilePayload("Forbidden teacher", branches)]);
  const teacher = await createTeacher(local, "Teacher extension guard", ["br1"]);
  await rejectedUnchanged(local, "saveMaster", ["teachers", teacher.id, { ...teacher, branchIds: ["br1", "br2"] }]);
});

test("BTEACH03: a forged foreign or shared profile ID cannot be claimed by narrowing its branches", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.claim", ["br1"]);
  const foreign = await createTeacher(manager, "Foreign teacher ownership", ["br2"]);
  const shared = await createTeacher(manager, "Shared teacher ownership", ["br1", "br2"]);
  const snapshot = (await call("state", local)).data.db;
  const sharedView = snapshot.teachers.find((teacher) => teacher.id === shared.id);
  assert.deepEqual(sharedView.branchIds, ["br1"]);
  assert.equal(sharedView.profileManageable, false);
  const selected = scopeData(snapshot, local.user, "br1");
  assert.equal(selected.teachers.find((teacher) => teacher.id === shared.id).profileManageable, false,
    "A second frontend projection must not turn a shared teacher editable after removing foreign branch labels.");
  for (const teacher of [foreign, shared]) {
    await rejectedUnchanged(local, "saveMaster", ["teachers", teacher.id, {
      ...teacher, branchIds: ["br1"], name: "Claimed teacher",
    }]);
    await rejectedUnchanged(local, "deleteMaster", ["teachers", teacher.id]);
  }
});

test("BTEACH04: multi-branch management edits shared profiles only in an adequate active context", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.multi", ["br1", "br2"]);
  const teacher = await createTeacher(local, "Shared teacher manageable", ["br1", "br2"]);
  await rejectedUnchanged(local, "saveMaster", ["teachers", teacher.id, {
    ...teacher, name: "Insufficient context",
  }], { branchId: "br1" });
  await rejectedUnchanged(local, "saveMaster", ["teachers", null,
    profilePayload("Wrong active branch", ["br2"])], { branchId: "br1" });
  const saved = await command(local, "saveMaster", ["teachers", teacher.id, {
    ...teacher, name: "Shared teacher edited",
  }], { branchId: "" });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const audit = app.database.load().audit.at(-1);
  assert.deepEqual([...new Set(audit.branchIds)].sort(), ["br1", "br2"]);
  const centralTeacher = await createTeacher(manager, "Central cross-context teacher", ["br3"], { branchId: "br1" });
  assert.deepEqual(centralTeacher.branchIds, ["br3"]);
});

test("BTEACH05: local deletion is allowed for unused profiles and keeps linked or scheduled history", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.delete", ["br1"]);
  const unused = await createTeacher(local, "Unused local teacher", ["br1"]);
  assert.equal((await command(local, "deleteMaster", ["teachers", unused.id])).status, 200);
  assert(!app.database.load().teachers.some((teacher) => teacher.id === unused.id));

  const linked = await createTeacher(local, "Linked local teacher", ["br1"]);
  assert.equal((await command(local, "saveUser", [null, {
    username: "linked.local.teacher", password: "123456", role: "teacher", teacherId: linked.id,
  }])).status, 200);
  await rejectedUnchanged(local, "deleteMaster", ["teachers", linked.id]);

  const scheduled = await createTeacher(local, "Scheduled local teacher", ["br1"]);
  const db = app.database.load();
  const klass = await command(manager, "createClass", [{ courseId: "co2", branchId: "br1", termId: db.terms[1].id }]);
  assert.equal(klass.status, 200);
  const schedule = await command(manager, "setSchedule", [klass.data.result.id, {
    weekdays: [0], start: "10:00", end: "11:00", roomId: "br1r1",
    teacherId: scheduled.id, startDate: db.terms[1].start,
  }]);
  assert.equal(schedule.status, 200, JSON.stringify(schedule.data));
  await rejectedUnchanged(local, "deleteMaster", ["teachers", scheduled.id]);
});

test("BTEACH06: opening local teacher management does not grant central catalog permissions", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.catalogs", ["br1"]);
  const db = app.database.load();
  for (const table of ["courses", "terms", "branches"]) {
    const row = db[table][0];
    await rejectedUnchanged(local, "saveMaster", [table, row.id, { ...row, name: "Unauthorized catalog edit" }]);
    await rejectedUnchanged(local, "deleteMaster", [table, row.id]);
  }
});

test("BTEACH07: teacher audit covers old and new locations; replay rechecks current ownership", async () => {
  const manager = await login();
  const local = await supervisor(manager, "local.teacher.retry", ["br1"]);
  const multi = await supervisor(manager, "local.teacher.audit", ["br1", "br2"]);
  const moved = await createTeacher(multi, "Teacher audited move", ["br1"]);
  assert.equal((await command(multi, "saveMaster", ["teachers", moved.id, { ...moved, branchIds: ["br2"] }])).status, 200);
  assert.deepEqual([...new Set(app.database.load().audit.at(-1).branchIds)].sort(), ["br1", "br2"]);

  const teacher = await createTeacher(local, "Teacher cached update", ["br1"]);
  const args = ["teachers", teacher.id, { ...teacher, name: "Teacher first update" }];
  const requestId = crypto.randomUUID();
  assert.equal((await command(local, "saveMaster", args, { requestId })).status, 200);
  const updated = app.database.load().teachers.find((row) => row.id === teacher.id);
  assert.equal((await command(manager, "saveMaster", ["teachers", teacher.id, { ...updated, branchIds: ["br2"] }])).status, 200);
  const replay = await rejectedUnchanged(local, "saveMaster", args, { requestId });
  assert.equal(replay.data.result, undefined);
});

test("BTEACH08: inconsistent linked account grants cannot be smuggled through profile synchronization", () => {
  for (const branches of [["br1", "br2"], undefined, "all"]) {
    const db = Seed.minimal();
    const teacher = db.teachers.find((row) => row.id === "gv1");
    teacher.branchIds = ["br1"];
    const account = db.users.find((user) => user.role === "teacher" && user.teacherId === teacher.id);
    account.branchIds = branches;
    const actor = { id: "local", name: "Local manager", role: "branch_manager", branchIds: ["br1"] };
    const before = JSON.stringify(db);
    assert.throws(() => R.saveMaster(db, actor, "teachers", teacher.id, { ...teacher, name: "Smuggled update" }));
    assert.equal(JSON.stringify(db), before);
  }
});
