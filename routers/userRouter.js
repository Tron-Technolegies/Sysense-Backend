import { Router } from "express";
import {
  getUserInfo,
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
router.get("/info", getUserInfo);

export default router;
