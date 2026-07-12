const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectDB() {
  try {
    // Enable debug mode for mongoose if needed
    // mongoose.set('debug', true);
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected in-memory at ${mongoUri}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

module.exports = { connectDB, closeDB };
