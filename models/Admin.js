import { model, Schema } from "mongoose";

const AdminSchema = new Schema(
  {
    username: String,
    email: String,
    password: String,
    isAdmin: Boolean,
  },
  { timestamps: true }
);

const Admin = model("Admin", AdminSchema);
export default Admin;
