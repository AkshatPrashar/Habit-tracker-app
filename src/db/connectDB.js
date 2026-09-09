import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 URI:", process.env.MONGO_URI.substring(0, 50) + "...");

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      retryWrites: true,
      w: "majority",
      authSource: "admin",
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected!");
    console.log("📊 Database:", connection.connection.db.name);
    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;
