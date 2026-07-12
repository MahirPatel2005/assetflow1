import { Router } from "express";
import * as notificationController from "../controllers/notificationController";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);
router.get("/", notificationController.list);
router.patch("/:id/read", notificationController.markRead);

export default router;
