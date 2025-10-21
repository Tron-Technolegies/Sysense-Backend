import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import errorHandleMiddleware from "./middlewares/errorHandlerMiddleware.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRouter from "./routers/authRouter.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("short"));
}

app.get("/", (req, res) => {
  res.status(200).send("Welcome to Sysense Server");
});

app.use("/api/v1/auth", authRouter);

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
