import type { Request, Response } from "express";
import * as maintenanceService from "../services/maintenanceService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await maintenanceService.listMaintenance(req.user.role, req.user.departmentId, req.user.sub));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await maintenanceService.createMaintenanceRequest({
    ...req.body,
    raisedByUserId: req.user.sub,
  });
  res.locals.entityId = request.id;
  res.status(201).json(request);
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await maintenanceService.approveMaintenance(Number(req.params.id), req.user.sub));
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await maintenanceService.rejectMaintenance(Number(req.params.id), req.user.sub));
});

export const resolve = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await maintenanceService.resolveMaintenance(Number(req.params.id), req.body));
});
