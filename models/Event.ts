import mongoose, { Schema, model, models } from "mongoose";

const TicketSchema = new Schema({
  type: { type: String, required: true },
  price: { type: String, required: true },
  link: { type: String, required: true },
});

const EventSchema = new Schema(
  {
    image: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true }, // or Date type if you want proper dates
    time: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    mapUrl: { type: String, required: true },
    host: { type: String, required: true },
    attendees: { type: Number, default: 0 },
    tickets: [TicketSchema],
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
  },
  { timestamps: true }
);

export default models.Event || model("Event", EventSchema);
