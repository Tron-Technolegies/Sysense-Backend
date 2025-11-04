import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import User from "../models/User.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    user.username = username;
    user.email = email;
    await user.save();
    res.status(200).json({ msg: "updated successfully", user });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user has been found");
    // const isMatch = await comparePassword(currentPassword, user.password);
    // if (!isMatch) throw new BadRequestError("Incorrect current password");
    // const hashed = await hashPassword(newPassword);
    // user.password = hashed;
    //NEED TO REPLACE THIS LOGIC IN PRODUCTION
    if (user.password !== currentPassword)
      throw new BadRequestError("Incorrect current password");
    user.password = newPassword;
    await user.save();
    res.status(200).json({ msg: "password updated" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select({
      username: 1,
      email: 1,
      employeeCode: 1,
      role: 1,
    });
    if (!user) throw new NotFoundError("No user has been found");
    res.status(200).json(user);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
