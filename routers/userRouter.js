import { Router } from "express";
import {
  updatePassword,
  updateProfile,
} from "../controllers/userController.js";
import {
  validateUpdatePassword,
  validateUpdateProfile,
} from "../middlewares/validationMiddleware.js";

const router = Router();

router.patch("/update", validateUpdateProfile, updateProfile);
router.patch("/update-password", validateUpdatePassword, updatePassword);

export default router;
