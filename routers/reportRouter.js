import { Router } from "express";
import { generateUserReport } from "../controllers/reportController.js";
import { validateGenerateReportByUser } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/user", validateGenerateReportByUser, generateUserReport);

export default router;
