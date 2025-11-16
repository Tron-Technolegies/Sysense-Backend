import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import errorHandleMiddleware from "./middlewares/errorHandlerMiddleware.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";

import authRouter from "./routers/authRouter.js";
import jobRouter from "./routers/jobRouter.js";
import timesheetRouter from "./routers/timesheetRouter.js";
import descriptionRouter from "./routers/descriptionRouter.js";
import pettyCashRouter from "./routers/pettyCashRouter.js";
import JVEntryRouter from "./routers/JVEntryRouter.js";
import leaveRouter from "./routers/leaveRouter.js";
import userRouter from "./routers/userRouter.js";

import { authenticateUser } from "./middlewares/authenticationMiddleware.js";

const app = express();
const port = process.env.PORT || 3000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("short"));
}

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Optional: Pre-flight for all routes
app.options("/*path", cors());

app.get("/", (req, res) => {
  res.status(200).send("Welcome to Sysense Server");
});

app.get("/api/v1/dummy", (req, res) => {
  res.status(200).json({ data: "Dummy Data" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/jobs", jobRouter);
app.use("/api/v1/timesheet", authenticateUser, timesheetRouter);
app.use("/api/v1/description", descriptionRouter);
app.use("/api/v1/pettycash", authenticateUser, pettyCashRouter);
app.use("/api/v1/jv-entry", JVEntryRouter);
app.use("/api/v1/leave", authenticateUser, leaveRouter);
app.use("/api/v1/user", authenticateUser, userRouter);

app.use("/*path", (req, res) => {
  res.status(404).json({ msg: "Not Found in server" });
});

app.use(errorHandleMiddleware);

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Database successfully connected");
  app.listen(port, () => {
    console.log(`server started running on ${port}`);
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
