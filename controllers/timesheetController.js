import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import TimeSheet from "../models/TimeSheet.js";

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
    const newTimeSheet = new TimeSheet({
      user: req.user.userId,
      job: job,
      date: new Date(date),
      timeWorked: Number(time),
      description: description,
      status: "L1 Pending",
    });
    await newTimeSheet.save();
    res.status(200).json({ msg: "successfully added new Time sheet data" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const getUserSubmittedTimeSheet = async (req, res) => {
  try {
    const timesheets = await TimeSheet.find({ user: req.user.userId });
    if (timesheets.length < 1) throw new NotFoundError("No timesheets found");
    res.status(200).json({ timesheets });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
