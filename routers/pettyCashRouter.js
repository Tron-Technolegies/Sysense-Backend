import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  getDataForL1,
  getUserSubmittedPettyCashData,
  rejectDataL1,
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

export default router;
