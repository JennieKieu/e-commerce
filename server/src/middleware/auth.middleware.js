const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');
const { error } = require('../utils/apiResponse');

/**
 * Verify JWT access token from Authorization header.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return error(res, 'User not found', 401);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Token expired', 401);
    return error(res, 'Invalid token', 401);
  }
}

/**
 * Require verified email.
 */
function requireVerified(req, res, next) {
  if (!req.user.is_verified) {
    return error(res, 'Email not verified. Please verify your email first.', 403);
  }
  next();
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return error(res, 'Access denied. Admin only.', 403);
  }
  next();
}

module.exports = { authenticate, requireVerified, requireAdmin };
