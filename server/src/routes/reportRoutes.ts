import { Router } from "express";
import * as reportController from "../controllers/reportController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";

const router = Router();
router.use(requireAuth);

router.get("/summary", requireRole("Admin", "AssetManager", "DepartmentHead"), reportController.getSummary);

export default router;
