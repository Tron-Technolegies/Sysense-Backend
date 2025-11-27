import { formatImage } from "../middlewares/multerMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import Leave from "../models/Leave.js";
import { NotFoundError } from "../errors/customErrors.js";
import mongoose from "mongoose";
import { getRandomEmployeeCode } from "../utils/finder.js";
import User from "../models/User.js";

export const applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    let image = "";
    let imageId = "";
    if (req.file) {
      const file = formatImage(req.file);
      const response = await cloudinary.uploader.upload(file);
      image = response.secure_url;
      imageId = response.public_id;
    }
    const newStatus = {
      date: new Date(),
      status: "L1 Pending",
      doneBy: req.user.userId,
    };
    const newLeave = new Leave({
      user: req.user.userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveType: leaveType,
      reason: reason,
      image: image,
      imagePublicId: imageId,
      status: "L1 Pending",
    });
    if (comment && comment !== "") {
      newLeave.currentComment = comment;
      newLeave.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: req.user.userId,
      });
    }
    const L1 = await getRandomEmployeeCode(req.user.userId);
    const L1user = await User.findOne({ employeeCode: L1[0].employeeCode })
      .select("_id")
      .lean();
    const L1Id = L1user._id;
    newLeave.statusHistory.push(newStatus);
    newLeave.relatedL1.push(L1Id);
    await newLeave.save();
    res.status(200).json({ msg: "Leave Applied successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getUserAppliedLeave = async (req, res) => {
  try {
    const { start, end, total } = req.query;
    const queryObject = { user: req.user.userId };
    const limit = total || 30;
    const leaves = await Leave.find(queryObject)
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .limit(limit);
    if (leaves.length < 1) throw new NotFoundError("No leave data found");
    res.status(200).json({ leaves });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//getData for L1
export const getDataForL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(userId);
    const queryObject = { relatedL1: formattedId };
    const { currentPage, startDate, endDate, total } = req.query;
    if (startDate || endDate) {
      queryObject.createdAt = {};
    }
    if (startDate) {
      const start = new Date(startDate);
      queryObject.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryObject.createdAt.$lte = end;
    }
    const page = Number(currentPage) || 1;
    const limit = Number(total) || 30;
    const skip = (page - 1) * limit;
    const leaves = await Leave.find(queryObject)
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (!leaves) throw new NotFoundError("No Leaves found");
    res.status(200).json(leaves);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
