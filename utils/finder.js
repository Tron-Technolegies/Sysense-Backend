import mongoose from "mongoose";
import User from "../models/User.js";

export const getRandomEmployeeCode = async (userId, exclude = []) => {
  const excluded = Array.from(new Set([userId, ...exclude]));
  const randomUser = await User.aggregate([
    {
      $match: {
        _id: {
          $nin: excluded.map((x) => new mongoose.Types.ObjectId(x)),
        },
      },
    },
    { $sample: { size: 1 } },
    { $project: { employeeCode: 1, _id: 0 } },
  ]);
  console.log(randomUser);

  return randomUser;
};
