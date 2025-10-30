import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("⚠️ Please add MONGODB_URI to .env.local");
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend Node's global type for caching
declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // reset if failed
    throw e;
  }

  global._mongoose = cached;

  return cached.conn;
}
