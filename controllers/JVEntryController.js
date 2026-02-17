import { NotFoundError } from "../errors/customErrors.js";
import JVEntry from "../models/JVEntry.js";

export const getAllJVEntry = async (req, res) => {
  try {
    const { search } = req.query;
    const queryObject = {};
    if (search && search !== "") {
      queryObject.JVEntry = {
        $regex: search,
        $options: "i",
      };
    }
    const items = await JVEntry.find(queryObject);

    res.status(200).json({ items });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.msg || error.message });
  }
};
