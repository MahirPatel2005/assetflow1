import { Router } from "express";
import * as maintenanceController from "../controllers/maintenanceController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { validate } from "../middlewares/validate";
import { logActivity } from "../middlewares/activityLogger";
import { createMaintenanceSchema, resolveMaintenanceSchema } from "../validators/maintenanceValidators";

const router = Router();
router.use(requireAuth);

router.get("/", maintenanceController.list);
router.post("/", validate(createMaintenanceSchema), logActivity("CREATE", "maintenance_request"), maintenanceController.create);
router.post(
  "/:id/approve",
  requireRole("Admin", "AssetManager"),
  logActivity("APPROVE", "maintenance_request"),
  maintenanceController.approve
);
router.post(
  "/:id/reject",
  requireRole("Admin", "AssetManager"),
  logActivity("REJECT", "maintenance_request"),
  maintenanceController.reject
);
router.post(
  "/:id/resolve",
  requireRole("Admin", "AssetManager"),
  validate(resolveMaintenanceSchema),
  logActivity("RESOLVE", "maintenance_request"),
  maintenanceController.resolve
);

export default router;
