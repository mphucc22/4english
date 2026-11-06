import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";

const folder = mkdtempSync(join(tmpdir(), "4english-branch-api-"));
const app = createApp({ dbPath: join(folder, "db.sqlite") });
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}/api/`;
after(async () => { await app.close(); rmSync(folder, { recursive: true, force: true }); });

async function call(path, session, body) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(session ? { cookie: session.cookie, "x-csrf-token": session.csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function login(username = "quanly") {
  const result = await call("login", null, { username, password: "123456" });
  assert.equal(result.status, 200);
  return { ...result.data, cookie: result.cookie };
}
async function command(session, action, args, extra = {}) {
  const current = await call("state", session);
  return call("command", session, {
    action, args, requestId: crypto.randomUUID(), revision: current.data.db.meta.revision, ...extra,
  });
}
async function account(manager, username, role, branchIds) {
  const result = await command(manager, "saveUser", [null, { name: username, username, role, branchIds, password: "123456" }]);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return login(username);
}

test("BRAPI01: scoped login, forged record IDs and branch context are enforced by API", async () => {
  const manager = await login();
  const clerk = await account(manager, "branch.clerk", "accountant", ["br1"]);
  assert.deepEqual(clerk.db.branches.map((b) => b.id), ["br1"]);
  assert(clerk.db.classes.every((c) => c.branchId === "br1"));
  assert(clerk.db.payments.every((p) => p.branchId === "br1"));
  const foreign = app.database.load().enrollments.find((e) => e.branchId === "br2");
  const before = app.database.load().payments.length;
  const forged = await command(clerk, "addPayment", [foreign.id, { amount: 1, method: "Tiền mặt" }]);
  assert([403, 422].includes(forged.status));
  assert.equal(app.database.load().payments.length, before);
  const spoof = await command(clerk, "addPayment", [foreign.id, { amount: 1, method: "Tiền mặt" }], { branchId: "br2" });
  assert.equal(spoof.status, 403);
});

test("BRAPI02: branch manager cannot download backup, restore/reset or grant central authority", async () => {
  const manager = await login();
  const local = await account(manager, "branch.manager", "branch_manager", ["br1"]);
  assert.equal((await call("backup", local)).status, 422);
  assert.equal((await call("reset", local, { confirm: "RESET DEMO", revision: local.db.meta.revision })).status, 422);
  assert.equal((await call("restore", local, { confirm: "KHOI PHUC", backup: {}, revision: local.db.meta.revision })).status, 422);
  const escalate = await command(local, "saveUser", [null, { name: "Escalated", username: "escalated", password: "123456", role: "manager", branchIds: [] }]);
  assert.equal(escalate.status, 422);
  const foreignGrant = await command(local, "saveUser", [null, { name: "Foreign", username: "foreign.user", password: "123456", role: "enroll", branchIds: ["br2"] }]);
  assert.equal(foreignGrant.status, 422);
  const success = await command(local, "saveUser", [null, { name: "Own", username: "own.user", password: "123456", role: "enroll", branchIds: ["br1"] }]);
  assert.equal(success.status, 200);
});

test("BRAPI03: selected branch restricts writes for multi-branch and central accounts", async () => {
  const manager = await login();
  const local = await account(manager, "multi.manager", "branch_manager", ["br1", "br2"]);
  const args = [{ courseId: "co2", termId: local.db.terms[1].id, branchId: "br2" }];
  assert.equal((await command(local, "createClass", args, { branchId: "br1" })).status, 422);
  assert.equal((await command(manager, "createClass", args, { branchId: "br1" })).status, 422);
  const saved = await command(local, "createClass", args, { branchId: "br2" });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.result.branchId, "br2");
  assert(app.database.load().audit.some((entry) => entry.userId === local.user.id && entry.branchIds.includes("br2")));
});

test("BRAPI04: replay rechecks revoked branch permission instead of returning cached data", async () => {
  const manager = await login();
  const local = await account(manager, "retry.manager", "branch_manager", ["br1"]);
  const requestId = crypto.randomUUID();
  const args = [{ courseId: "co2", termId: local.db.terms[1].id, branchId: "br1" }];
  assert.equal((await command(local, "createClass", args, { requestId })).status, 200);
  const changed = await command(manager, "saveUser", [local.user.id, { ...local.user, branchIds: ["br2"] }]);
  assert.equal(changed.status, 200);
  const retried = await command(local, "createClass", args, { requestId });
  assert([403, 422].includes(retried.status));
  assert.equal(retried.data.result, undefined);
  const latest = await call("state", local);
  assert.deepEqual(latest.data.db.branches.map((b) => b.id), ["br2"]);
});

test("BRAPI05: shared student enrollments and consultation leads remain branch scoped", async () => {
  const manager = await login();
  const branch1 = await account(manager, "scope.one", "enroll", ["br1"]);
  const branch2 = await account(manager, "scope.two", "enroll", ["br2"]);
  const lead = await call("leads", null, { name: "Branch 2 prospect", phone: "0901234567", courseId: "co2", branchId: "br2" });
  assert.equal(lead.status, 200);
  const first = (await call("state", branch1)).data.db;
  const second = (await call("state", branch2)).data.db;
  assert(!first.leads.some((x) => x.name === "Branch 2 prospect"));
  assert(second.leads.some((x) => x.name === "Branch 2 prospect"));
  assert(second.enrollments.every((e) => second.classes.some((c) => c.id === e.classId && c.branchId === "br2")));
  const shared = second.students.find((s) => s.branchId === "br1");
  assert(shared);
  const edit = await command(branch2, "saveMaster", ["students", shared.id, { ...shared, name: "Foreign edit", branchId: "br2" }]);
  assert.equal(edit.status, 422);
  assert.notEqual(app.database.load().students.find((s) => s.id === shared.id).name, "Foreign edit");
});

test("BRAPI06: scoped refunds require explicit branch; replay cannot change branch context", async () => {
  const manager = await login();
  const local = await account(manager, "refund.manager", "branch_manager", ["br1", "br2"]);
  const student = local.db.students.find((s) => s.branchId === "br1");
  const implicit = await command(local, "refundBalance", [student.id, { amount: 1, method: "Tiền mặt", note: "Missing branch" }]);
  assert.equal(implicit.status, 422);
  assert.match(implicit.data.error, /Chọn cơ sở/);
  const requestId = crypto.randomUUID();
  const args = [{ courseId: "co2", termId: local.db.terms[1].id, branchId: "br1" }];
  assert.equal((await command(local, "createClass", args, { requestId, branchId: "br1" })).status, 200);
  const replay = await command(local, "createClass", args, { requestId, branchId: "" });
  assert.equal(replay.status, 422);
  assert.equal(replay.data.result, undefined);
});
