import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from "../errors/customErrors.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { createJWT } from "../utils/jwtUtils.js";
import { sendMail, transporter } from "../utils/nodeMailer.js";

export const registerUser = async (req, res) => {
  try {
    const hashedPassword = await hashPassword(req.body.password);
    const newUser = new User({
      username: req.body.username,
      email: req.body.email.toLowerCase(),
      password: hashedPassword,
      //need to add the role later
      employeeCode: req.body.code,
    });
    await newUser.save();
    res.status(201).json({ msg: "Registered successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NotFoundError("User not found");
    //NEED TO CHANGE BACK . NOW FOR TESTING
    if (password !== user.password)
      throw new UnauthenticatedError("Invalid credentials");
    // const isPasswordCorrect = await comparePassword(password, user.password);
    // if (!isPasswordCorrect)
    //   throw new UnauthenticatedError("Invalid credentials");
    const token = createJWT({
      userId: user._id,
      //role to be added later
    });
    const tenDay = 1000 * 60 * 60 * 24 * 10;
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + tenDay),
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({ msg: "successfully Logged in", token });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NotFoundError("No user found");
    const code = Math.floor(1000 + Math.random() * 9000);
    user.verificationCode = code.toString();
    const mailOptions = {
      from: {
        name: "Sysense",
        address: process.env.NODEMAILER_EMAIL,
      },
      to: user.email,
      subject: "Forgot Password",
      text: `We recieved a request for password reset. Please enter the verification code given. Your verification code is ${code}`,
    };
    await sendMail(transporter, mailOptions);
    await user.save();
    res.status(200).json({ msg: "Verification code sent" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NotFoundError("Invalid user");
    if (user.verificationCode === code.toString()) {
      res.status(200).json({ msg: "Verified successfully" });
    } else {
      throw new BadRequestError("Invalid OTP");
    }
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NotFoundError("No user found");
    if (user.verificationCode !== code.toString())
      throw new BadRequestError(
        "Something went wrong with account verification"
      );
    const newPassword = await hashPassword(password);
    user.password = newPassword;
    await user.save();
    res.status(200).json({ msg: "successfully updated" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};

export const Logout = async (req, res) => {
  try {
    const token = jwt.sign({ userId: "logout" }, process.env.JWT_SECRET, {
      expiresIn: "1s",
    });
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now()),
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({ msg: "successfully logged out" });
  } catch (error) {
    res.status(500).json({ msg: error.msg || error.message });
  }
};
