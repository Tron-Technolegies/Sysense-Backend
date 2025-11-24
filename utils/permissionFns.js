import { NotFoundError } from "../errors/customErrors.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

export const canPerformAction = async (actorId, targetId, module, action) => {
  const actor = await User.findById(actorId).populate("role");
  const target = await User.findById(targetId).populate("role");
  if (!actor || !target) throw new NotFoundError("User Not Found");
  const role = actor.role;

  //finding module permissions
  const modulePermission = role?.permissions?.find(
    (item) => item.module === module
  );
  if (!modulePermission) return false;
  //find if he has the particular action permission
  const actionPermission = modulePermission?.actions?.find(
    (item) => item.name === action
  );
  if (!actionPermission) return false;
};
