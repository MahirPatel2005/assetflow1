import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  // Postgres exclusion-constraint violation (overlapping booking) or unique violation
  const pgErr = err as { code?: string; constraint?: string; message?: string };
  if (pgErr?.code === "23P01" || pgErr?.constraint === "no_overlapping_bookings") {
    res.status(409).json({ error: "This booking overlaps an existing booking for the resource." });
    return;
  }
  if (pgErr?.code === "23505") {
    res.status(409).json({ error: "A record with this value already exists.", constraint: pgErr.constraint });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
