import { BadRequestError } from "../errors/customErrors.js";
import TimeSheet from "../models/TimeSheet.js";

export const checkFor8Hour = async (userId, date, time, excludeId = null) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  const query = {
    user: userId,
    date: { $gte: startDate, $lte: endDate },
    status: { $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"] },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const totalTimeSheets = await TimeSheet.find(query);
  const totalTime = totalTimeSheets.reduce(
    (sum, item) => sum + Number(item.timeWorked || 0),
    0,
  );
  const expected = totalTime + Number(time);
  if (expected > 8) {
    throw new BadRequestError(
      `Already worked ${totalTime} hours for the date. So cannot add ${time} more hours (exceeds 8-hour limit)`,
    );
  }
};

export const checkDuplicateJobTimeSheet = async (
  userId,
  jobId,
  date,
  excludeId = null,
) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const query = {
    user: userId,
    job: jobId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    status: {
      $nin: ["L1 Rejected", "L2 Rejected", "L3 Rejected"],
    },
  };

  // Useful for edit/update controller
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await TimeSheet.findOne(query).lean();

  if (existing) {
    throw new BadRequestError(
      "You have already submitted a timesheet for this job on this date",
    );
  }
};

export const restrictL0 = [
  "L1 Pending",
  "L2 Pending",
  "L3 Pending",
  "L1 Rejected",
  "L2 Rejected",
  "L3 Rejected",
  "Approved",
];

export const restrictL1 = [
  "L0 Pending",
  "L2 Pending",
  "L2 Rejected",
  "L3 Pending",
  "L3 Rejected",
  "Approved",
  "L1 Rejected",
];

export const restrictL2 = [
  "L0 Pending",
  "L3 Pending",
  "L1 Rejected",
  "L3 Rejected",
  "Approved",
  "L2 Rejected",
];
