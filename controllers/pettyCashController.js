import { formatImage } from "../middlewares/multerMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import PettyCash from "../models/PettyCash.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/customErrors.js";
import { getRandomEmployeeCode } from "../utils/finder.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { restrictL1 } from "../utils/utilityFunctions.js";

//submit pettycash as L0

export const submitPettyCash = async (req, res) => {
  try {
    const { job, date, amount, description, jvEntry } = req.body;
    let imageUrl = "";
    let imageId = "";
    if (req.file) {
      const file = formatImage(req.file);
      const response = await cloudinary.uploader.upload(file);
      imageUrl = response.secure_url;
      imageId = response.public_id;
    }
    const newStatus = {
      date: new Date(date),
      status: "L1 Pending",
      doneBy: req.user.userId,
    };
    const newPettyCashData = new PettyCash({
      user: req.user.userId,
      job: job,
      date: new Date(date),
      amount: Number(amount),
      description: description,
      JVEntry: jvEntry,
      image: imageUrl,
      imagePublicId: imageId,
      status: "L1 Pending",
    });
    const L1 = await getRandomEmployeeCode(req.user.userId);
    const L1user = await User.findOne({ employeeCode: L1[0].employeeCode })
      .select("_id")
      .lean();
    const L1Id = L1user._id;
    newPettyCashData.relatedL1.push(L1Id);
    newPettyCashData.statusHistory.push(newStatus);
    await newPettyCashData.save();
    res.status(200).json({ msg: "successfully added petty cash data" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//get user submitted data

export const getUserSubmittedPettyCashData = async (req, res) => {
  try {
    const data = await PettyCash.find({ user: req.user.userId })
      .populate("job", "jobId jobName")
      .populate("user", "username employeeCode")
      .populate("description", "description")
      .populate("JVEntry", "JVEntry");
    if (data.length < 1) throw new NotFoundError("No data found");
    res.status(200).json({ data });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

// Get Data for L1
export const getDataForL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(userId);
    const queryObject = { relatedL1: formattedId };
    const { status } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }
    const pettycash = await PettyCash.find(queryObject)
      .populate("job", "jobName jobId")
      .populate("user", "username employeeCode")
      .populate("description", "description")
      .populate("JVEntry", "JVEntry");
    if (pettycash.length < 1) throw new NotFoundError("No Timesheet found");
    res.status(200).json({ pettycash });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//reject data by L1
export const rejectDataL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pettycash = await PettyCash.findById(req.params.id);
    if (!pettycash) throw new NotFoundError("No pettycash data found");
    const isAuthorised = pettycash.relatedL1.some(
      (item) => item.toString() === userId.toString()
    );
    if (!isAuthorised)
      throw new UnauthorizedError("Not Authorised to do this operation");
    if (restrictL1.includes(pettycash.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    pettycash.status = "L1 Rejected";
    const newStatus = {
      status: "L1 Rejected",
      date: new Date(),
      doneBy: userId,
    };
    pettycash.statusHistory.push(newStatus);
    await pettycash.save();
    res.status(200).json({ msg: "Rejected", pettycash });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
