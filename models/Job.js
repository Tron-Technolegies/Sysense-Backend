import { model, Schema } from "mongoose";

const JobSchema = new Schema(
  {
    jobId: {
      type: Number,
      required: true,
    },
    jobNumber: {
      type: Number,
      required: true,
    },
    jobName: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
    },
    projectInCharge: {
      type: String,
    },
    projectInCharge_empCode: {
      type: String,
    },
    isClosed: {
      type: Boolean,
    },
    isFinanceClosed: {
      type: Boolean,
      required: true,
    },
    PO_Date: {
      type: Date,
      required: true,
    },
    customerName: {
      type: String,
    },
    adminInCharge: {
      type: String,
    },
    serviceInCharge: {
      type: String,
    },
    projectStartDate: {
      type: Date,
      required: true,
    },
    jobType: {
      type: String,
      required: true,
    },
    jobLocation: {
      type: String,
      required: true,
    },
    buisnessDivision: {
      type: String,
    },
    TimeOfLastOfflineSyncDone: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Job = model("Job", JobSchema);
export default Job;
