import mongoose, { model, Schema } from "mongoose";

const DefaultSchema = new Schema(
  {
    defaultTimeSheetL1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultTimeSheetL2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultTimeSheetL3: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    defaultPettyCashL1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultPettyCashL2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultPettyCashL3: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultLeaveL1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultLeaveL2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultLeaveL3: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    defaultManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    timeSheetMultipleL2: {
      type: Boolean,
      default: false,
    },
    pettyCashMultipleL2: {
      type: Boolean,
      default: false,
    },
    leaveMultipleL2: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Default = model("Default", DefaultSchema);
export default Default;
