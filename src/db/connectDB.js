import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 URI:", process.env.MONGO_URI.substring(0, 50) + "...");
    console.log("🔍 DNS Servers:", dns.getServers());
    console.log("📦 MongoDB URI exists:", !!process.env.MONGO_URI);

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      retryWrites: true,
      w: "majority",
      authSource: "admin",
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
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
