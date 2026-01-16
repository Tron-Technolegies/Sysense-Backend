import { Router } from "express";
import {
  getAllUsers,
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
router.get("/all", getAllUsers);
router.get("/stats", getDashboardStats);

export default router;
