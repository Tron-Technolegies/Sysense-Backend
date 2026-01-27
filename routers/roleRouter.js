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
} from "../controllers/roleController.js";

const router = Router();

router.post("/", validateAddRole, addNewRole);
router.get("/", getAllRoles);
router.get("/dropdown", getRolesDropdown);
router.patch("/assign", validateAssignRole, assignRole);
router.get("/:id", getSingleRole);
router.patch("/:id", validateAddRole, editRole);

export default router;
