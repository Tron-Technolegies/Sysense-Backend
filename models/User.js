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
      unique: true,
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
    EmployeeId: {
      type: String,
    },
    verificationCode: {
      type: String,
    },
    LineManagerName: {
      type: String,
    },
    LineManager_EmployeeCode: {
      type: String,
    },
    isActive: {
      type: Boolean,
    },
    TimeOfLastOfflineSyncDone: { type: Date },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const User = model("User", UserSchema);
export default User;
