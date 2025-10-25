import { Router } from "express";
import {
  getPendingActionL1,
  getUserSubmittedTimeSheet,
  getUserTimeSheetOverview,
  rejectTimeSheetL1,
  resubmitTimesheetByL0,
  sendBackL1,
  submitTimeSheet,
} from "../controllers/timesheetController.js";
import { validateTimesheetSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();
router.post("/add", validateTimesheetSubmit, submitTimeSheet);
router.get("/user", getUserSubmittedTimeSheet);
router.get("/user/overview", getUserTimeSheetOverview);
router.get("/user/pendingL1", getPendingActionL1);
router.patch("/user/rejectL1/:id", rejectTimeSheetL1);
router.patch("/user/sendBackL1/:id", validateTimesheetSubmit, sendBackL1);
router.patch(
  "/user/resubmitL0/:id",
  validateTimesheetSubmit,
  resubmitTimesheetByL0
);

export default router;
