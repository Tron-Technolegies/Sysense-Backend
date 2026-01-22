import { Router } from "express";
import { validateAddRole } from "../middlewares/validationMiddleware.js";
import {
  addNewRole,
  editRole,
  getAllRoles,
  getRolesDropdown,
  getSingleRole,
} from "../controllers/roleController.js";

const router = Router();

router.post("/", validateAddRole, addNewRole);
router.get("/", getAllRoles);
router.get("/dropdown", getRolesDropdown);
router.get("/:id", getSingleRole);
router.patch("/:id", validateAddRole, editRole);

export default router;
