import mongoose from "mongoose";

mongoose.set('bufferTimeoutMS', 35000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectOnce = async () => {
  const connection = await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    retryWrites: true,
    w: "majority",
    authSource: "admin",
    maxPoolSize: 10,
    minPoolSize: 1,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  console.log("✅ MongoDB connected!");
  console.log("📊 Database:", connection.connection.db.name);
  return connection;
};

const connectDB = async (retries = 3, delayMs = 1500) => {
  console.log("🔄 Connecting to MongoDB...");
  console.log("📍 URI:", process.env.MONGO_URI.substring(0, 50) + "...");
  console.log("📦 MongoDB URI exists:", !!process.env.MONGO_URI);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔁 Connection attempt ${attempt}/${retries}...`);
      return await connectOnce();
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) {
        console.error("📋 Full error:", error);
        throw error;
      }
      await sleep(delayMs);
    }
  }
};

export default connectDB;
