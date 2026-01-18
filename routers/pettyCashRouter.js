import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  approveDataByL1,
  approveDataByL2,
  approveDataByL3,
  getDataForL1,
  getDataForL2,
  getDataForL3,
  getUserSubmittedPettyCashData,
  modifyDataByL1,
  modifyDataL2,
  rejectDataL1,
  rejectL2,
  rejectPettyCashByL3,
  resubmitByL1,
  reSubmitDataByL0,
  sendBackToL0,
  sendBackToL1,
  submitPettyCash,
} from "../controllers/pettyCashController.js";
import { validatePettycashSubmit } from "../middlewares/validationMiddleware.js";

const router = Router();

router.post(
  "/",
  upload.single("image"),
  validatePettycashSubmit,
  submitPettyCash,
);
router.get("/user", getUserSubmittedPettyCashData);
router.get("/dataL1", getDataForL1);
router.patch("/rejectL1/:id", rejectDataL1);
router.patch("/sendBackToL0/:id", validatePettycashSubmit, sendBackToL0);
router.patch("/resubmitL0/:id", validatePettycashSubmit, reSubmitDataByL0);
router.patch("/modifyL1/:id", validatePettycashSubmit, modifyDataByL1);
router.patch("/approveL1/:id", approveDataByL1);
router.get("/dataL2", getDataForL2);
router.patch("/modifyL2/:id", validatePettycashSubmit, modifyDataL2);
router.patch("/rejectL2/:id", rejectL2);
router.patch("/sendBackToL1/:id", validatePettycashSubmit, sendBackToL1);
router.patch("/resubmitL1/:id", validatePettycashSubmit, resubmitByL1);
router.patch("/approveL2/:id", approveDataByL2);
router.get("/dataL3", getDataForL3);
router.patch("/rejectL3/:id", rejectPettyCashByL3);
router.patch("/approveL3/:id", approveDataByL3);

export default router;
