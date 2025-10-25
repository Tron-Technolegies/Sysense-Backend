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
import { getRandomEmployeeCode } from "../utils/finder.js";
import User from "../models/User.js";
import mongoose from "mongoose";

//submitting the timesheet as L0 entry

export const submitTimeSheet = async (req, res) => {
  try {
    const { job, date, time, description } = req.body;
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    const totalTimeSheets = await TimeSheet.find({
      user: req.user.userId,
      date: { $gte: startTime, $lte: endTime },
      status: { $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"] },
    });
    if (totalTimeSheets.length > 0) {
      const totalTime = totalTimeSheets.reduce(
        (sum, item) => sum + item.timeWorked,
        0
      );
      const expected = totalTime + Number(time);
      if (expected > 8)
        throw new BadRequestError(
          `Already worked ${totalTime} hours for the date. So cannot add ${time} more hours (exceeds 8 hour limit)`
        );
    }
    const newStatus = {
      date: new Date(),
      status: "L1 Pending",
      doneBy: req.user.userId,
    };
    const L1 = await getRandomEmployeeCode(req.user.userId);
    const L1User = await User.findOne({ employeeCode: L1[0].employeeCode })
      .select("_id")
      .lean();
    const L1Id = L1User._id;
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
    await newTimeSheet.save();
    res.status(200).json({ msg: "successfully added new Time sheet data" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

// get the user submitted timesheets as L0
export const getUserSubmittedTimeSheet = async (req, res) => {
  try {
    const { status } = req.query;
    const queryObject = { user: req.user.userId };
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
    const timesheets = await TimeSheet.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description");
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    res.status(200).json({ timesheets });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
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
    res.status(500).json({ msg: error.msg || error.message });
  }
};

//getting all timesheets data as L1

export const getPendingActionL1 = async (req, res) => {
  try {
    const id = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(id);
    const queryObject = { relatedL1: formattedId };
    const { status } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }

    const timesheets = await TimeSheet.find(queryObject).populate(
      "job",
      "jobId jobName"
    );
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    res.status(200).json({ timesheets });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
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
    res.status(500).json({ msg: error.msg || error.message });
  }
};

//send back to L0 by L1
export const sendBackL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comment, job, date, time, description } = req.body;
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    const timesheet = await TimeSheet.findById(req.params.id);
    if (!timesheet) throw new NotFoundError("No timesheet found");
    const isAuthorized = timesheet.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    timesheet.status = "L0 Pending";
    timesheet.currentComment = comment;
    timesheet.job = job;
    timesheet.date = new Date(date);
    const totalTimeSheets = await TimeSheet.find({
      user: timesheet.user,
      date: { $gte: startTime, $lte: endTime },
      status: { $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"] },
    });
    if (totalTimeSheets.length > 0) {
      const totalTime = totalTimeSheets.reduce(
        (sum, item) => sum + item.timeWorked,
        0
      );
      const expected = totalTime + Number(time);
      if (expected > 8)
        throw new BadRequestError(
          `Already worked ${totalTime} hours for the date. So cannot add ${time} more hours (exceeds 8 hour limit)`
        );
    }
    timesheet.timeWorked = time;
    timesheet.description = description;
    const newStatus = {
      status: "L0 Pending",
      date: new Date(),
      doneBy: userId,
    };
    timesheet.statusHistory.push(newStatus);
    if (comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      timesheet.commentHistory.push(newComment);
    }
    await timesheet.save();
    res.status(200).json({ msg: "Data  has been sent back" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
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
    const { job, date, time, description } = req.body;
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    const totalTimeSheets = await TimeSheet.find({
      user: req.user.userId,
      date: { $gte: startTime, $lte: endTime },
      status: { $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"] },
    });
    if (totalTimeSheets.length > 0) {
      const totalTime = totalTimeSheets.reduce(
        (sum, item) => sum + item.timeWorked,
        0
      );
      const expected = totalTime + Number(time);
      if (expected > 8)
        throw new BadRequestError(
          `Already worked ${totalTime} hours for the date. So cannot add ${time} more hours (exceeds 8 hour limit)`
        );
    }
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
    await timesheet.save();
    res.status(200).json({ msg: "Timesheet resubmitted successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
