const supabase = require('../config/supabase');

// Supabase Token Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify token directly against Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    // Attach user payload to request
    // Extract role from user_metadata or app_metadata (defaults to 'member' if not specified)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || user.user_metadata?.role || 'member'
    };

    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// Role-Based Authorization Middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user authenticated.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };