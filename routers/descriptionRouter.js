import { Router } from "express";
import { getAllDescriptions } from "../controllers/descriptionController.js";

const router = Router();

router.get("/", getAllDescriptions);

export default router;
