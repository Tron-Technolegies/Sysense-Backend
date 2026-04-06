import { Router } from "express";
import {
  generateScopedReport,
  generateScopedReportExcel,
  generateUserReport,
  generateUserReportExcel,
} from "../controllers/reportController.js";
import {
  validateGenerateReportByUser,
  validateGenerateScopedReport,
} from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/user", validateGenerateReportByUser, generateUserReport);
router.post("/scoped", validateGenerateScopedReport, generateScopedReport);
router.post(
  "/user-excel",
  validateGenerateReportByUser,
  generateUserReportExcel,
);
router.post(
  "/scoped-excel",
  validateGenerateScopedReport,
  generateScopedReportExcel,
);

export default router;
