import { NotFoundError } from "../errors/customErrors.js";
import Job from "../models/Job.js";

export const getAllJobs = async (req, res) => {
  try {
    const { jobName, jobType, jobLocation, customerName } = req.query;
    const queryObject = {
      isFinanceClosed: false,
    };
    if (jobName) {
      queryObject.jobName = { $regex: jobName, $options: "i" };
    }
    if (jobType) {
      queryObject.jobType = { $regex: jobType, $options: "i" };
    }
    if (jobLocation) {
      queryObject.jobLocation = { $regex: jobLocation, $options: "i" };
    }
    if (customerName) {
      queryObject.customerName = { $regex: customerName, $options: "i" };
    }
    const jobs = await Job.find(queryObject);
    if (jobs.length < 1) throw new NotFoundError("No Jobs");
    const totalJobs = await Job.countDocuments(queryObject);
    res.status(200).json({ totalJobs, jobs });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
