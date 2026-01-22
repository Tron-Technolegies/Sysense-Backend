import { model, Schema } from "mongoose";

const AdminSchema = new Schema(
  {
    username: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    isSuperAdmin: Boolean,
  },
  { timestamps: true },
);

const Admin = model("Admin", AdminSchema);
export default Admin;
