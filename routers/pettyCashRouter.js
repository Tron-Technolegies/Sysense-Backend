import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  approveDataByL1,
  getDataForL1,
  getUserSubmittedPettyCashData,
  modifyDataByL1,
  rejectDataL1,
  reSubmitDataByL0,
  sendBackToL0,
  submitPettyCash,
} from "../controllers/pettyCashController.js";
import { validatePettycashSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post(
  "/",
  upload.single("image"),
  validatePettycashSubmit,
  submitPettyCash
);
router.get("/user", getUserSubmittedPettyCashData);
router.get("/dataL1", getDataForL1);
router.patch("/rejectL1/:id", rejectDataL1);
router.patch("/sendBackToL0/:id", validatePettycashSubmit, sendBackToL0);
router.patch("/resubmitL0/:id", validatePettycashSubmit, reSubmitDataByL0);
router.patch("/modifyL1/:id", validatePettycashSubmit, modifyDataByL1);
router.patch("/approveL1/:id", approveDataByL1);

export default router;
