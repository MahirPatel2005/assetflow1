import { Router } from "express";
import authRoutes from "./authRoutes";
import assetRoutes, { transferRouter } from "./assetRoutes";
import bookingRoutes from "./bookingRoutes";
import maintenanceRoutes from "./maintenanceRoutes";
import dashboardRoutes from "./dashboardRoutes";
import notificationRoutes from "./notificationRoutes";
import auditRoutes from "./auditRoutes";
import reportRoutes from "./reportRoutes";
import aiRoutes from "./aiRoutes";
import { categoryRouter, departmentRouter, employeeRouter } from "./orgRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/assets", assetRoutes);
router.use("/transfers", transferRouter);
router.use("/bookings", bookingRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/departments", departmentRouter);
router.use("/asset-categories", categoryRouter);
router.use("/employees", employeeRouter);
router.use("/audits", auditRoutes);
router.use("/reports", reportRoutes);
router.use("/ai", aiRoutes);

export default router;
