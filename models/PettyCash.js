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

const amountHistorySchema = new Schema({
  amount: Number,
  prevAmount: Number,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  changedOn: {
    type: Date,
  },
});

const PettyCashSchema = new Schema(
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
    },
    amount: {
      type: Number,
    },
    amountHistory: {
      type: [amountHistorySchema],
    },
    description: {
      type: String,
    },
    JVEntry: {
      type: String,
    },
    image: {
      type: String,
    },
    imagePublicId: {
      type: String,
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
    mainL2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    currentComment: {
      type: String,
    },
    commentHistory: {
      type: [commentHistorySchema],
    },
    l1Resubmit: {
      type: Boolean,
    },
    l2Status: {
      type: l2StatusSchema,
    },
  },
  {
    timestamps: true,
  }
);

const PettyCash = model("PettyCash", PettyCashSchema);
export default PettyCash;
