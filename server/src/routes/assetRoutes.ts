import { Router } from "express";
import * as assetController from "../controllers/assetController";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { validate } from "../middlewares/validate";
import { logActivity } from "../middlewares/activityLogger";
import {
  allocateSchema,
  assetSearchSchema,
  createAssetSchema,
  returnAssetSchema,
  transferRequestSchema,
  updateAssetSchema,
} from "../validators/assetValidators";

const router = Router();
router.use(requireAuth);

router.get("/", validate(assetSearchSchema, "query"), assetController.search);
router.get("/allocations/active", assetController.listActiveAllocations);
router.get("/:id", assetController.getOne);

router.post(
  "/",
  requireRole("Admin", "AssetManager"),
  validate(createAssetSchema),
  logActivity("CREATE", "asset"),
  assetController.create
);

router.patch("/:id", requireRole("Admin", "AssetManager"), validate(updateAssetSchema), assetController.update);

router.post(
  "/:id/allocate",
  requireRole("Admin", "AssetManager", "DepartmentHead"),
  validate(allocateSchema),
  logActivity("ALLOCATE", "asset"),
  assetController.allocate
);

router.post(
  "/:id/return",
  requireRole("Admin", "AssetManager", "DepartmentHead", "Employee"),
  validate(returnAssetSchema),
  logActivity("RETURN", "asset"),
  assetController.returnAsset
);

export const transferRouter = Router();
transferRouter.use(requireAuth);
transferRouter.get("/", assetController.listTransfers);
transferRouter.post(
  "/request",
  validate(transferRequestSchema),
  logActivity("REQUEST_TRANSFER", "transfer_request"),
  assetController.requestTransfer
);
transferRouter.post(
  "/:id/approve",
  requireRole("Admin", "AssetManager", "DepartmentHead"),
  logActivity("APPROVE_TRANSFER", "transfer_request"),
  assetController.approveTransfer
);
transferRouter.post(
  "/:id/reject",
  requireRole("Admin", "AssetManager", "DepartmentHead"),
  logActivity("REJECT_TRANSFER", "transfer_request"),
  assetController.rejectTransfer
);

export default router;
