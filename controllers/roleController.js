import { NotFoundError } from "../errors/customErrors.js";
import Role from "../models/Role.js";
import User from "../models/User.js";

export const addNewRole = async (req, res) => {
  try {
    const { roleName, level, parentRole, permissions } = req.body;
    const newRole = await Role.create({
      roleName: roleName,
      level: level,
      parentRole: parentRole,
      permissions: permissions,
    });
    res.status(201).json({ message: "Successfully created", newRole });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const { currentPage, search } = req.query;
    const page = Number(currentPage);
    const limit = 20;
    const skip = (page - 1) * limit;
    const queryObject = {};
    if (search && search !== "") {
      queryObject.roleName = { $regex: search, $options: "i" };
    }
    const roles = await Role.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalRoles = await Role.countDocuments(queryObject);
    const totalPages = Math.ceil(totalRoles / limit);
    res.status(200).json({ roles, totalPages, totalRoles });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getRolesDropdown = async (req, res) => {
  try {
    const roles = await Role.find().select("roleName level").lean();
    res.status(200).json(roles);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getSingleRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) throw new NotFoundError("No role found");
    res.status(200).json(role);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const editRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) throw new NotFoundError("No role found");
    const { roleName, level, parentRole, permissions } = req.body;
    role.roleName = roleName;
    role.level = level;
    role.parentRole = parentRole;
    role.permissions = permissions;
    await role.save();
    res.status(200).json({ message: "success", role });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const assignRole = async (req, res) => {
  const { userId, roleId } = req.body;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("No user found");
  const role = await Role.findById(roleId);
  if (!role) throw new NotFoundError("No role found");
  user.role = role._id;
  await user.save();
  res.status(200).json({ message: "Role assigned successfully" });
  try {
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getUserRoles = async (req, res) => {
  try {
    const users = await User.find({ role: { $exists: true } })
      .select("role employeeCode EmployeeId username")
      .populate("role")
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
