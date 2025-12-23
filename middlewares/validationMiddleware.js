import { body, validationResult } from "express-validator";
import { BadRequestError } from "../errors/customErrors.js";
import User from "../models/User.js";

const withValidationErrors = (validateValues) => {
  return [
    validateValues,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => error.msg);
        throw new BadRequestError(errorMessages);
      }
      next();
    },
  ];
};

//Auth validation

export const validateUserRegisterInput = withValidationErrors([
  body("username").notEmpty().withMessage("username is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email format")
    .custom(async (email) => {
      const user = await User.findOne({ email: email });
      if (user) throw new BadRequestError("email already exists");
    }),
  body("password").notEmpty().withMessage("Password is required"),
  body("code")
    .notEmpty()
    .withMessage("Code is required")
    .custom(async (code) => {
      const user = await User.findOne({
        employeeCode: { $regex: `^${code}$`, $options: "i" },
      });
      if (user) throw new BadRequestError("Employee Code Already Exists");
    }),
]);

export const validateLoginInput = withValidationErrors([
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
]);

export const validateForgotPasswordInput = withValidationErrors([
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
]);

export const validateVerifyOTP = withValidationErrors([
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("code").notEmpty().withMessage("Code is required"),
]);

export const validateResetPassword = withValidationErrors([
  body("email")
    .notEmpty()
    .withMessage("Cannot Process request. Account not found"),
  body("code").notEmpty().withMessage("Account Verification Problem"),
  body("password").notEmpty().withMessage("Password is required"),
]);

//Timesheet Validation

export const validateTimesheetSubmit = withValidationErrors([
  body("job")
    .notEmpty()
    .withMessage("Job is required")
    .isMongoId()
    .withMessage("Job must be in MongoDB Id format"),
  body("date").notEmpty().withMessage("Date is required"),
  body("time").notEmpty().withMessage("Time is required"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isMongoId()
    .withMessage("Description must be in MongoDB id format"),
]);

//Pettycash validation

export const validatePettycashSubmit = withValidationErrors([
  body("job")
    .notEmpty()
    .withMessage("Job is required")
    .isMongoId()
    .withMessage("Job must be in MongoDB Id format"),
  body("date").notEmpty().withMessage("Date is required"),
  body("amount").notEmpty().withMessage("Amount is required"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isMongoId()
    .withMessage("Description must be in MongoDB id format"),
  body("jvEntry")
    .notEmpty()
    .withMessage("JV Entry is required")
    .isMongoId()
    .withMessage("JV Entry must be in MongoDB id format"),
]);

//Leave Validations

export const validateLeaveApply = withValidationErrors([
  body("startDate").notEmpty().withMessage("Starting Date is required"),
  body("endDate").notEmpty().withMessage("End Date is required"),
  body("leaveType").notEmpty().withMessage("Leave Type is required"),
  body("reason").notEmpty().withMessage("Reason is required"),
]);

//user validations

export const validateUpdateProfile = withValidationErrors([
  body("username")
    .notEmpty()
    .withMessage("username is required")
    .custom(async (username, { req }) => {
      const user = await User.findOne({ username: username });
      if (user && user._id.toString() !== req.user.userId.toString())
        throw new BadRequestError("username already exists");
    }),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (email, { req }) => {
      const user = await User.findOne({ email: email.toLowercase() });
      if (user && user._id.toString() !== req.user.userId.toString())
        throw new BadRequestError("Email already exists");
    }),
]);

export const validateUpdatePassword = withValidationErrors([
  body("currentPassword")
    .notEmpty()
    .withMessage("Current Password is required"),
  body("newPassword").notEmpty().withMessage("New Password is required"),
]);

//Report
// isTimesheet, isPettyCash, isLeave, startDate, endDate;
export const validateGenerateReportByUser = withValidationErrors([
  body("isTimesheet").notEmpty().withMessage("Time sheet condition is missing"),
  body("isPettyCash").notEmpty().withMessage("Petty Cash condition is missing"),
  body("isLeave").notEmpty().withMessage("Leave condition is missing"),
  body("startDate").notEmpty().withMessage("Start Date is required"),
  body("endDate").notEmpty().withMessage("End Date is required"),
]);
