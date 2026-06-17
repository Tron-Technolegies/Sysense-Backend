import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/customErrors.js";
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
  checkDuplicateJobTimeSheet,
  checkFor8Hour,
  restrictL0,
  restrictL1,
  restrictL2,
} from "../utils/utilityFunctions.js";
import Default from "../models/Default.js";
import Job from "../models/Job.js";

//submitting the timesheet as L0 entry

export const submitTimeSheet = async (req, res) => {
  try {
    const { job, date, time, description, comment } = req.body;
    await checkFor8Hour(req.user.userId, date, time);
    await checkDuplicateJobTimeSheet(req.user.userId, job, date);
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
    if (!L1Id) throw new BadRequestError("No L1 found for this data");
    const L2Id = await findTimeSheetL2(req.user.userId);
    if (!L2Id) throw new BadRequestError("No L2 found for this data");
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
    newTimeSheet.mainL2 = L2Id;
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
    const { status, currentPage, search, startDate, endDate } = req.query;
    const queryObject = { user: req.user.userId };
    if (status && status !== "ALL") {
      queryObject.status = status;
    }
    if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" },
      }).select("_id");

      const jobs = await Job.find({
        $or: [
          { jobId: { $regex: search, $options: "i" } },
          { jobName: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      queryObject.$or = [
        { user: { $in: users.map((u) => u._id) } },
        { job: { $in: jobs.map((j) => j._id) } },
      ];
    }

    // FILTER BY DATE
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      queryObject.date = { $gte: start, $lte: end };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
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
    const { status, currentPage, search, startDate, endDate } = req.query;
    if (status && status !== "ALL") {
      queryObject.status = status;
    }
    if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" },
      }).select("_id");

      const jobs = await Job.find({
        $or: [
          { jobId: { $regex: search, $options: "i" } },
          { jobName: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      queryObject.$or = [
        { user: { $in: users.map((u) => u._id) } },
        { job: { $in: jobs.map((j) => j._id) } },
      ];
    }

    // FILTER BY DATE
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      queryObject.date = { $gte: start, $lte: end };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
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
    const { comment } = req.body;
    const formattedId = new mongoose.Types.ObjectId(userId);
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet has been found");
    const isAuthorized = timesheet.relatedL1.some(
      (id) => id.toString() === formattedId.toString(),
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
    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
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
      (id) => id.toString() === userId.toString(),
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
    await checkDuplicateJobTimeSheet(req.user.userId, job, date, timesheet._id);
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
      (id) => id.toString() === userId.toString(),
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    await checkDuplicateJobTimeSheet(timesheet.user, job, date, timesheet._id);
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
    const { l2Users, comment } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    if (restrictL1.includes(timesheet.status)) {
      throw new BadRequestError("This Operation is not Allowed at the moment");
    }
    const isAuthorized = timesheet.relatedL1.some(
      (item) => item.toString() === userId.toString(),
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
    if (!L2Id) throw new BadRequestError("Unable to find L2 for this data");
    timesheet.mainL2 = L2Id;
    const defaultSettings = await Default.findOne();
    if (defaultSettings.timeSheetMultipleL2) {
      if (l2Users) {
        timesheet.relatedL2 = [...l2Users];
        timesheet.l2Status = {
          status: `Pending L2 Approvals`,
          stages: timesheet.relatedL2.length + 1,
          completed: 0,
          users: [],
        };
      }
    }
    const newStatus = {
      date: new Date(),
      status: "L2 Pending",
      doneBy: userId,
    };
    timesheet.status = "L2 Pending";
    timesheet.statusHistory.push(newStatus);
    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
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
    const queryObject = {
      $or: [{ relatedL2: formattedId }, { mainL2: formattedId }],
    };
    const { status, currentPage, search, startDate, endDate } = req.query;
    if (status && status !== "ALL") {
      queryObject.status = status;
    }
    if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" },
      }).select("_id");

      const jobs = await Job.find({
        $or: [
          { jobId: { $regex: search, $options: "i" } },
          { jobName: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      queryObject.$or = [
        { user: { $in: users.map((u) => u._id) } },
        { job: { $in: jobs.map((j) => j._id) } },
      ];
    }

    // FILTER BY DATE
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      queryObject.date = { $gte: start, $lte: end };
    }
    const page = Number(currentPage) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
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
    const { comment } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorised = timesheet.mainL2.toString() === userId.toString();
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
    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
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
    const { comment } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorised = timesheet.mainL2.toString() === userId.toString();
    if (!isAuthorised)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This Operation is not Allowed at the moment");

    if (timesheet.l2Status && timesheet.l2Status.users) {
      const alreadyApproved = timesheet.l2Status.users.some(
        (id) => id.toString() === userId.toString(),
      );
      if (alreadyApproved)
        throw new BadRequestError("User Already Approved this data");
    }
    const isRelatedL2 = timesheet.relatedL2?.some(
      (id) => id.toString() === userId.toString(),
    );
    const isMainL2 = timesheet.mainL2?.toString() === userId.toString();

    if (timesheet.l2Status && timesheet.l2Status.status) {
      const newCompleted = timesheet.l2Status.completed + 1;
      timesheet.l2Status.status = `${newCompleted}/${timesheet.l2Status.stages} L2 Approved`;
      timesheet.l2Status.completed = newCompleted;
      timesheet.l2Status.users.push(userId);
    }

    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }

    if (isRelatedL2) {
      await timesheet.save();
      return res.status(200).json({ msg: "Data Approved", data: timesheet });
    }

    if (isMainL2) {
      const newStatus = {
        date: new Date(),
        status: "L3 Pending",
        doneBy: userId,
      };
      timesheet.status = "L3 Pending";
      timesheet.statusHistory.push(newStatus);
      await timesheet.save();
      res.status(200).json({ msg: "Data Approved", data: timesheet });
    }
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
    const isAuthorized =
      timesheet.relatedL2?.some((id) => id.toString() === userId.toString()) ||
      timesheet.mainL2.toString() === userId.toString();
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (timesheet.l2Status && timesheet.l2Status.users) {
      const alreadyApproved = timesheet.l2Status.users.some(
        (id) => id.toString() === userId.toString(),
      );
      if (alreadyApproved)
        throw new BadRequestError("User Already Approved this data");
    }
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    await checkDuplicateJobTimeSheet(timesheet.user, job, date, timesheet._id);
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
    const isAuthorized = timesheet.mainL2.toString() === userId.toString();
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (restrictL2.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    timesheet.status = "L1 Pending";
    timesheet.job = job;
    timesheet.date = new Date(date);
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    await checkDuplicateJobTimeSheet(timesheet.user, date, time, timesheet._id);
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
      (id) => id.toString() === userId.toString(),
    );
    if (!isAuthorised)
      throw new BadRequestError("Not Authorised to do this operation");
    if (restrictL1.includes(timesheet.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const { job, date, time, description, comment } = req.body;
    await checkFor8Hour(timesheet.user, date, time, timesheet._id);
    await checkDuplicateJobTimeSheet(timesheet.user, job, date, timesheet._id);
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

//get Pending data for L3
export const getDataForL3 = async (req, res) => {
  try {
    const id = req.user.userId;
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new BadRequestError("No default settings found for L3");
    if (!defaultSettings.defaultTimeSheetL3)
      throw new NotFoundError("No default L3 assigned");
    if (defaultSettings.defaultTimeSheetL3.toString() !== id.toString())
      throw new NotFoundError("Invalid L3 User");
    const queryObject = {};
    const { status, currentPage, search, startDate, endDate } = req.query;
    if (status && status !== "ALL") {
      queryObject.status = status;
    }
    if (search) {
      const users = await User.find({
        username: { $regex: search, $options: "i" },
      }).select("_id");

      const jobs = await Job.find({
        $or: [
          { jobId: { $regex: search, $options: "i" } },
          { jobName: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      queryObject.$or = [
        { user: { $in: users.map((u) => u._id) } },
        { job: { $in: jobs.map((j) => j._id) } },
      ];
    }

    // FILTER BY DATE
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      queryObject.date = { $gte: start, $lte: end };
    }
    const page = Number(currentPage);
    const limit = 15;
    const skip = (page - 1) * limit;
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    const totalPages = Math.ceil(totalTimesheets / limit);
    res.status(200).json({ timesheets, totalPages, totalTimesheets });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const rejectTimeSheetByL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const { comment } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("NO Timesheet found");
    // if (timesheet.status !== "L3 Pending")
    //   throw new BadRequestError("Operation not allowed at the moment");
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new NotFoundError("No default settings found for L3");
    if (!defaultSettings.defaultTimeSheetL3)
      throw new BadRequestError("No default L3 found");
    if (defaultSettings.defaultTimeSheetL3.toString() !== userId.toString())
      throw new UnauthorizedError("Invalid L3 User");
    timesheet.status = "L3 Rejected";
    timesheet.statusHistory.push({
      status: "L3 Rejected",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await timesheet.save();
    res.status(200).json({ message: "L3 Rejected" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const approveTimeSheetL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const { comment } = req.body;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("NO Timesheet found");
    // if (timesheet.status !== "L3 Pending")
    //   throw new BadRequestError("Operation not allowed at the moment");
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new NotFoundError("No default settings found for L3");
    if (!defaultSettings.defaultTimeSheetL3)
      throw new BadRequestError("No default L3 found");
    if (defaultSettings.defaultTimeSheetL3.toString() !== userId.toString())
      throw new UnauthorizedError("Invalid L3 User");
    timesheet.status = "Approved";
    timesheet.statusHistory.push({
      status: "Approved",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      timesheet.currentComment = comment;
      timesheet.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await timesheet.save();
    res.status(200).json({ message: "L3 Approved" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const deleteTimeSheetL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("no timesheet has been found");
    const defaultSettings = await Default.findOne();
    if (!defaultSettings)
      throw new NotFoundError("No default settings found for L3");
    if (!defaultSettings.defaultTimeSheetL3)
      throw new BadRequestError("No default L3 found");
    if (defaultSettings.defaultTimeSheetL3.toString() !== userId.toString())
      throw new UnauthorizedError("Invalid L3 User");
    await timesheet.deleteOne();
    res.status(200).json({ message: "Timesheet deleted" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const bulkApproveL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timesheetIds, comment } = req.body;

    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new BadRequestError("Please provide timesheet IDs");
    }

    const timesheets = await TimeSheet.find({
      _id: { $in: timesheetIds },
    });

    const updatedTimesheets = [];
    const failedTimesheets = [];

    for (const timesheet of timesheets) {
      try {
        const isAuthorised = timesheet.mainL2?.toString() === userId.toString();

        if (!isAuthorised) {
          failedTimesheets.push({
            id: timesheet._id,
            reason: "Not Authorised",
          });
          continue;
        }

        if (restrictL2.includes(timesheet.status)) {
          failedTimesheets.push({
            id: timesheet._id,
            reason: "Operation not allowed",
          });
          continue;
        }

        const alreadyApproved = timesheet.l2Status?.users?.some(
          (id) => id.toString() === userId.toString(),
        );

        if (alreadyApproved) {
          failedTimesheets.push({
            id: timesheet._id,
            reason: "Already Approved",
          });
          continue;
        }

        const isRelatedL2 = timesheet.relatedL2?.some(
          (id) => id.toString() === userId.toString(),
        );

        const isMainL2 = timesheet.mainL2?.toString() === userId.toString();

        if (timesheet.l2Status?.status) {
          const newCompleted = timesheet.l2Status.completed + 1;

          timesheet.l2Status.status = `${newCompleted}/${timesheet.l2Status.stages} L2 Approved`;

          timesheet.l2Status.completed = newCompleted;
          timesheet.l2Status.users.push(userId);
        }

        if (comment) {
          timesheet.currentComment = comment;
          timesheet.commentHistory.push({
            date: new Date(),
            comment,
            commentedBy: userId,
          });
        }

        if (isMainL2 && !isRelatedL2) {
          timesheet.status = "L3 Pending";

          timesheet.statusHistory.push({
            date: new Date(),
            status: "L3 Pending",
            doneBy: userId,
          });
        }

        updatedTimesheets.push(timesheet.save());
      } catch (err) {
        failedTimesheets.push({
          id: timesheet._id,
          reason: err.message,
        });
      }
    }

    await Promise.all(updatedTimesheets);

    res.status(200).json({
      msg: "Bulk approval completed",
      successCount: updatedTimesheets.length,
      failedCount: failedTimesheets.length,
      failedTimesheets,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.msg || error.message,
    });
  }
};

export const bulkApproveTimeSheetL3 = async (req, res) => {
  try {
    const { userId } = req.user;
    const { timesheetIds, comment } = req.body;

    const defaultSettings = await Default.findOne();

    if (
      !defaultSettings ||
      !defaultSettings.defaultTimeSheetL3 ||
      defaultSettings.defaultTimeSheetL3.toString() !== userId.toString()
    ) {
      throw new UnauthorizedError("Invalid L3 User");
    }

    const update = {
      $set: {
        status: "Approved",
      },
      $push: {
        statusHistory: {
          status: "Approved",
          date: new Date(),
          doneBy: userId,
        },
      },
    };

    if (comment) {
      update.$set.currentComment = comment;

      update.$push.commentHistory = {
        date: new Date(),
        comment,
        commentedBy: userId,
      };
    }

    const result = await TimeSheet.updateMany(
      {
        _id: { $in: timesheetIds },
        status: "L3 Pending", // optional safety check
      },
      update,
    );

    res.status(200).json({
      message: "Bulk L3 approval completed",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.msg || error.message,
    });
  }
};
