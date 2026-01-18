import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  applyLeave,
  approveL1,
  approveL2,
  approveLeaveByL3,
  getDataForL1,
  getDataForL2,
  getDataForL3,
  getUserAppliedLeave,
  leaveOverview,
  modifyDataByL1,
  modifyDataByL2,
  rejectByL2,
  rejectDataByL1,
  rejectLeaveByL3,
  reSubmitByL0,
  resubmitByL1,
  sendBackByL2,
  sendBackToL0,
} from "../controllers/leaveController.js";
import { validateLeaveApply } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/", upload.single("image"), validateLeaveApply, applyLeave);
router.get("/user", getUserAppliedLeave);
router.get("/dataL1", getDataForL1);
router.patch("/rejectL1/:id", rejectDataByL1);
router.patch("/sendBackToL0/:id", validateLeaveApply, sendBackToL0);
router.patch("/resubmitByL0/:id", validateLeaveApply, reSubmitByL0);
router.patch("/modifyL1/:id", validateLeaveApply, modifyDataByL1);
router.patch("/approveL1/:id", approveL1);
router.get("/dataL2", getDataForL2);
router.patch("/modifyL2/:id", validateLeaveApply, modifyDataByL2);
router.patch("/rejectL2/:id", rejectByL2);
router.patch("/sendBackToL1/:id", validateLeaveApply, sendBackByL2);
router.patch("/resubmitByL1/:id", validateLeaveApply, resubmitByL1);
router.patch("/approveL2/:id", approveL2);
router.get("/overview", leaveOverview);
router.get("/dataL3", getDataForL3);
router.patch("/rejectL3/:id", rejectLeaveByL3);
router.patch("/approveL3/:id", approveLeaveByL3);

export default router;
