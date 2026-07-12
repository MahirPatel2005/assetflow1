import type { Request, Response } from "express";
import * as assetService from "../services/assetService";
import * as transferService from "../services/transferService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const search = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await assetService.listAssets({
    ...(req.query as any),
    userRole: req.user.role,
    userId: req.user.sub,
  });
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const asset = await assetService.getAssetById(Number(req.params.id), req.user.role, req.user.sub);
  res.status(200).json(asset);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetService.createAsset(req.body);
  res.locals.entityId = asset.id;
  res.status(201).json(asset);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetService.updateAsset(Number(req.params.id), req.body);
  res.status(200).json(asset);
});

export const allocate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const allocation = await assetService.allocateAsset(Number(req.params.id), req.body, req.user.sub);
  res.locals.entityId = allocation.id;
  res.status(201).json(allocation);
});

export const returnAsset = asyncHandler(async (req: Request, res: Response) => {
  const result = await assetService.returnAsset(Number(req.params.id), req.body.conditionOnReturn ?? "Good");
  res.status(200).json(result);
});

export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const transfers = await transferService.listTransfers(req.user.role, req.user.departmentId, req.user.sub);
  res.status(200).json(transfers);
});

export const requestTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const transfer = await transferService.requestTransfer({ ...req.body, requestedByUserId: req.user.sub });
  res.locals.entityId = transfer.id;
  res.status(201).json(transfer);
});

export const approveTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const transfer = await transferService.approveTransfer(
    Number(req.params.id),
    req.user.sub,
    req.user.role,
    req.user.departmentId
  );
  res.status(200).json(transfer);
});

export const rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const transfer = await transferService.rejectTransfer(
    Number(req.params.id),
    req.user.sub,
    req.user.role,
    req.user.departmentId
  );
  res.status(200).json(transfer);
});

export const listActiveAllocations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await assetService.listActiveAllocations(req.user.role, req.user.departmentId, req.user.sub));
});
