import { NotFoundError } from "../errors/customErrors.js";
import Leave from "../models/Leave.js";
import PettyCash from "../models/PettyCash.js";
import TimeSheet from "../models/TimeSheet.js";
import User from "../models/User.js";
import { generateReportByUser } from "../utils/generateReportFunction.js";
import { buildScopeQuery } from "../utils/permissionFns.js";

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
      .select("job date timeWorked status user createdAt commentHistory")
      .populate("job", "jobName")
      .populate("user", "username employeeCode")
      .lean();
    const totalTimesheets = await TimeSheet.countDocuments(queryObject);
    data.timesheets = timeSheets;
    data.totalTimesheets = totalTimesheets;
  }
  if (isPettyCash) {
    const pettyCash = await PettyCash.find(queryObject)
      .select("job date amount status user JVEntry commentHistory")
      .populate("job", "jobName")
      .populate("user", "username employeeCode")
      .lean();
    const totalPettyCash = await PettyCash.countDocuments(queryObject);
    data.pettyCash = pettyCash;
    data.totalPettyCash = totalPettyCash;
  }
  if (isLeave) {
    const leaves = await Leave.find(queryObject)
      .select("createdAt startDate endDate leaveType reason status user")
      .populate("user", "username employeeCode")
      .lean();
    const totalLeaves = await Leave.countDocuments(queryObject);
    data.leaves = leaves;
    data.totalLeaves = totalLeaves;
  }
  return generateReportByUser(data, res);
};

export const generateScopedReport = async (req, res) => {
  try {
    const { userId } = req.user;

    const {
      module, // "timesheet" | "pettycash" | "leave"
      action = "read",
      startDate,
      endDate,
    } = req.body;

    if (!module) {
      throw new NotFoundError("Module is required");
    }

    // 🔹 Step 1: Get scoped users
    const scopeQuery = await buildScopeQuery(userId, module, action);
    if (!scopeQuery) {
      throw new NotFoundError("Not authorized");
    }

    const users = await User.find(scopeQuery).select("_id username").lean();

    if (!users.length) {
      throw new NotFoundError("No users found in scope");
    }

    const userIds = users.map((u) => u._id);

    // 🔹 Step 2: Build date filter
    const queryObject = { user: { $in: userIds } };

    if (startDate || endDate) {
      queryObject.createdAt = {};
    }

    if (startDate) {
      queryObject.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryObject.createdAt.$lte = end;
    }

    // 🔹 Step 3: Prepare data object
    let data = {
      employeeName: "Scoped Report",
      from: startDate ? new Date(startDate).toLocaleDateString() : "N/A",
      to: endDate ? new Date(endDate).toLocaleDateString() : "N/A",
      timesheets: [],
      pettyCash: [],
      leaves: [],
    };

    // 🔹 Step 4: Fetch based on module
    if (module === "timesheet") {
      const timeSheets = await TimeSheet.find(queryObject)
        .select("job date timeWorked status user createdAt commentHistory")
        .populate("job", "jobName")
        .populate("user", "username employeeCode")
        .lean();

      data.timesheets = timeSheets;
      data.totalTimesheets = timeSheets.length;
    }

    if (module === "pettycash") {
      const pettyCash = await PettyCash.find(queryObject)
        .select("job date amount status user JVEntry commentHistory")
        .populate("job", "jobName")
        .populate("user", "username employeeCode")
        .lean();

      data.pettyCash = pettyCash;
      data.totalPettyCash = pettyCash.length;
    }

    if (module === "leave") {
      const leaves = await Leave.find(queryObject)
        .select("user createdAt startDate endDate leaveType reason status")
        .populate("user", "username employeeCode")
        .lean();

      data.leaves = leaves;
      data.totalLeaves = leaves.length;
    }

    // 🔹 Step 5: Generate PDF
    return generateReportByUser(data, res);
  } catch (error) {
    console.log("generateScopedReport error:", error);
    res.status(500).json({ msg: "Failed to generate report" });
  }
};
