import bcrypt from "bcryptjs";
import User from "../models/User.js";

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$.+/.test(value);

export const hashPassword = async (password) => {
  if (!password) throw new Error("Password is required");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

export const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) return false;

  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};

export const seedExistingPasswords = async () => {
  const users = await User.find({ password: { $exists: true } });

  let updatedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    if (!user.password || isBcryptHash(user.password)) {
      skippedCount += 1;
      continue;
    }

    user.password = await hashPassword(user.password);
    await user.save();
    updatedCount += 1;
  }

  return {
    message: "Password seeding completed",
    totalChecked: users.length,
    updatedCount,
    skippedCount,
  };
};
