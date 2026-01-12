import mongoose from "mongoose";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import Default from "../models/Default.js";

export const getRandomEmployeeCode = async (userId, exclude = [], size = 1) => {
  const excluded = Array.from(new Set([userId, ...exclude]));
  const randomUser = await User.aggregate([
    {
      $match: {
        _id: {
          $nin: excluded.map((x) => new mongoose.Types.ObjectId(x)),
        },
      },
    },
    { $sample: { size: size } },
    { $project: { employeeCode: 1, _id: 0 } },
  ]);
  console.log(randomUser);

  return randomUser;
};

export const findTimeSheetL1 = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError("No job found");
  const user = await User.findOne({
    employeeCode: job.projectInCharge_empCode,
  });
  if (user) {
    return user._id;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultTimeSheetL1;
  }
};

export const findTimeSheetL2 = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    return user.manager;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultTimeSheetL2;
  }
};

export const findPettyCashL1 = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    return user.manager;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultPettyCashL1;
  }
};

export const findPettyCashL2 = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError("No user found");
  const user = await User.findOne({
    employeeCode: job.projectInCharge_empCode,
  });
  if (user) {
    return user._id;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultPettyCashL2;
  }
};

export const findLeaveL1 = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    return user.manager;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultLeaveL1;
  }
};

export const findLeaveL2 = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    return user.manager;
  } else {
    const defaultSettings = await Default.findOne();
    if (!defaultSettings) throw new BadRequestError("No user found");
    return defaultSettings.defaultLeaveL2;
  }
};
