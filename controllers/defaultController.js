import { NotFoundError } from "../errors/customErrors.js";
import Default from "../models/Default.js";
import User from "../models/User.js";

export const assignDefaultTimeSheetL1 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultTimeSheetL1: userId },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultTimeSheetL2 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultTimeSheetL2: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultPettyCashL1 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultPettyCashL1: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultPettyCashL2 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultPettyCashL2: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultLeaveL1 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultLeaveL1: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultLeaveL2 = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultLeaveL2: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const assignDefaultManager = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("No user found");
    await Default.findOneAndUpdate(
      {},
      { defaultManager: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const toggleLeaveMultipleL2 = async (req, res) => {
  try {
    const { isMultiple } = req.body;
    await Default.findOneAndUpdate(
      {},
      { leaveMultipleL2: isMultiple },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const toggleTimeSheetMultipleL2 = async (req, res) => {
  try {
    const { isMultiple } = req.body;
    await Default.findOneAndUpdate(
      {},
      { timeSheetMultipleL2: isMultiple },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const togglePettyCashMultipleL2 = async (req, res) => {
  try {
    const { isMultiple } = req.body;
    await Default.findOneAndUpdate(
      {},
      { pettyCashMultipleL2: isMultiple },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};

export const getDefaults = async (req, res) => {
  try {
    const defaultSettings = await Default.findOne().populate([
      "defaultTimeSheetL1",
      "defaultTimeSheetL2",
      "defaultPettyCashL1",
      "defaultPettyCashL2",
      "defaultLeaveL1",
      "defaultLeaveL2",
      "defaultManager",
    ]);
    if (!defaultSettings) throw new NotFoundError("No default settings found");
    res.status(200).json(defaultSettings);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || error.msg });
  }
};
