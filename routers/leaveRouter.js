import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  applyLeave,
  getDataForL1,
  getUserAppliedLeave,
} from "../controllers/leaveController.js";
import { validateLeaveApply } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/", upload.single("image"), validateLeaveApply, applyLeave);
router.get("/user", getUserAppliedLeave);
router.get("/dataL1", getDataForL1);

export default router;
