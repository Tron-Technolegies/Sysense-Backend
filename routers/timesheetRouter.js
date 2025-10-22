import { Router } from "express";
import {
  getUserSubmittedTimeSheet,
  submitTimeSheet,
} from "../controllers/timesheetController.js";
import { validateTimesheetSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();
router.post("/add", validateTimesheetSubmit, submitTimeSheet);
router.get("/user", getUserSubmittedTimeSheet);

export default router;
