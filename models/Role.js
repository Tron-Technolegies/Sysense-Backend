import mongoose, { model, Schema } from "mongoose";

const ActionSchema = new Schema({
  name: {
    type: String,
    enum: ["create", "read", "update", "delete", "approve", "assign"],
    required: true,
  },
  scope: {
    type: String,
    enum: [
      "self",
      "children",
      "sameLevelChildren",
      "sameLevel",
      "organization",
    ],
    default: "self",
  },
});

const PermissionSchema = new Schema({
  module: {
    type: String,
    enum: ["timesheet", "pettycash", "leave"],
    required: true,
  },
  actions: [ActionSchema],
});

const RoleSchema = new Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
    },
    level: {
      type: Number,
      required: true,
    },
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    permissions: {
      type: [PermissionSchema],
    },
  },
  { timestamps: true }
);

const Role = model("Role", RoleSchema);
export default Role;
