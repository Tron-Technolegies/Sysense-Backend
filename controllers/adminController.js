import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import Admin from "../models/Admin.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { createJWT } from "../utils/jwtUtils.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Admin.findOne({
      email: email.toLowerCase(),
    });
    if (!user) throw new NotFoundError("User not found");
    if (!user.isAdmin) throw new BadRequestError("Not an Admin account");
    //NEED TO CHANGE BACK . NOW FOR TESTING
    if (password !== user.password)
      throw new UnauthenticatedError("Invalid credentials");
    // const isPasswordCorrect = await comparePassword(password, user.password);
    // if (!isPasswordCorrect)
    //   throw new UnauthenticatedError("Invalid credentials");
    const token = createJWT({
      userId: user._id,
      //role to be added later
    });
    const tenDay = 1000 * 60 * 60 * 24 * 10;
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + tenDay),
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({ msg: "successfully Logged in", token });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { currentPage, search } = req.query;
    const queryObject = { isAdmin: { $ne: true } };
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      queryObject.$or = [
        { username: searchRegex },
        { employeeCode: searchRegex },
        { EmployeeId: searchRegex },
        { email: searchRegex },
      ];
    }
    const page = Number(currentPage) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const users = await User.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalUsers = await User.countDocuments(queryObject);
    const totalPages = Math.ceil(totalUsers / limit);
    res.status(200).json({ users, totalPages, totalUsers });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getUserDropdowns = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: { $ne: true } })
      .select("username employeeCode EmployeeId email")
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const { currentPage, search } = req.query;
    const queryObject = {};
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      queryObject.$or = [
        { jobName: searchRegex },
        { jobId: searchRegex },
        { jobNumber: searchRegex },
        { customerName: searchRegex },
      ];
    }
    const page = Number(currentPage) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const jobs = await Job.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalJobs = await Job.countDocuments(queryObject);
    const totalPages = Math.ceil(totalJobs / limit);
    res.status(200).json({ jobs, totalJobs, totalPages });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const addUser = async (req, res) => {
  try {
    const {
      employeeId,
      employeeCode,
      username,
      email,
      password,
      manager,
      lineManagerName,
      lineManagerCode,
      isActive,
    } = req.body;
    //need to hash password later
    const newUser = new User({
      EmployeeId: employeeId,
      employeeCode: employeeCode,
      username: username,
      email: email.toLowerCase(),
      password: password,
      manager: manager,
      LineManagerName: lineManagerName,
      LineManager_EmployeeCode: lineManagerCode,
      isActive: isActive,
    });
    await newUser.save();
    res.status(201).json({ message: "created successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const editUser = async (req, res) => {
  try {
    const {
      employeeId,
      employeeCode,
      username,
      email,
      userId,
      manager,
      lineManagerName,
      lineManagerCode,
      isActive,
    } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user has been found");
    const alreadyExistEmail = await User.findOne({ email: email });
    if (
      alreadyExistEmail &&
      alreadyExistEmail._id.toString() !== user._id.toString()
    )
      throw new NotFoundError("Email already exist");
    const alreadyExistCode = await User.findOne({ employeeCode: employeeCode });
    if (
      alreadyExistCode &&
      alreadyExistCode._id.toString() !== user._id.toString()
    )
      throw new NotFoundError("Employee code already exist");
    const alreadyExistId = await User.findOne({ EmployeeId: employeeId });
    if (alreadyExistId && alreadyExistId._id.toString() !== user._id.toString())
      throw new NotFoundError("Employee Id already exists");
    user.EmployeeId = employeeId;
    user.employeeCode = employeeCode;
    user.username = username;
    user.email = email.toLowerCase();
    user.manager = manager;
    user.LineManagerName = lineManagerName;
    user.LineManager_EmployeeCode = lineManagerCode;
    user.isActive = isActive;
    await user.save();
    res.status(200).json({ message: "successfully added" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const addJob = async (req, res) => {
  try {
    const {
      jobId,
      jobName,
      jobNumber,
      jobType,
      jobLocation,
      PO_date,
      customerName,
      projectInCharge,
      projectInChargeCode,
      isClosed,
      isFinanceClosed,
      projectStart,
    } = req.body;
    const newJob = new Job({
      jobId,
      jobName,
      jobNumber,
      jobType,
      jobLocation,
      PO_Date: new Date(PO_date),
      customerName,
      projectInCharge,
      projectInCharge_empCode: projectInChargeCode,
      isClosed,
      isFinanceClosed,
      projectStartDate: new Date(projectStart),
    });
    await newJob.save();
    res.status(200).json({ message: "created successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

export const editJob = async (req, res) => {
  try {
    const {
      jobId,
      jobName,
      jobNumber,
      jobType,
      jobLocation,
      PO_date,
      customerName,
      projectInCharge,
      projectInChargeCode,
      isClosed,
      isFinanceClosed,
      projectStart,
      id,
    } = req.body;
    const job = await Job.findById(id);
    if (!job) throw new NotFoundError("No job found");
    const existingJobId = await Job.findOne({ jobId: jobId });
    if (existingJobId && existingJobId._id.toString() !== job._id.toString())
      throw new BadRequestError("Job Id already exists");
    const jobNumberExist = await Job.findOne({ jobNumber: jobNumber });
    if (jobNumberExist && jobNumberExist._id.toString() !== job._id.toString())
      throw new BadRequestError("Job Number already exists");
    job.jobId = jobId;
    job.jobName = jobName;
    job.jobNumber = jobNumber;
    job.jobType = jobType;
    job.jobLocation = jobLocation;
    job.PO_Date = new Date(PO_date);
    job.customerName = customerName;
    job.projectInCharge = projectInCharge;
    job.projectInCharge_empCode = projectInChargeCode;
    job.isClosed = isClosed;
    job.isFinanceClosed = isFinanceClosed;
    job.projectStartDate = new Date(projectStart);
    await job.save();
    res.status(200).json({ message: "Job updated successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
