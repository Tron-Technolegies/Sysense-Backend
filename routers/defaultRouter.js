import { Router } from "express";
import { isAdmin } from "../middlewares/authenticationMiddleware.js";
import {
  assignDefaultLeaveL1,
  assignDefaultLeaveL2,
  assignDefaultManager,
  assignDefaultPettyCashL1,
  assignDefaultPettyCashL2,
  assignDefaultTimeSheetL1,
  assignDefaultTimeSheetL2,
  getDefaults,
  toggleLeaveMultipleL2,
  togglePettyCashMultipleL2,
  toggleTimeSheetMultipleL2,
} from "../controllers/defaultController.js";
import {
  validateAssignDefault,
  validateToggleMultiple,
} from "../middlewares/validationMiddleware.js";

const router = Router();

router.post(
  "/timesheetL1",
  isAdmin,
  validateAssignDefault,
  assignDefaultTimeSheetL1
);
router.post(
  "/timesheetL2",
  isAdmin,
  validateAssignDefault,
  assignDefaultTimeSheetL2
);
router.post(
  "/pettyCashL1",
  isAdmin,
  validateAssignDefault,
  assignDefaultPettyCashL1
);
router.post(
  "/pettyCashL2",
  isAdmin,
  validateAssignDefault,
  assignDefaultPettyCashL2
);
router.post("/leaveL1", isAdmin, validateAssignDefault, assignDefaultLeaveL1);
router.post("/leaveL2", isAdmin, validateAssignDefault, assignDefaultLeaveL2);
router.post("/manager", isAdmin, validateAssignDefault, assignDefaultManager);
router.post(
  "/multipleLeaveL2",
  isAdmin,
  validateToggleMultiple,
  toggleLeaveMultipleL2
);
router.post(
  "/multipleTimesheetL2",
  isAdmin,
  validateToggleMultiple,
  toggleTimeSheetMultipleL2
);
router.post(
  "/multiplePettyCashL2",
  isAdmin,
  validateToggleMultiple,
  togglePettyCashMultipleL2
);
router.get("/", getDefaults);
export default router;
