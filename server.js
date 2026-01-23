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
const { sequelize } = require('./models');
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

    // Sync Sequelize Models
    await sequelize.sync({ alter: false });
    console.log('✅ Sequelize models synced');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

// Initialize database
initializeDatabase();

/* =========================
   EXPRESS APP SETUP
========================= */
const app = express();

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

// CORS Configuration (Fixed trailing spaces)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://nausurology.org',
  'https://nausurology.org',         // Fixed: removed trailing spaces
  'http://www.nausurology.org',
  'https://www.nausurology.org',     // Fixed: removed trailing spaces
  'http://admin.nausurology.org',
  'https://admin.nausurology.org',   // Fixed: removed trailing spaces
  'http://cms.nausurology.org',
  'https://cms.nausurology.org'      // Fixed: removed trailing spaces
];

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
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

// Static files for uploads - with explicit logging
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Static uploads path:', uploadsPath);

app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsPath, req.path);
  console.log('Static file request:', req.path, '-> Full path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  next();
}, express.static(uploadsPath));

/* =========================
   FILE UPLOAD CONFIGURATION
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG) and PDFs are allowed'));
  }
});

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

// DEBUG ENDPOINTS - Remove after testing
app.get('/api/_debug/routes', (req, res) => {
  const routes = [];
  const stack = app._router.stack;

  stack.forEach(layer => {
    if (layer.route) {
      const routeInfo = {
        path: layer.route.path,
        methods: Object.keys(layer.route.methods).filter(method => layer.route.methods[method])
      };
      routes.push(routeInfo);
    }
  });

  res.json({ 
    message: 'Available routes',
    routes: routes.filter(r => r.path.includes('member'))
  });
});

app.get('/api/_debug/test-delete', (req, res) => {
  res.json({ message: 'DELETE endpoint route exists and is accessible!' });
});

// Debug: List all registered routes
app.get('/api/_debug/all-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      const basePath = middleware.regexp.source
        .replace('\\/?(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\^/, '')
        .replace(/\?\(\?=.*\)/, '');

      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ totalRoutes: routes.length, routes });
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

// Use routes
app.use('/api', adminRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/member', memberProfileRoutes);
app.use('/api/admin-management', adminManagementRoutes);

// Members routes
const membersRoutes = require('./routes/members');
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
  console.log('404 Error - Route not found:', req.method, req.url); // Added logging
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

// Export for Vercel
module.exports = app;