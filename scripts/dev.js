import { createServer } from "vite";
import { createApp } from "../server/app.js";
const host = process.env.HOST || "127.0.0.1",
  apiPort = Number(process.env.API_PORT || 3001),
  uiPort = Number(process.env.PORT || 5173);
const app = createApp({
  origins: [`http://localhost:${uiPort}`, `http://127.0.0.1:${uiPort}`],
});
try {
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(apiPort, host, resolve);
  });
  const vite = await createServer({
    server: {
      host,
      port: uiPort,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}` },
    },
  });
  await vite.listen();
  vite.printUrls();
  console.log(
    "Backend & SQLite đã sẵn sàng. Dữ liệu: data/abc-english.sqlite. Ctrl+C để dừng.",
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await vite.close();
      await app.close();
      process.exit(0);
    });
} catch (e) {
  console.error(e.message);
  await app.close();
  process.exit(1);
}
