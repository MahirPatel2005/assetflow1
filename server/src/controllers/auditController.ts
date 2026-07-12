import type { Request, Response } from "express";
import * as auditService from "../services/auditService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const audits = await auditService.listAudits(req.user.role, req.user.departmentId, req.user.sub);
  res.status(200).json(audits);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const audit = await auditService.getAuditById(
    Number(req.params.id),
    req.user.role,
    req.user.departmentId,
    req.user.sub
  );
  res.status(200).json(audit);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const audit = await auditService.createAudit({
    ...req.body,
    creatorId: req.user.sub,
  });
  res.locals.entityId = audit.id;
  res.status(201).json(audit);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const item = await auditService.updateAuditItem(
    Number(req.params.id),
    Number(req.params.itemId),
    req.user.sub,
    req.user.role,
    req.body
  );
  res.status(200).json(item);
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  const audit = await auditService.closeAudit(Number(req.params.id));
  res.status(200).json(audit);
});
