import { Router } from "express";
import { upload } from "../middlewares/multerMiddleware.js";
import {
  getUserSubmittedPettyCashData,
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

export default router;
