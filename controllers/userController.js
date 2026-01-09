import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import Leave from "../models/Leave.js";
import PettyCash from "../models/PettyCash.js";
import TimeSheet from "../models/TimeSheet.js";
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

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//get stats for dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const formattedId = new mongoose.Types.ObjectId(req.user.userId);
    const pipeline = [
      { $match: { user: formattedId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] },
          },
          rejected: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["L1 Rejected", "L2 Rejected", "L3 Rejected"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      "$status",
                      ["Approved", "L1 Rejected", "L2 Rejected", "L3 Rejected"],
                    ],
                  },
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    const pettycashStats = await PettyCash.aggregate(pipeline);
    const timeSheetStats = await TimeSheet.aggregate(pipeline);
    const leaveStats = await Leave.aggregate(pipeline);
    const pettyCashResult = pettycashStats[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };
    const timeSheetResult = timeSheetStats[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };
    const leaveResult = leaveStats[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };
    const totalStats = {
      total: pettyCashResult.total + timeSheetResult.total + leaveResult.total,
      approved:
        pettyCashResult.approved +
        timeSheetResult.approved +
        leaveResult.approved,
      rejected:
        pettyCashResult.rejected +
        timeSheetResult.rejected +
        leaveResult.rejected,
      pending:
        pettyCashResult.pending + timeSheetResult.pending + leaveResult.pending,
    };
    res
      .status(200)
      .json({ pettyCashResult, timeSheetResult, leaveResult, totalStats });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
