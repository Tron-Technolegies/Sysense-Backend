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
import {
  restrictL0,
  restrictL1,
  restrictL2,
} from "../utils/utilityFunctions.js";

//submit pettycash as L0

export const submitPettyCash = async (req, res) => {
  try {
    const { job, date, amount, description, jvEntry, comment } = req.body;
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
      currentComment: comment || "",
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
    if (comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: req.user.userId,
      };
      newPettyCashData.commentHistory.push(newComment);
    }
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
      .populate("JVEntry", "JVEntry")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username");
    if (pettycash.length < 1) throw new NotFoundError("No Pettycash found");
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

//Send Back to L0
export const sendBackToL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { job, date, amount, description, jvEntry, comment } = req.body;
    const pettyCash = await PettyCash.findById(req.params.id);
    if (!pettyCash) throw new NotFoundError("No Petty Cash found");
    const isAuthorized = pettyCash.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (restrictL1.includes(pettyCash.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    if (Number(amount) !== pettyCash.amount) {
      pettyCash.amountHistory.push({
        amount: Number(amount),
        prevAmount: pettyCash.amount,
        changedBy: userId,
        changedOn: new Date(),
      });
    }
    pettyCash.status = "L0 Pending";
    pettyCash.currentComment = comment;
    pettyCash.job = job;
    pettyCash.date = new Date(date);
    pettyCash.amount = Number(amount);
    pettyCash.description = description;
    pettyCash.JVEntry = jvEntry;
    pettyCash.statusHistory.push({
      status: "L0 Pending",
      date: new Date(),
      doneBy: userId,
    });
    if (comment) {
      pettyCash.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await pettyCash.save();
    res.status(200).json({ msg: "Data  has been sent back" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Resubmit Data by L0
export const reSubmitDataByL0 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pettyCash = await PettyCash.findById(req.params.id);
    if (!pettyCash) throw new NotFoundError("No Petty Cash found");
    if (pettyCash.user.toString() !== userId.toString())
      throw new BadRequestError("Not authorised");
    if (restrictL0.includes(pettyCash.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const { job, date, amount, description, jvEntry, comment } = req.body;
    if (Number(amount) !== pettyCash.amount) {
      const newAmount = {
        amount: Number(amount),
        prevAmount: pettyCash.amount,
        changedBy: userId,
        changedOn: new Date(),
      };
      pettyCash.amountHistory.push(newAmount);
    }
    pettyCash.status = "L1 Pending";
    pettyCash.date = new Date(date);
    pettyCash.amount = Number(amount);
    pettyCash.description = description;
    pettyCash.job = job;
    pettyCash.JVEntry = jvEntry;
    pettyCash.currentComment = comment || "";
    const newStatus = {
      status: "L1 Pending",
      date: new Date(),
      doneBy: userId,
    };
    pettyCash.statusHistory.push(newStatus);
    if (comment) {
      const newComment = {
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      };
      pettyCash.commentHistory.push(newComment);
    }
    await pettyCash.save();
    res.status(200).json({ msg: "Petty Cash resubmitted successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Modify by L1

export const modifyDataByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { job, date, amount, description, jvEntry, comment } = req.body;
    const pettyCash = await PettyCash.findById(req.params.id);
    if (!pettyCash) throw new NotFoundError("No Petty cash data found");
    if (restrictL1.includes(pettyCash.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const isAuthorized = pettyCash.relatedL1.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (Number(amount) !== pettyCash.amount) {
      pettyCash.amountHistory.push({
        amount: Number(amount),
        prevAmount: pettyCash.amount,
        changedBy: userId,
        changedOn: new Date(),
      });
    }
    pettyCash.job = job;
    pettyCash.date = new Date(date);
    pettyCash.amount = Number(amount);
    pettyCash.description = description;
    pettyCash.JVEntry = jvEntry;
    pettyCash.currentComment = comment;
    if (comment) {
      pettyCash.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
    }
    await pettyCash.save();
    res.status(200).json({ msg: "successfully modified" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Approve Data by L1

export const approveDataByL1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pettyCash = await PettyCash.findById(req.params.id);
    if (!pettyCash) throw new NotFoundError("No petty cash data found");
    if (restrictL1.includes(pettyCash.status)) {
      throw new BadRequestError("This Operation is not Allowed at the moment");
    }
    const isAuthorized = pettyCash.relatedL1.some(
      (item) => item.toString() === userId.toString()
    );
    if (!isAuthorized)
      throw new BadRequestError("Not Authorised to do this Operation");

    //Adding L2 s
    const L2 = await getRandomEmployeeCode(
      pettyCash.user,
      pettyCash.relatedL1,
      3
    );
    if (!L2 || L2.length < 1) throw new BadRequestError("No available L2");
    const L2UserIds = await Promise.all(
      L2.map(async (item) => {
        const u = await User.findOne({
          employeeCode: item.employeeCode,
        })
          .select("_id")
          .lean();
        return u._id;
      })
    );
    const validL2Ids = L2UserIds.filter((id) => id); //Removing Null Values if any
    if (validL2Ids.length < 1)
      throw new BadRequestError("No valid L2 users found");
    pettyCash.mainL2 = validL2Ids[0];
    if (validL2Ids.length > 1) {
      pettyCash.relatedL2.push(...validL2Ids.slice(1));
    }

    pettyCash.status = "L2 Pending";
    pettyCash.statusHistory.push({
      date: new Date(),
      status: "L2 Pending",
      doneBy: userId,
    });
    await pettyCash.save();
    res.status(200).json({ msg: "Data Approved", data: pettyCash });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Get Data for L2

export const getDataForL2 = async (req, res) => {
  try {
    const id = req.user.userId;
    const formattedId = new mongoose.Types.ObjectId(id);
    const queryObject = {
      $or: [{ relatedL2: formattedId }, { mainL2: formattedId }],
    };
    const { status } = req.query;
    if (status) {
      queryObject.status = { $regex: status, $options: "i" };
    }

    const pettyCash = await PettyCash.find(queryObject)
      .populate("job", "jobId jobName")
      .populate("user", "employeeCode username")
      .populate("description", "description")
      .populate("relatedL1", "username")
      .populate("relatedL2", "username")
      .populate("mainL2", "username");
    if (pettyCash.length < 1)
      throw new NotFoundError("No Petty cash data found");
    res.status(200).json({ pettyCash });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};

//Modify Data
export const modifyDataL2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { job, date, amount, description, jvEntry, comment } = req.body;
    const pettyCash = await PettyCash.findById(req.params.id);
    if (!pettyCash) throw new NotFoundError("No Petty cash data found");
    if (restrictL2.includes(pettyCash.status))
      throw new BadRequestError("This operation is not allowed at the moment");
    const isAuthorized =
      pettyCash.relatedL2.some((id) => id.toString() === userId.toString()) ||
      pettyCash.mainL2?.toString() === userId.toString();
    if (!isAuthorized)
      throw new BadRequestError("Not authorised to do this operation");
    if (Number(amount) !== pettyCash.amount) {
      pettyCash.amountHistory.push({
        amount: Number(amount),
        prevAmount: pettyCash.amount,
        changedBy: userId,
        changedOn: new Date(),
      });
    }
    pettyCash.job = job;
    pettyCash.date = new Date(date);
    pettyCash.amount = Number(amount);
    pettyCash.description = description;
    pettyCash.JVEntry = jvEntry;
    if (comment && pettyCash.currentComment !== comment) {
      pettyCash.commentHistory.push({
        date: new Date(),
        comment: comment,
        commentedBy: userId,
      });
      pettyCash.currentComment = comment;
    }

    await pettyCash.save();
    res.status(200).json({ msg: "successfully modified" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
