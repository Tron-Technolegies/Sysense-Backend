import { UnauthenticatedError } from "../errors/customErrors.js";
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
