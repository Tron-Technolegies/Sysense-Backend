import { Router } from "express";
import {
  generateScopedReport,
  generateUserReport,
} from "../controllers/reportController.js";
import {
  validateGenerateReportByUser,
  validateGenerateScopedReport,
} from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/user", validateGenerateReportByUser, generateUserReport);
router.post("/scoped", validateGenerateScopedReport, generateScopedReport);

export default router;
