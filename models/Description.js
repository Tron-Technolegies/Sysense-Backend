import { model, Schema } from "mongoose";

const DescriptionSchema = new Schema(
  {
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Description = model("Description", DescriptionSchema);
export default Description;
