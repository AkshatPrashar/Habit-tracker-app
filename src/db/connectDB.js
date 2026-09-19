import mongoose from "mongoose";

mongoose.set('bufferTimeoutMS', 30000);

const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 URI:", process.env.MONGO_URI.substring(0, 50) + "...");
    console.log("📦 MongoDB URI exists:", !!process.env.MONGO_URI);

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      retryWrites: true,
      w: "majority",
      authSource: "admin",
      maxPoolSize: 10,
      minPoolSize: 1,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 25000,
      connectTimeoutMS: 25000,
    });

    console.log("✅ MongoDB connected!");
    console.log("📊 Database:", connection.connection.db.name);
    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("📋 Full error:", error);
    throw error;
  }
};

export default connectDB;
