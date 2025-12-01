import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  applyLeave,
  approveL1,
  getDataForL1,
  getUserAppliedLeave,
  modifyDataByL1,
  rejectDataByL1,
  reSubmitByL0,
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

export default router;
