import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedExistingPasswords } from "../utils/bcrypt.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const result = await seedExistingPasswords();
    console.log(result);
  } catch (error) {
    console.error("Password seeding failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

run();

//
