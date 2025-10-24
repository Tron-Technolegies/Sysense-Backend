import { formatImage } from "../middlewares/multerMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import Leave from "../models/Leave.js";
import { NotFoundError } from "../errors/customErrors.js";

export const applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    let image = "";
    let imageId = "";
    if (req.file) {
      const file = formatImage(req.file);
      const response = await cloudinary.uploader.upload(file);
      image = response.secure_url;
      imageId = response.public_id;
    }
    const newStatus = {
      date: new Date(date),
      status: "L1 Pending",
      doneBy: req.user.userId,
    };
    const newLeave = new Leave({
      user: req.user.userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveType: leaveType,
      reason: reason,
      image: image,
      imagePublicId: imageId,
      status: "L1 Pending",
    });
    newLeave.statusHistory.push(newStatus);
    await newLeave.save();
    res.status(200).json({ msg: "Leave Applied successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const getUserAppliedLeave = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user.userId }).populate(
      "user",
      "employeeCode username"
    );
    if (leaves.length < 1) throw new NotFoundError("No leave data found");
    res.status(200).json({ leaves });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
