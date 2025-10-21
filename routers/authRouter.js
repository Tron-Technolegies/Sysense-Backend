import { Router } from "express";
import {
  validateForgotPasswordInput,
  validateLoginInput,
  validateResetPassword,
  validateUserRegisterInput,
  validateVerifyOTP,
} from "../middlewares/validationMiddleware.js";
import {
  forgotPassword,
  loginUser,
  registerUser,
  resetPassword,
  verifyOTP,
} from "../controllers/authController.js";

const router = Router();

router.post("/register", validateUserRegisterInput, registerUser);
router.post("/login", validateLoginInput, loginUser);
router.post("/forgot-password", validateForgotPasswordInput, forgotPassword);
router.post("/verify-otp", validateVerifyOTP, verifyOTP);
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
