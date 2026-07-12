import "dotenv/config";
import { app } from "./app";
import { pool } from "./config/db";
import { redis } from "./config/redis";

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  // Fail fast if infra isn't reachable
  await pool.query("SELECT 1");
  await redis.ping();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`AssetFlow API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await pool.end();
  redis.disconnect();
  process.exit(0);
});
