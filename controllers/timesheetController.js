import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import TimeSheet from "../models/TimeSheet.js";
import {
  subWeeks,
  subMonths,
  eachDayOfInterval,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  findTimeSheetL1,
  findTimeSheetL2,
  getRandomEmployeeCode,
} from "../utils/finder.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import {
  checkFor8Hour,
  restrictL0,
  restrictL1,
  restrictL2,
} from "../utils/utilityFunctions.js";

//submitting the timesheet as L0 entry

export const submitTimeSheet = async (req, res) => {
  try {
    const { job, date, time, description, comment } = req.body;
    await checkFor8Hour(req.user.userId, date, time);
    const newStatus = {
      date: new Date(),
      status: "L1 Pending",
      doneBy: req.user.userId,
    };
    // const L1 = await getRandomEmployeeCode(req.user.userId);
    // const L1User = await User.findOne({ employeeCode: L1[0].employeeCode })
    //   .select("_id")
    //   .lean();
    // const L1Id = L1User._id;
    const L1Id = await findTimeSheetL1(job);
    const newTimeSheet = new TimeSheet({
      user: req.user.userId,
      job: job,
      date: new Date(date),
      timeWorked: Number(time),
      description: description,
      status: "L1 Pending",
    });
    newTimeSheet.statusHistory.push(newStatus);
    newTimeSheet.relatedL1.push(L1Id);
    if (comment && newTimeSheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: req.user.userId,
      };
      newTimeSheet.commentHistory.push(newComment);
      newTimeSheet.currentComment = comment;
    }
    await newTimeSheet.save();
    res.status(200).json({ msg: "successfully added new Time sheet data" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

// get the user submitted timesheets as L0
export const getUserSubmittedTimeSheet = async (req, res) => {
  try {
    const { status, currentPage } = req.query;
    const queryObject = { user: req.user.userId };
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description")
      .populate("relatedL1")
      .populate("relatedL2")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    const totalPages = Math.ceil(totalTimesheets / limit);
    res.status(200).json({ timesheets, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//get overview of user submitted by weekly or monthly as L0

export const getUserTimeSheetOverview = async (req, res) => {
  try {
    const { type } = req.query;
    if (type !== "week" && type !== "month") {
      throw new BadRequestError("Please select a valid filter Type");
    }
    const today = new Date();
    const startDate =
      type === "week"
        ? startOfDay(subWeeks(today, 1))
        : startOfDay(subMonths(today, 1));
    const endDate = endOfDay(today);

    const timesheets = await TimeSheet.find({
      user: req.user.userId,
      date: { $gte: startDate, $lte: endDate },
      status: { $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"] },
    });
    const hoursByDate = {};
    timesheets.forEach((t) => {
      const dateStr = format(t.date, "yyyy-MM-dd");
      hoursByDate[dateStr] = (hoursByDate[dateStr] || 0) + t.timeWorked;
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const summary = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const worked = hoursByDate[dateStr] || 0;
      return {
        date: dateStr,
        hoursWorked: worked,
        summary: `${worked}/8`,
      };
    });
    res.status(200).json({
      msg: `Timesheet summary for past ${type}`,
      from: format(startDate, "yyyy-MM-dd"),
      to: format(endDate, "yyyy-MM-dd"),
      totalDays: summary.length,
      data: summary,
    });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//getting all timesheets data as L1

export const getPendingActionL1 = async (req, res) => {
  try {
    const id = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(id);
    const queryObject = { relatedL1: formattedId };
    const { status, currentPage } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description")
      .populate("relatedL1")
      .populate("relatedL2")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    const totalPages = Math.ceil(totalTimesheets / limit);
    res.status(200).json({ timesheets, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//reject time sheet as L1
export const rejectTimeSheetL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(userId);
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet has been found");
    const isAuthorized = timesheet.relatedL1.some(
      (id) => id.toString() === formattedId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL1.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    timesheet.status = "L1 Rejected";
    const newStatus = {
      status: "L1 Rejected",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    await timesheet.save();
    res.status(200).json({ msg: "Time sheet data has been rejected" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//send back to L0 by L1
export const sendBackToL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment, job, date, time, description } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorized = timesheet.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (restrictL1.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    timesheet.status = "L0 Pending";

    timesheet.job = job;
    timesheet.date = new Date(date);
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    timesheet.timeWorked = time;
    timesheet.description = description;
    const newStatus = {
      status: "L0 Pending",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.commentHistory.push(newComment);
      timesheet.currentComment = comment;
    }
    await timesheet.save();
    res.status(200).json({ msg: "Data  has been sent back" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Resubmit Timesheet by L0
export const resubmitTimesheetByL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    if (timesheet.user.toString() !== userId.toString())
      throw new BadRequestError("Not authorised");
    if (restrictL0.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const { job, date, time, description, comment } = req.body;
    await checkFor8Hour(req.user.userId, date, time, timesheet._id);
    timesheet.status = "L1 Pending";
    timesheet.date = new Date(date);
    timesheet.timeWorked = time;
    timesheet.job = job;
    timesheet.description = description;
    const newStatus = {
      status: "L1 Pending",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.commentHistory.push(newComment);
      timesheet.currentComment = comment;
    }
    await timesheet.save();
    res.status(200).json({ msg: "Timesheet resubmitted successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//modify timesheet by L1
export const modifyTimesheetDataL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment, job, date, time, description } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    if (restrictL1.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const isAuthorized = timesheet.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);

    timesheet.job = job;
    timesheet.date = new Date(date);
    timesheet.timeWorked = Number(time);
    timesheet.description = description;
    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.currentComment = comment;
      timesheet.commentHistory.push(newComment);
    }
    await timesheet.save();
    res.status(200).json({ msg: "successfully modified" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Approve data by L1
export const approveDatabyL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    if (restrictL1.includes(timesheet.status)) {
      throw new BadRequestError("This Operation is not Allowed at the moment");
    }
    const isAuthorized = timesheet.relatedL1.some(
      (item) => item.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not Authorised to do this Operation");
    // const L2 = await getRandomEmployeeCode(timesheet.user, timesheet.relatedL1);
    // if (!L2 || L2.length < 1)
    //   throw new BadRequestError("No Available L2 Found");
    // const L2User = await User.findOne({ employeeCode: L2[0].employeeCode })
    //   .select("_id")
    //   .lean();
    const L2Id = await findTimeSheetL2(timesheet.user);
    const newStatus = {
      date: new Date(),
      status: "L2 Pending",
      doneBy: userId,
    };
    timesheet.status = "L2 Pending";
    timesheet.relatedL2.push(L2Id);
    timesheet.statusHistory.push(newStatus);
    await timesheet.save();
    res.status(200).json({ msg: "Data Approved", data: timesheet });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//getting all pending data for L2
export const getDataforL2 = async (req, res) => {
  try {
    const id = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(id);
    const queryObject = { relatedL2: formattedId };
    const { status, currentPage } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description")
      .populate("relatedL1")
      .populate("relatedL2")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    const totalPages = Math.ceil(totalTimesheets / limit);
    res.status(200).json({ timesheets, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Reject Data by L2
export const rejectL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorised = timesheet.relatedL2.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorised)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    timesheet.status = "L2 Rejected";
    const newStatus = {
      status: "L2 Rejected",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    await timesheet.save();
    res.status(200).json({ msg: "Time sheet data has been rejected" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Approve L2
export const approveL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorised = timesheet.relatedL2.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorised)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This Operation is not Allowed at the moment");
    const newStatus = {
      date: new Date(),
      status: "L3 Pending",
      doneBy: userId,
    };
    timesheet.status = "L3 Pending";
    timesheet.statusHistory.push(newStatus);
    await timesheet.save();
    res.status(200).json({ msg: "Data Approved", data: timesheet });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//modify by L2
export const modifyL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment, job, date, time, description } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const isAuthorized = timesheet.relatedL2.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);

    timesheet.job = job;
    timesheet.date = new Date(date);
    timesheet.timeWorked = Number(time);
    timesheet.description = description;
    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.currentComment = comment;
      timesheet.commentHistory.push(newComment);
    }
    await timesheet.save();
    res.status(200).json({ msg: "successfully modified" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//sendback to L1
export const sendBacktoL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment, job, date, time, description } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorized = timesheet.relatedL2.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    timesheet.status = "L1 Pending";
    timesheet.job = job;
    timesheet.date = new Date(date);
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    timesheet.timeWorked = time;
    timesheet.description = description;
    const newStatus = {
      status: "L1 Pending",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.currentComment = comment;
      timesheet.commentHistory.push(newComment);
    }
    timesheet.l1Reubmit = true;
    await timesheet.save();
    res.status(200).json({ msg: "Data  has been sent back" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//resubmit by L1
export const resubmitByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorised = timesheet.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorised)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL1.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const { job, date, time, description, comment } = req.body;
    await checkFor8Hour(req.user.userId, date, time, timesheet._id);
    timesheet.status = "L2 Pending";
    timesheet.date = new Date(date);
    timesheet.timeWorked = time;
    timesheet.job = job;
    timesheet.description = description;
    const newStatus = {
      status: "L2 Pending",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);

    if (comment && timesheet.currentComment !== comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.currentComment = comment;
      timesheet.commentHistory.push(newComment);
    }
    timesheet.l1Reubmit = false;
    await timesheet.save();
    res.status(200).json({ msg: "Timesheet resubmitted successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
