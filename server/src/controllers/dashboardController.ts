import type { Request, Response } from "express";
import { getDashboardKpis } from "../services/dashboardService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getKpis = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await getDashboardKpis(req.user.role, req.user.departmentId, req.user.sub));
});
