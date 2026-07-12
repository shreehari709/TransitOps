import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path}`);
    next();
  });
}

// ============ ROUTES ============

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TransitOps API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes with error handling
let authRoutes, vehicleRoutes, driverRoutes, tripRoutes, maintenanceRoutes;
let fuelRoutes, expenseRoutes, analyticsRoutes, settingsRoutes, userRoutes;

try {
  authRoutes = (await import('./routes/auth.js')).default;
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.warn('⚠️ Auth routes not found:', error.message);
  authRoutes = express.Router();
}

try {
  vehicleRoutes = (await import('./routes/vehicles.js')).default;
  console.log('✅ Vehicle routes loaded');
} catch (error) {
  console.warn('⚠️ Vehicle routes not found:', error.message);
  vehicleRoutes = express.Router();
}

try {
  driverRoutes = (await import('./routes/drivers.js')).default;
  console.log('✅ Driver routes loaded');
} catch (error) {
  console.warn('⚠️ Driver routes not found:', error.message);
  driverRoutes = express.Router();
}

try {
  tripRoutes = (await import('./routes/trips.js')).default;
  console.log('✅ Trip routes loaded');
} catch (error) {
  console.warn('⚠️ Trip routes not found:', error.message);
  tripRoutes = express.Router();
}

try {
  maintenanceRoutes = (await import('./routes/maintenance.js')).default;
  console.log('✅ Maintenance routes loaded');
} catch (error) {
  console.warn('⚠️ Maintenance routes not found:', error.message);
  maintenanceRoutes = express.Router();
}

try {
  fuelRoutes = (await import('./routes/fuel.js')).default;
  console.log('✅ Fuel routes loaded');
} catch (error) {
  console.warn('⚠️ Fuel routes not found:', error.message);
  fuelRoutes = express.Router();
}

try {
  expenseRoutes = (await import('./routes/expenses.js')).default;
  console.log('✅ Expense routes loaded');
} catch (error) {
  console.warn('⚠️ Expense routes not found:', error.message);
  expenseRoutes = express.Router();
}

try {
  analyticsRoutes = (await import('./routes/analytics.js')).default;
  console.log('✅ Analytics routes loaded');
} catch (error) {
  console.warn('⚠️ Analytics routes not found:', error.message);
  analyticsRoutes = express.Router();
}

try {
  settingsRoutes = (await import('./routes/settings.js')).default;
  console.log('✅ Settings routes loaded');
} catch (error) {
  console.warn('⚠️ Settings routes not found:', error.message);
  settingsRoutes = express.Router();
}

try {
  userRoutes = (await import('./routes/users.js')).default;
  console.log('✅ User routes loaded');
} catch (error) {
  console.warn('⚠️ User routes not found:', error.message);
  userRoutes = express.Router();
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// ============ ERROR HANDLING MIDDLEWARE ============

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: 'Duplicate Entry',
      message: `${field} already exists`
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Please log in again'
    });
  }

  // Token expired error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Please log in again'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============ DATABASE CONNECTION ============

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/transitops', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ============ START SERVER ============

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await mongoose.connection.close();
          console.log('📊 Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing database:', error);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error('⚠️ Force shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
export default app;