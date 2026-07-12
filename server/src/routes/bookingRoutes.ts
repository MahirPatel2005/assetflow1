import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { logActivity } from "../middlewares/activityLogger";
import { createBookingSchema, rescheduleBookingSchema } from "../validators/bookingValidators";

const router = Router();
router.use(requireAuth);

router.get("/", bookingController.list);
router.post("/", validate(createBookingSchema), logActivity("CREATE", "booking"), bookingController.create);
router.patch("/:id/cancel", logActivity("CANCEL", "booking"), bookingController.cancel);
router.patch(
  "/:id/reschedule",
  validate(rescheduleBookingSchema),
  logActivity("RESCHEDULE", "booking"),
  bookingController.reschedule
);

export default router;
