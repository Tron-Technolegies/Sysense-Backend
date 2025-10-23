import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  applyLeave,
  getUserAppliedLeave,
} from "../controllers/leaveController.js";
import { validateLeaveApply } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post("/", upload.single("image"), validateLeaveApply, applyLeave);
router.get("/user", getUserAppliedLeave);

export default router;
