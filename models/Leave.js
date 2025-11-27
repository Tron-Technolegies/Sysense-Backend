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

const l2StatusSchema = new Schema({
  status: String,
  stages: Number,
  completed: Number,
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const LeaveSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    leaveType: {
      type: String,
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
    },
    image: {
      type: String,
    },
    imagePublicId: {
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
    mainL2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    l1Resubmit: {
      type: Boolean,
    },
    currentComment: {
      type: String,
    },
    commentHistory: {
      type: [commentHistorySchema],
    },
    l2Status: {
      type: l2StatusSchema,
    },
  },
  {
    timestamps: true,
  }
);

const Leave = model("Leave", LeaveSchema);
export default Leave;
