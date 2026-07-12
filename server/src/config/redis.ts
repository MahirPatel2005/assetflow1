import Redis from "ioredis";
import "dotenv/config";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Redis connection error", err);
});

/**
 * Acquire a short-lived distributed lock using SET NX PX.
 * Returns a release function, or null if the lock is already held.
 */
export async function acquireLock(
  key: string,
  ttlMs = 5000
): Promise<(() => Promise<void>) | null> {
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;
  const lockKey = `lock:${key}`;
  const ok = await redis.set(lockKey, token, "PX", ttlMs, "NX");
  if (ok !== "OK") return null;

  return async () => {
    // Only release if we still own it (avoids releasing someone else's lock post-expiry)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end`;
    await redis.eval(script, 1, lockKey, token);
  };
}
