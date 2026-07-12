import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

type Target = "body" | "query" | "params";

/** Validates req[target] against a Zod schema and replaces it with the parsed value. */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      throw ApiError.badRequest("Validation failed", result.error.flatten());
    }
    (req as unknown as Record<Target, unknown>)[target] = result.data;
    next();
  };
}
