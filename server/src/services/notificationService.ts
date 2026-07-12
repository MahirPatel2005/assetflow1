import type { PoolClient } from "pg";
import { pool } from "../config/db";

/** Insert a notification, optionally inside an existing transaction client. */
export async function notifyUser(
  clientOrNull: PoolClient | null,
  userId: number,
  title: string,
  message: string,
  type = "General"
) {
  const runner = clientOrNull ?? pool;
  await runner.query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)`,
    [userId, type, title, message]
  );
}

export async function listNotifications(userId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function markNotificationRead(userId: number, id: number) {
  await pool.query(`UPDATE notifications SET read_status = TRUE WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
}
