import { NotFoundError } from "../errors/customErrors.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

export const canPerformAction = async (actorId, targetId, module, action) => {
  try {
    const actor = await User.findById(actorId).populate("role");
    const target = await User.findById(targetId).populate("role");
    if (!actor || !target) throw new NotFoundError("User Not Found");

    if (!actor.role) return false;
    if (!target.role) return false;

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
    const scope = actionPermission.scope;
    switch (scope) {
      case "organization":
        return true;
      case "self":
        return actor._id.equals(target._id);
      case "children":
        return target.manager.equals(actor._id);
      case "sameLevelChildren":
        return (
          actor.manager &&
          target.manager &&
          actor.manager.equals(target.manager)
        );
      case "sameLevel":
        const actorLevel = actor.role.level;
        const targetLevel = target.role.level;
        return actorLevel === targetLevel;
      default:
        return false;
    }
  } catch (error) {
    console.log("canPerformAction error:", error);
    return false;
  }
};

export const buildScopeQuery = async (actorId, module, action) => {
  try {
    const actor = await User.findById(actorId).populate("role");
    if (!actor) throw new NotFoundError("No User found");
    if (!actor.role) return null;
    const role = actor.role;
    const modulePermission = role?.permissions?.find(
      (item) => item.module === module
    );
    if (!modulePermission) return null;
    const actionPermission = modulePermission?.actions?.find(
      (item) => item.name === action
    );
    if (!actionPermission) return null;
    const scope = actionPermission.scope;

    switch (scope) {
      case "organization":
        return {};
      case "self":
        return { _id: actor._id };
      case "children":
        return { manager: actor._id };
      case "sameLevelChildren":
        const actorManager = actor.manager || null;
        if (!actorManager) return { manager: actor._id };
        const siblingsLead = await User.find(
          { manager: actorManager },
          { _id: 1 }
        ).lean();
        const allowedManagers = siblingsLead.map((item) => item._id);
        allowedManagers.push(actor._id);
        return { manager: { $in: allowedManagers } };
      case "sameLevel":
        return { "role.level": actor.role.level };
      default:
        return { _id: actor._id };
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};
