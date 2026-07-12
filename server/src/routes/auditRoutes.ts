import { Router } from "express";
import * as auditController from "../controllers/auditController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";

const router = Router();
router.use(requireAuth);

router.get("/", auditController.list);
router.get("/:id", auditController.getOne);
router.post("/", requireRole("Admin"), auditController.create);
router.patch("/:id/items/:itemId", requireRole("Admin", "AssetManager"), auditController.updateItem);
router.post("/:id/close", requireRole("Admin"), auditController.close);

export default router;
