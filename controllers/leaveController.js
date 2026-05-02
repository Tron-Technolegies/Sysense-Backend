import { formatImage } from "../middlewares/multerMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import Leave from "../models/Leave.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/customErrors.js";
import mongoose from "mongoose";
import {
  findLeaveL1,
  findLeaveL2,
  getRandomEmployeeCode,
} from "../utils/finder.js";
import User from "../models/User.js";
import {
  restrictL0,
  restrictL1,
  restrictL2,
} from "../utils/utilityFunctions.js";
import { generateRegex } from "../utils/regex.js";
import Default from "../models/Default.js";

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
    // const L1 = await getRandomEmployeeCode(req.user.userId);
    // const L1user = await User.findOne({ employeeCode: L1[0].employeeCode })
    //   .select("_id")
    //   .lean();
    const L1Id = await findLeaveL1(req.user.userId);
    if (!L1Id) throw new BadRequestError("No L1 found for this data");
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

//Reject Leave Data by L1
export const rejectDataByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    const isAuthorised = leave.relatedL1.some(
      (item) => item.toString() === userId.toString(),
    );
    if (!isAuthorised)
      throw new UnauthorizedError("Not Authorised to do this operation");
    if (restrictL1.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.status = "L1 Rejected";
    const newStatus = {
      status: "L1 Rejected",
      date: new Date(),
      doneBy: userId,
    };
    leave.statusHistory.push(newStatus);
    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await leave.save();
    res.status(200).json({ msg: "Rejected", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Send Back to L0
export const sendBackToL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No Leave found");
    const isAuthorized = leave.relatedL1.some(
      (item) => item.toString() === userId.toString(),
    );
    if (!isAuthorized)
      throw new UnauthorizedError("Not Authorised to do this operation");
    if (restrictL1.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    leave.status = "L0 Pending";
    leave.statusHistory.push({
      status: "L0 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    await leave.save();
    res.status(200).json({ message: "Send Back to L0", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Resubmit by L0
export const reSubmitByL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    if (leave.user.toString() !== userId.toString())
      throw new UnauthorizedError("Not authorised to do this operation");
    if (restrictL0.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    leave.status = "L1 Pending";
    leave.statusHistory.push({
      status: "L1 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    await leave.save();
    res.status(200).json({ msg: "resubmitted data", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Modify Data by L1
export const modifyDataByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    const isAuthorized = leave.relatedL1.some(
      (item) => item.toString() === userId.toString(),
    );
    if (!isAuthorized)
      throw new UnauthorizedError("Not authorised to do this operation");
    if (restrictL1.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    await leave.save();
    res.status(200).json({ msg: "Modified Successfully", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Approve By L1
export const approveL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { l2Users, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    const isAuthorized = leave.relatedL1.some(
      (item) => item.toString() === userId.toString(),
    );
    if (!isAuthorized)
      throw new UnauthorizedError("Not Authorized to do this operation");
    if (restrictL1.includes(leave.status))
      throw new BadRequestError("this operation is not allowed at the moment");
    // const L2 = await getRandomEmployeeCode(leave.user, leave.relatedL1, 3);
    // if (!L2 || L2.length < 1) throw new BadRequestError("No available L2");
    // const L2UserIds = await Promise.all(
    //   L2.map(async (item) => {
    //     const u = await User.findOne({
    //       employeeCode: item.employeeCode,
    //     })
    //       .select("_id")
    //       .lean();
    //     return u._id;
    //   })
    // );
    // const validL2Ids = L2UserIds.filter((id) => id); //Removing Null Values if any
    // if (validL2Ids.length < 1)
    //   throw new BadRequestError("No valid L2 users found");
    // leave.mainL2 = validL2Ids[0];
    // if (validL2Ids.length > 1) {
    //   leave.relatedL2.push(...validL2Ids.slice(1));
    // }
    const mainL2 = await findLeaveL2(leave.relatedL1[0]);
    if (!mainL2) throw new NotFoundError("No L2 found for this data");
    leave.mainL2 = mainL2;
    const defaultSettings = await Default.findOne();
    if (defaultSettings?.leaveMultipleL2) {
      if (l2Users) {
        leave.relatedL2 = [...l2Users];
        leave.l2Status = {
          status: "Pending L2 Approvals",
          stages: leave.relatedL2.length + 1,
          completed: 0,
          users: [],
        };
      }
    }

    leave.status = "L2 Pending";
    leave.statusHistory.push({
      status: "L2 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await leave.save();
    res.status(200).json({ msg: "Data Approved", data: leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Get Data for L2
export const getDataForL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(userId);
    const queryObject = {
      $or: [{ relatedL2: formattedId }, { mainL2: formattedId }],
    };
    const { status, currentPage, startDate, endDate } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
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
    const limit = 20;
    const skip = (page - 1) * limit;
    const leaves = await Leave.find(queryObject)
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalLeaves = await Leave.countDocuments(queryObject);
    const totalPages = Math.ceil(totalLeaves / limit);
    res.status(200).json({ leaves, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Modify Data by L2
export const modifyDataByL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    if (restrictL2.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at  the moment");
    const isAuthorized = leave.relatedL2?.some(
      (item) =>
        item.toString() === userId.toString() ||
        leave.mainL2.toString() === userId.toString(),
    );
    if (!isAuthorized)
      throw new UnauthorizedError("Not Authorized to do this operation");

    if (leave.l2Status && leave.l2Status.users) {
      const alreadyApproved = leave.l2Status.users.some(
        (item) => item.toString() === userId.toString(),
      );
      if (alreadyApproved)
        throw new BadRequestError("User already Approved this data");
    }

    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    await leave.save();
    res.status(200).json({ msg: "Data modified", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Reject by L2
export const rejectByL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No Leave found");
    const isAuthorized = leave.mainL2.toString() === userId.toString();
    if (!isAuthorized)
      throw new UnauthorizedError("Not Authorised to do this operation");
    if (restrictL2.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.status = "L2 Rejected";
    leave.statusHistory.push({
      status: "L2 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await leave.save();
    res.status(200).json({ msg: "Rejected", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//sendBack by L2
export const sendBackByL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No Leave found");
    const isAuthorized = leave.mainL2.toString() === userId.toString();
    if (!isAuthorized)
      throw new UnauthorizedError("Not authorised for this operation");
    if (restrictL2.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    leave.status = "L1 Pending";
    leave.statusHistory.push({
      status: "L1 Pending",
      date: new Date(),
      doneBy: userId,
    });
    leave.l1Resubmit = true;
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    await leave.save();
    res.status(200).json({ msg: "Data send back", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Resubmit by L1
export const resubmitByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, leaveType, reason, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    const isAuthorised = leave.relatedL1.some(
      (item) => item.toString() === userId.toString(),
    );
    if (!isAuthorised)
      throw new UnauthorizedError("Not authorised to do this operation");
    if (restrictL1.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    leave.startDate = new Date(startDate);
    leave.endDate = new Date(endDate);
    leave.leaveType = leaveType;
    leave.reason = reason;
    leave.status = "L2 Pending";
    leave.statusHistory.push({
      status: "L2 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment && leave.currentComment !== comment) {
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
      leave.currentComment = comment;
    }
    leave.l1Resubmit = false;
    await leave.save();
    res.status(200).json({ msg: "Data resubmitted", leave });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Approve by L2
export const approveL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("No leave found");
    const isAuthorized =
      leave.relatedL2?.some((id) => id.toString() === userId.toString()) ||
      leave.mainL2.toString() === userId.toString();
    if (!isAuthorized)
      throw new UnauthorizedError("Not authorised to do this operation");
    if (restrictL2.includes(leave.status))
      throw new BadRequestError("This operation is not allowed at the moment");

    if (leave.l2Status && leave.l2Status.users) {
      const alreadyApproved = leave.l2Status.users.some(
        (id) => id.toString() === userId.toString(),
      );
      if (alreadyApproved)
        throw new BadRequestError("User already approved this data");
    }

    const isRelatedL2 = leave.relatedL2?.some(
      (id) => id.toString() === userId.toString(),
    );
    const isMainL2 = leave.mainL2.toString() === userId.toString();

    if (leave.l2Status && leave.l2Status.completed) {
      const newCompleted = leave.l2Status.completed + 1;
      leave.l2Status.status = `${newCompleted}/${leave.l2Status.stages} L2 Approved`;
      leave.l2Status.completed = newCompleted;
      leave.l2Status.users.push(userId);
    }

    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
    }

    if (isRelatedL2) {
      await leave.save();
      return res.status(200).json({ msg: "Data Approved", data: leave });
    }

    if (isMainL2) {
      const newStatus = {
        date: new Date(),
        status: "L3 Pending",
        doneBy: userId,
      };
      leave.status = "L3 Pending";
      leave.statusHistory.push(newStatus);
      await leave.save();
      return res.status(200).json({ msg: "Data Approved", data: leave });
    }
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//get leave overview of user
export const leaveOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { start, end } = req.query;
    const queryObject = { user: userId };
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() - 1);
    if (!start || !end) {
      queryObject.createdAt = { $gte: endDate, $lte: startDate };
    }
    if (start && end) {
      const startRange = new Date(start);
      const endRange = new Date(end);
      endRange.setHours(23, 59, 59, 999);
      queryObject.createdAt = { $gte: startRange, $lte: endRange };
    }
    const leaves = await Leave.find(queryObject);
    const sick = leaves.filter((item) =>
      generateRegex("sick").test(item.leaveType),
    );
    const earned = leaves.filter((item) =>
      generateRegex("earned").test(item.leaveType),
    );
    const casual = leaves.filter((item) =>
      generateRegex("casual").test(item.leaveType),
    );
    res.status(200).json({
      total: leaves.length,
      sick: sick.length,
      earned: earned.length,
      casual: casual.length,
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//get data for L3
export const getDataForL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new BadRequestError("No default settings found for L3");
    if (!defaultSettings.defaultLeaveL3)
      throw new NotFoundError("No default L3 assigned");
    if (defaultSettings.defaultLeaveL3.toString() !== userId.toString())
      throw new NotFoundError("Invalid L3 User");
    const queryObject = {};
    const { status, currentPage, startDate, endDate } = req.query;
    if (status & (status !== "ALL")) {
      queryObject.status = { $regex: status, $options: "i" };
    }
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
    const page = Number(currentPage);
    const limit = 15;
    const skip = (page - 1) * limit;
    const leaves = await Leave.find(queryObject)
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalLeaves = await Leave.countDocuments(queryObject);
    const totalPages = Math.ceil(totalLeaves / limit);
    res.status(200).json({ leaves, totalLeaves, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const rejectLeaveByL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const { comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("NO leave found");
    if (leave.status !== "L3 Pending")
      throw new NotFoundError("Operation not allowed at the moment");
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new NotFoundError("No default settings found for L3");
    if (!defaultSettings.defaultLeaveL3)
      throw new BadRequestError("No default L3 found");
    if (defaultSettings.defaultLeaveL3.toString() !== userId.toString())
      throw UnauthorizedError("Invalid L3 User");
    leave.status = "L3 Rejected";
    leave.statusHistory.push({
      status: "L3 Rejected",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
    }
    await leave.save();
    res.status(200).json({ message: "L3 Rejected" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const approveLeaveByL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const { comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new NotFoundError("NO leave found");
    if (leave.status !== "L3 Pending")
      throw new NotFoundError("Operation not allowed at the moment");
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new NotFoundError("No default settings found for L3");
    if (!defaultSettings.defaultLeaveL3)
      throw new BadRequestError("No default L3 found");
    if (defaultSettings.defaultLeaveL3.toString() !== userId.toString())
      throw UnauthorizedError("Invalid L3 User");
    leave.status = "Approved";
    leave.statusHistory.push({
      status: "Approved",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      leave.currentComment = comment;
      leave.commentHistory.push({
        comment: comment,
        date: new Date(),
        commentedBy: userId,
      });
    }
    await leave.save();
    res.status(200).json({ message: "Approved" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
