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
      date: new Date(date),
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

export const getUserSubmittedTimeSheet = async (req, res) => {
  try {
    const timesheets = await TimeSheet.find({
      user: req.user.userId,
    })
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description");
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    res.status(200).json({ timesheets });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

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
