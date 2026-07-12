import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}
