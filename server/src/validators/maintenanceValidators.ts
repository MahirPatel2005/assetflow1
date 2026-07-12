import { z } from "zod";

export const createMaintenanceSchema = z.object({
  assetId: z.number().int().positive(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  issueDescription: z.string().trim().min(5).max(1000),
});

export const resolveMaintenanceSchema = z.object({
  technicianName: z.string().trim().max(120).optional(),
  resolutionNotes: z.string().trim().max(1000).optional(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  parentId: z.number().int().positive().nullable().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
});
