import mongoose, { model, Schema } from "mongoose";

const statusHistorySchema = new Schema({
  status: {
    type: String,
  },
  date: {
    type: Date,
  },
  doneBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const commentHistorySchema = new Schema({
  date: {
    type: Date,
  },
  comment: {
    type: String,
  },
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});
const TimeSheetSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    date: {
      type: Date,
      required: true,
    },
    timeWorked: {
      type: Number,
      required: true,
    },
    description: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Description",
    },
    status: {
      type: String,
    },
    statusHistory: {
      type: [statusHistorySchema],
    },
    relatedL1: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    relatedL2: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    currentComment: {
      type: String,
    },
    commentHistory: {
      type: [commentHistorySchema],
    },
  },
  { timestamps: true }
);

const TimeSheet = model("TimeSheet", TimeSheetSchema);
export default TimeSheet;
