import {
  BadRequestError,
  UnauthenticatedError,
  UnauthorizedError,
} from "../errors/customErrors.js";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import { verifyJWT } from "../utils/jwtUtils.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies.token; //for flutter
    if (!token) throw new UnauthenticatedError("unable to access");
    const { userId } = verifyJWT(token); // need to add role later
    req.user = { userId };
    next();
  } catch (error) {
    console.log(error);
    throw new UnauthenticatedError("invalid authorization");
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    const user = await Admin.findById(req.user.userId);
    if (!user) throw new BadRequestError("No user found");
    if (!user.isAdmin) throw new UnauthorizedError("Not an Admin");
    next();
  } catch (error) {
    console.log(error);
    throw Error;
  }
};
