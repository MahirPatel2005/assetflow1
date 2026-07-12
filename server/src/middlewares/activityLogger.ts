import type { NextFunction, Request, Response } from "express";
import { pool } from "../config/db";

/**
 * Logs a mutating action after the response has been sent successfully (2xx).
 * Usage: router.post('/', requireAuth, logActivity('CREATE', 'asset'), controller)
 * The controller should set res.locals.entityId when it creates/updates a record.
 */
export function logActivity(actionType: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = res.locals.entityId ?? null;
        pool
          .query(
            `INSERT INTO activity_logs (actor_user_id, action_type, entity_type, entity_id, metadata_json)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.sub, actionType, entityType, entityId, JSON.stringify(req.body ?? {})]
          )
          .catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to write activity log", err);
          });
      }
    });
    next();
  };
}
