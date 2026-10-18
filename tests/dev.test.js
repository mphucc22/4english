import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const port = async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const p = server.address().port;
  await new Promise((r) => server.close(r));
  return p;
};
test("DEV01: một lệnh npm run dev chạy giao diện, API và đăng nhập qua Vite proxy", async () => {
  const uiPort = await port(),
    apiPort = await port(),
    folder = mkdtempSync(join(tmpdir(), "abc-dev-"));
  let logs = "";
  const child = spawn(process.execPath, ["scripts/dev.js"], {
    env: {
      ...process.env,
      PORT: String(uiPort),
      API_PORT: String(apiPort),
      ABC_DB_PATH: join(folder, "data.sqlite"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (s) => (logs += s));
  child.stderr.on("data", (s) => (logs += s));
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try {
        response = await fetch(`http://127.0.0.1:${uiPort}/api/health`);
        if (response.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 40));
    }
    assert(response?.ok, logs);
    const html = await fetch(`http://127.0.0.1:${uiPort}/`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /src\/main.jsx/);
    const login = await fetch(`http://127.0.0.1:${uiPort}/api/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: `http://127.0.0.1:${uiPort}`,
      },
      body: JSON.stringify({ username: "quanly", password: "123456" }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.role, "manager");
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
    rmSync(folder, { recursive: true, force: true });
  }
});
