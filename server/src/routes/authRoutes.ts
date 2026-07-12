import { Router } from "express";
import * as authController from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { loginSchema, signupSchema } from "../validators/authValidators";

const router = Router();

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

export default router;
