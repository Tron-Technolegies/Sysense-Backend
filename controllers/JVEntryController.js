import { NotFoundError } from "../errors/customErrors.js";
import JVEntry from "../models/JVEntry.js";

export const getAllJVEntry = async (req, res) => {
  try {
    const items = await JVEntry.find();
    if (items.length < 1) throw new NotFoundError("No JV Entries found");
    res.status(200).json({ items });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
