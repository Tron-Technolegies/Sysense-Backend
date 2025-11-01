import { Router } from "express";
import {
  approveDatabyL1,
  approveL2,
  getDataforL2,
  getPendingActionL1,
  getUserSubmittedTimeSheet,
  getUserTimeSheetOverview,
  modifyL2,
  modifyTimesheetDataL1,
  rejectL2,
  rejectTimeSheetL1,
  resubmitByL1,
  resubmitTimesheetByL0,
  sendBackToL0,
  sendBacktoL1,
  submitTimeSheet,
} from "../controllers/timesheetController.js";
import { validateTimesheetSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();
router.post("/add", validateTimesheetSubmit, submitTimeSheet);
router.get("/user", getUserSubmittedTimeSheet);
router.get("/user/overview", getUserTimeSheetOverview);
router.get("/user/pendingL1", getPendingActionL1);
router.patch("/user/rejectL1/:id", rejectTimeSheetL1);
router.patch("/user/sendBackL1/:id", validateTimesheetSubmit, sendBackToL0);
router.patch(
  "/user/resubmitL0/:id",
  validateTimesheetSubmit,
  resubmitTimesheetByL0
);
router.patch(
  "/user/modifyL1/:id",
  validateTimesheetSubmit,
  modifyTimesheetDataL1
);
router.patch("/user/approveL1/:id", approveDatabyL1);
router.get("/user/pendingL2", getDataforL2);
router.patch("/user/rejectL2/:id", rejectL2);
router.patch("/user/approveL2/:id", approveL2);
router.patch("/user/modifyL2/:id", validateTimesheetSubmit, modifyL2);
router.patch("/user/sendBackL2/:id", validateTimesheetSubmit, sendBacktoL1);
router.patch("/user/resubmitL1/:id", validateTimesheetSubmit, resubmitByL1);

export default router;
