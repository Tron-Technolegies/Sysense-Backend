import { model, Schema } from "mongoose";

const RoleSchema = new Schema(
  {
    roleName: {
      type: String,
    },
    permissions: {
      type: [String],
    },
  },
  { timestamps: true }
);

const Role = model("Role", RoleSchema);
export default Role;
