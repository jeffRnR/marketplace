import mongoose, { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    eventsCount: { type: Number, default: 0 },
    icon: { type: String, required: true }, // store Lucide icon name as string
    iconColor: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Category || model("Category", CategorySchema);
