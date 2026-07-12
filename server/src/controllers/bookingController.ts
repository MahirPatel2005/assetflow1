import type { Request, Response } from "express";
import * as bookingService from "../services/bookingService";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { pool } from "../config/db";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const assetId = req.query.assetId ? Number(req.query.assetId) : undefined;
  res.status(200).json(await bookingService.listBookings(assetId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  
  // Custom booking "on behalf of dept" for Department Heads:
  // If request contains a custom userId and target belongs to their department, use that userId and departmentId.
  let bookingUserId = req.user.sub;
  let bookingDeptId = req.user.departmentId;

  if (req.user.role === "DepartmentHead" && req.body.userId) {
    const targetUserId = Number(req.body.userId);
    const { rows } = await pool.query("SELECT department_id FROM users WHERE id = $1", [targetUserId]);
    if (rows[0] && rows[0].department_id === req.user.departmentId) {
      bookingUserId = targetUserId;
    }
  }

  const booking = await bookingService.createBooking({
    ...req.body,
    userId: bookingUserId,
    departmentId: bookingDeptId,
  });
  res.locals.entityId = booking.id;
  res.status(201).json(booking);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const booking = await bookingService.cancelBooking(
    Number(req.params.id),
    req.user.sub,
    req.user.role,
    req.user.departmentId
  );
  res.status(200).json(booking);
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const booking = await bookingService.rescheduleBooking(
    Number(req.params.id),
    req.user.sub,
    req.user.role,
    req.user.departmentId,
    req.body.startTime,
    req.body.endTime
  );
  res.status(200).json(booking);
});
