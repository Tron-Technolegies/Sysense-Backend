import { Router } from "express";
import {
  getUserSubmittedTimeSheet,
  getUserTimeSheetOverview,
  submitTimeSheet,
} from "../controllers/timesheetController.js";
import { validateTimesheetSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();
router.post("/add", validateTimesheetSubmit, submitTimeSheet);
router.get("/user", getUserSubmittedTimeSheet);
router.get("/user/overview", getUserTimeSheetOverview);

export default router;
