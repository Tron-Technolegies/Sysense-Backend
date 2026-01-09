import { Router } from "express";
import {
  addJob,
  addUser,
  adminLogin,
  editJob,
  editUser,
  getAllJobs,
  getAllUsers,
  getUserDropdowns,
} from "../controllers/adminController.js";
import {
  validateAddJob,
  validateAddUser,
  validateEditUser,
  validateLoginInput,
} from "../middlewares/validationMiddleware.js";
import {
  authenticateUser,
  isAdmin,
} from "../middlewares/authenticationMiddleware.js";

const router = Router();

router.post("/login", validateLoginInput, adminLogin);
router.get("/users", authenticateUser, isAdmin, getAllUsers);
router.get("/user-dropdowns", authenticateUser, isAdmin, getUserDropdowns);
router.get("/jobs", authenticateUser, isAdmin, getAllJobs);
router.post("/users", authenticateUser, isAdmin, validateAddUser, addUser);
router.patch("/users", authenticateUser, isAdmin, validateEditUser, editUser);
router.post("/jobs", authenticateUser, isAdmin, validateAddJob, addJob);
router.patch("/jobs", authenticateUser, isAdmin, validateAddJob, editJob);

export default router;
