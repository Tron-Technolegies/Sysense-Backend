import { NotFoundError } from "../errors/customErrors.js";
import Leave from "../models/Leave.js";
import PettyCash from "../models/PettyCash.js";
import TimeSheet from "../models/TimeSheet.js";
import User from "../models/User.js";
import { generateReportByUser } from "../utils/generateReportFunction.js";

export const generateUserReport = async (req, res) => {
  const { userId } = req.user;
  const { isTimesheet, isPettyCash, isLeave, startDate, endDate } = req.body;
  const user = await User.findById(userId)
    .select("username employeeCode role manager")
    .lean();
  if (!user) throw new NotFoundError("No user found");
  let data = {
    employeeName: user.username,
    from: new Date(startDate).toLocaleDateString(),
    to: new Date(endDate).toLocaleDateString(),
    timesheets: [],
    pettyCash: [],
    leaves: [],
  };
  const queryObject = { user: userId };
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
  if (isTimesheet) {
    const timeSheets = await TimeSheet.find(queryObject)
      .select("job date timeWorked status")
      .populate("job", "jobName")
      .lean();
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    data.timesheets = timeSheets;
    data.totalTimesheets = totalTimesheets;
  }
  if (isPettyCash) {
    const pettyCash = await PettyCash.find(queryObject)
      .select("job date amount status")
      .populate("job", "jobName")
      .lean();
    const totalPettyCash = await PettyCash.countDocuments(queryObject);
    data.pettyCash = pettyCash;
    data.totalPettyCash = totalPettyCash;
  }
  if (isLeave) {
    const leaves = await Leave.find(queryObject)
      .select("createdAt startDate endDate leaveType reason status")
      .lean();
    const totalLeaves = await Leave.countDocuments(queryObject);
    data.leaves = leaves;
    data.totalLeaves = totalLeaves;
  }
  return generateReportByUser(data, res);
};
