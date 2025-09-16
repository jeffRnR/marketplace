import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String },
}, { timestamps: true });

const User = models.User || model("User", UserSchema);

export default User;
