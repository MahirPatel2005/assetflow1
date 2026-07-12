import { Router } from "express";
import * as aiController from "../controllers/aiController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";

const router = Router();
router.use(requireAuth);

router.post("/chat", aiController.chat);
router.post("/analyze-maintenance", requireRole("Admin", "AssetManager"), aiController.analyzeMaintenance);
router.post("/analyze-audit/:id", requireRole("Admin", "AssetManager", "DepartmentHead"), aiController.analyzeAudit);

export default router;
