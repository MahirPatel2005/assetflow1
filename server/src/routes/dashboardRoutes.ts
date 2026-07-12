import { Router } from "express";
import { getKpis } from "../controllers/dashboardController";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.get("/kpis", requireAuth, getKpis);

export default router;
