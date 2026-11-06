import { createApp } from "./app.js";
const app = createApp();
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3001);
app.server.listen(port, host, () =>
  console.log(`4ENGLISH: http://${host}:${port} (Ctrl+C để dừng)`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
