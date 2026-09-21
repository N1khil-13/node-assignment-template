const mongoose = require("mongoose");

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set.");
  }
  return uri;
};

const connectToDatabase = async () => {
  await mongoose.connect(getMongoUri(), {
    serverSelectionTimeoutMS: 5000
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};

const disconnectFromDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  connectToDatabase,
  disconnectFromDatabase
};
