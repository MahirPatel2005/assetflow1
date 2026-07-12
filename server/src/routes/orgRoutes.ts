import { Router } from "express";
import * as orgController from "../controllers/orgController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { validate } from "../middlewares/validate";
import { logActivity } from "../middlewares/activityLogger";
import { categorySchema, departmentSchema } from "../validators/maintenanceValidators";
import { promoteSchema } from "../validators/authValidators";
import { z } from "zod";

export const departmentRouter = Router();
departmentRouter.use(requireAuth);
departmentRouter.get("/", orgController.listDepartments);
departmentRouter.post(
  "/",
  requireRole("Admin"),
  validate(departmentSchema),
  logActivity("CREATE", "department"),
  orgController.createDepartment
);
departmentRouter.patch(
  "/:id",
  requireRole("Admin"),
  validate(departmentSchema.partial()),
  logActivity("UPDATE", "department"),
  orgController.updateDepartment
);
departmentRouter.delete("/:id", requireRole("Admin"), orgController.deleteDepartment);

export const categoryRouter = Router();
categoryRouter.use(requireAuth);
categoryRouter.get("/", orgController.listCategories);
categoryRouter.post(
  "/",
  requireRole("Admin"),
  validate(categorySchema),
  logActivity("CREATE", "asset_category"),
  orgController.createCategory
);
categoryRouter.patch(
  "/:id",
  requireRole("Admin"),
  validate(categorySchema.partial()),
  logActivity("UPDATE", "asset_category"),
  orgController.updateCategory
);
categoryRouter.delete("/:id", requireRole("Admin"), orgController.deleteCategory);

export const employeeRouter = Router();
employeeRouter.use(requireAuth);
employeeRouter.get("/", requireRole("Admin", "AssetManager", "DepartmentHead"), orgController.listEmployees);
employeeRouter.post(
  "/:id/promote",
  requireRole("Admin"),
  validate(promoteSchema),
  logActivity("PROMOTE", "user"),
  orgController.promoteEmployee
);
employeeRouter.patch(
  "/:id/status",
  requireRole("Admin"),
  validate(z.object({ status: z.enum(["Active", "Suspended"]) })),
  logActivity("UPDATE_STATUS", "user"),
  orgController.setEmployeeStatus
);
