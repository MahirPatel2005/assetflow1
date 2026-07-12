import type { Request, Response } from "express";
import * as reportService from "../services/reportService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role === "Employee") {
    throw ApiError.forbidden("Employees are not allowed to view reports");
  }
  const summary = await reportService.getReportsSummary(req.user.role, req.user.departmentId);
  res.status(200).json(summary);
});
