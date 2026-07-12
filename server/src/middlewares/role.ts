import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export type Role = "Admin" | "AssetManager" | "DepartmentHead" | "Employee";

/** Restricts a route to one or more roles. Must run after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role as Role)) {
      throw ApiError.forbidden(`Requires role: ${roles.join(" or ")}`);
    }
    next();
  };
}
