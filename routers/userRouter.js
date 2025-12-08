import { Router } from "express";
import {
  getDashboardStats,
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
router.get("/stats", getDashboardStats);

export default router;
