import { model, Schema } from "mongoose";

const JVEntrySchema = new Schema(
  {
    JVEntry: {
      type: String,
    },
  },
  { timestamps: true }
);

const JVEntry = model("JVEntry", JVEntrySchema);
export default JVEntry;
