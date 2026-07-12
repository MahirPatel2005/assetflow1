import { z } from "zod";

export const createBookingSchema = z
  .object({
    assetId: z.number().int().positive(),
    resourceName: z.string().trim().min(2).max(150),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const rescheduleBookingSchema = z
  .object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
