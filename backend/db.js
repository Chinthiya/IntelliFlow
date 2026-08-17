const mongoose = require("mongoose");

const MONGO_URI = "mongodb://127.0.0.1:27017/intelliflow";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;