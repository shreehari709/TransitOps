import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'transitops_secret_key_12345';

// Main authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Read token from cookies or authorization header
    const token = req.cookies.token || 
      (req.headers.authorization && 
       req.headers.authorization.startsWith('Bearer ') && 
       req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in.' 
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired token. Please log in again.' 
      });
    }
    
    // Check if user still exists and is approved
    const user = await User.findById(decoded.id).select('-passwordHash -registrationToken');
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found. Please log in again.' 
      });
    }
    
    // Check if user is approved (for non-SuperAdmin users)
    if (!user.isApproved && user.role !== 'SuperAdmin') {
      return res.status(401).json({ 
        error: 'Account pending approval. Please wait for admin approval.' 
      });
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      return res.status(401).json({ 
        error: 'Account locked. Please try again later.' 
      });
    }
    
    // Attach user info to request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isApproved: user.isApproved
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed. Please try again.' 
    });
  }
};

// Alias for backward compatibility
export const protect = authenticate;

// RBAC authorization check helper
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }
    
    // SuperAdmin has access to everything
    if (req.user.role === 'SuperAdmin') {
      return next();
    }
    
    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this action.` 
      });
    }
    
    next();
  };
};

// Check if user is SuperAdmin
export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required.' 
    });
  }
  
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ 
      error: 'SuperAdmin access required.' 
    });
  }
  
  next();
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Role-based access check
export const checkAccess = (userRole, requiredRole) => {
  if (userRole === 'SuperAdmin') return true;
  return userRole === requiredRole;
};

// Check if user has any of the allowed roles
export const hasAnyRole = (userRole, allowedRoles) => {
  if (userRole === 'SuperAdmin') return true;
  return allowedRoles.includes(userRole);
};

// Export JWT_SECRET for use in other files
export { JWT_SECRET };

// Common role checks for convenience
export const isFleetManager = (req, res, next) => {
  return authorize('FleetManager', 'SuperAdmin')(req, res, next);
};

export const isDispatcher = (req, res, next) => {
  return authorize('Dispatcher', 'SuperAdmin')(req, res, next);
};

export const isSafetyOfficer = (req, res, next) => {
  return authorize('SafetyOfficer', 'SuperAdmin')(req, res, next);
};

export const isFinancialAnalyst = (req, res, next) => {
  return authorize('FinancialAnalyst', 'SuperAdmin')(req, res, next);
};

// Default export for convenience
export default {
  authenticate,
  protect,
  authorize,
  isSuperAdmin,
  generateToken,
  verifyToken,
  checkAccess,
  hasAnyRole,
  isFleetManager,
  isDispatcher,
  isSafetyOfficer,
  isFinancialAnalyst,
  JWT_SECRET
};