import { Router } from "express";
import {
  validateAddRole,
  validateAssignRole,
} from "../middlewares/validationMiddleware.js";
import {
  addNewRole,
  assignRole,
  editRole,
  getAllRoles,
  getRolesDropdown,
  getSingleRole,
  getUserRoles,
} from "../controllers/roleController.js";

const router = Router();

router.post("/", validateAddRole, addNewRole);
router.get("/", getAllRoles);
router.get("/dropdown", getRolesDropdown);
router.get("/role-users", getUserRoles);
router.patch("/assign", validateAssignRole, assignRole);
router.get("/:id", getSingleRole);
router.patch("/:id", validateAddRole, editRole);

export default router;
