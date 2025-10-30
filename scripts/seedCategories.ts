import mongoose from "mongoose";
import Category from "../models/Category";
import { connectDB } from "../lib/mongodb";

const categories = [
  { name: "Music & Entertainment", eventsCount: 30, icon: "Music", iconColor: "#099409" },
  { name: "Arts & Culture", eventsCount: 130, icon: "Palette", iconColor: "#946809" },
  { name: "Conferences & Networking", eventsCount: 210, icon: "Users", iconColor: "#093c94" },
  { name: "Food & Drink", eventsCount: 67, icon: "Utensils", iconColor: "#366b33" },
  { name: "Sports & Fitness", eventsCount: 400, icon: "Dumbbell", iconColor: "#6a701a" },
  { name: "Community & Lifestyle", eventsCount: 20, icon: "Group", iconColor: "#6e4f1e" },
  { name: "Health & Wellness", eventsCount: 23, icon: "Heart", iconColor: "#821515" },
  { name: "Special Occasions", eventsCount: 110, icon: "Gift", iconColor: "#6e1582" },
  { name: "Technology & Education", eventsCount: 89, icon: "Cpu", iconColor: "#153282" },
  { name: "Niche / Emerging", eventsCount: 10, icon: "Sparkles", iconColor: "#158275" },
];

async function seed() {
  await connectDB();
  await Category.deleteMany({});
  await Category.insertMany(categories);
  console.log("✅ Categories seeded");
  mongoose.connection.close();
}

seed().catch((err) => {
  console.error(err);
  mongoose.connection.close();
});
