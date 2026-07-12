import { z } from "zod";

export const createAssetSchema = z.object({
  assetTag: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150),
  categoryId: z.number().int().positive().nullable().optional(),
  serialNumber: z.string().trim().max(120).nullable().optional(),
  acquisitionDate: z.string().date().nullable().optional(),
  acquisitionCost: z.number().nonnegative().nullable().optional(),
  condition: z.string().trim().max(50).default("Good"),
  location: z.string().trim().max(150).nullable().optional(),
  sharedBookable: z.boolean().default(false),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetSearchSchema = z.object({
  q: z.string().trim().optional(),
  status: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const allocateSchema = z.object({
  userId: z.number().int().positive(),
  departmentId: z.number().int().positive().nullable().optional(),
  expectedReturnDate: z.string().date().nullable().optional(),
});

export const returnAssetSchema = z.object({
  conditionOnReturn: z.string().trim().max(50).default("Good"),
});

export const transferRequestSchema = z.object({
  assetId: z.number().int().positive(),
  requestedToUserId: z.number().int().positive().nullable().optional(),
  requestedToDepartmentId: z.number().int().positive().nullable().optional(),
  reason: z.string().trim().max(500).optional(),
});
