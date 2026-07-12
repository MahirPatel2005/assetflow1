import type { Request, Response } from "express";
import * as notificationService from "../services/notificationService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json(await notificationService.listNotifications(req.user.sub));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await notificationService.markNotificationRead(req.user.sub, Number(req.params.id));
  res.status(204).send();
});
