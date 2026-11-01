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

/* =========================
   EXPRESS APP SETUP
========================= */
const app = express();

// REQUIRED for Render reverse proxy (Fixes express-rate-limit error)
app.set('trust proxy', 1);

/* =========================
   MIDDLEWARE
========================= */
// Logging
app.use(morgan('dev'));

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://nausurology.org',
  'https://nausurology.org',
  'http://www.nausurology.org',
  'https://www.nausurology.org',
  'http://admin.nausurology.org',
  'https://admin.nausurology.org',
  'http://cms.nausurology.org',
  'https://cms.nausurology.org'
];

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development' && origin.includes('.ngrok')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // Allow all in production for now
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directories exist
const fs = require('fs');
const uploadDirs = ['uploads', 'uploads/photos', 'uploads/certificates'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Static files for uploads
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Static uploads path:', uploadsPath);

app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsPath, req.path);
  next();
}, express.static(uploadsPath));

/* =========================
   ROUTES
========================= */
// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'NAUS Backend API is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Import route files
const adminRoutes = require('./routes/admin');
const applicationsRoutes = require('./routes/applications');
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
let memberProfileRoutes;
try {
  memberProfileRoutes = require('./routes/memberProfile');
  console.log('✅ memberProfile routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading memberProfile routes:', err.message);
  console.error(err.stack);
}
const adminManagementRoutes = require('./routes/adminManagement');
const membersRoutes = require('./routes/members');

// Use routes
app.use('/api', adminRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/member', memberProfileRoutes);
app.use('/api/admin-management', adminManagementRoutes);
app.use('/api/members', membersRoutes);

/* =========================
   ERROR HANDLING
========================= */
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
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
  console.log('404 Error - Route not found:', req.method, req.url);
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    url: req.url
  });
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log('--------------------------------------------');
});

module.exports = app;