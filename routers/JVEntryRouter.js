import { Router } from "express";
import { getAllJVEntry } from "../controllers/JVEntryController.js";

const router = Router();

router.get("/", getAllJVEntry);

export default router;
