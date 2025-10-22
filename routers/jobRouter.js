import { Router } from "express";
import { getAllJobs } from "../controllers/jobController.js";

const router = Router();

router.get("/", getAllJobs);

export default router;
