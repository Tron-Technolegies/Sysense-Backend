import { formatImage } from "../middlewares/multerMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import PettyCash from "../models/PettyCash.js";
import { NotFoundError } from "../errors/customErrors.js";

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
    newPettyCashData.statusHistory.push(newStatus);
    await newPettyCashData.save();
    res.status(200).json({ msg: "successfully added petty cash data" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

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
    res.status(500).json({ msg: error.msg || error.message });
  }
};
