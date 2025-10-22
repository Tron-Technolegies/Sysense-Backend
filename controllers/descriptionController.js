import { NotFoundError } from "../errors/customErrors.js";
import Description from "../models/Description.js";

export const getAllDescriptions = async (req, res) => {
  try {
    const descriptions = await Description.find();
    if (descriptions.length < 1)
      throw new NotFoundError("No descriptions has been found");
    res.status(200).json({ descriptions });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
