import { model, Schema } from "mongoose";

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
      type: String,
    },
    employeeCode: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema);
export default User;
