import mongoose, { model, Schema } from "mongoose";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    employeeCode: {
      type: String,
      unique: true,
    },
    verificationCode: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema);
export default User;
