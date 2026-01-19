/* =========================
   DEPENDENCIES
========================= */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const morgan = require('morgan');

// Database and Models
const { sequelize } = require('./models'); // Assuming models/index.js exports sequelize
const { connectDB } = require('./config/database');
const createTables = require('./config/createTables');

/* =========================
   DATABASE INITIALIZATION
========================= */
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Create tables if they don't exist
    await createTables();
    
    // Sync Sequelize Models (Syncs the 'admins', 'applications', and 'members' tables)
    await sequelize.sync({ alter: false }); 
    console.log('✅ Sequelize models synchronized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();

/* =========================
   EXPRESS APP
========================= */
const app = express();

/* ✅ FIX FOR express-rate-limit
   REQUIRED when X-Forwarded-For exists (e.g., behind a proxy) */
app.set('trust proxy', 1);

/* =========================
   SECURITY & LOGGING
========================= */
// Updated Helmet config to allow Cross-Origin resource sharing for uploaded files
app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

app.use(morgan('dev')); // Logging requests to console

/* =========================
   CORS CONFIG
========================= */
// Build allowed origins list
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500', // Live Server
  'http://localhost:5500',
];

// Add custom origins from environment variable (for ngrok, production, etc.)
if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // In development, allow all ngrok URLs
    if (process.env.NODE_ENV === 'development' && origin.includes('.ngrok')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));

/* =========================
   BODY PARSERS
========================= */
// Standard JSON parser
app.use(express.json({ limit: '10mb' }));
// URL-encoded parser for form submissions
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   RATE LIMITING (GLOBAL)
========================= */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for development/admin dashboard usage
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use('/api/', limiter);

/* =========================
   STATIC FILES
========================= */
// Serves documents from the 'uploads' folder (MBBS/Fellowship certificates)
// Enhanced configuration to properly serve PDFs and images
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/' + path.extname(filePath).slice(1));
    } else if (filePath.endsWith('.doc')) {
      res.setHeader('Content-Type', 'application/msword');
    } else if (filePath.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
  }
}));

/* =========================
   ROUTES
========================= */
// Load the route files
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/applications');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const adminManagementRoutes = require('./routes/adminManagement');
const memberProfileRoutes = require('./routes/memberProfile');
const contactRoutes = require('./routes/contact');

// Mount the routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', appRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-management', adminManagementRoutes);
app.use('/api/member', memberProfileRoutes);
app.use('/api/contact', contactRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get('/', (req, res) => {
  res.json({
    message: 'NAUS API is running!',
    status: 'success',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      applications: '/api/applications',
      members: '/api/members',
      admin: '/api/admin',
    },
  });
});

/* =========================
   ERROR HANDLER (CRITICAL)
========================= */
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  // Multer errors (File uploads)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }

  // Sequelize / Database errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Validation error', errors: err.errors });
  }

  // Generic internal server errors
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

// Only listen when running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}`);
    console.log('--------------------------------------------');
  });
}

// Export for Vercel
module.exports = app;