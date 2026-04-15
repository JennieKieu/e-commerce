const { User, Cart } = require('../models');
const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

// POST /api/v1/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (existing.is_verified) {
        return error(res, 'Email already registered', 409);
      }
      // Resend OTP for unverified existing user
      const result = await otpService.createAndSendOtp(existing, 'register');
      if (result.cooldownSeconds) {
        return error(res, `Please wait ${result.cooldownSeconds}s before resending`, 429);
      }
      return success(res, null, 'OTP resent to your email. Please verify.', 200);
    }

    const hashedPassword = await authService.hashPassword(password);
    const user = await User.create({ name: name.trim(), email, password: hashedPassword });

    // Create empty cart for user
    await Cart.create({ user_id: user.id });

    const result = await otpService.createAndSendOtp(user, 'register');
    if (result.cooldownSeconds) {
      return error(res, `Please wait ${result.cooldownSeconds}s before resending`, 429);
    }

    return success(res, { userId: user.id }, 'Registration successful. Please check your email for the OTP.', 201);
  } catch (err) {
    if (err.message === 'EMAIL_SEND_FAILED') {
      return error(res, 'Could not send verification email. Please try again later.', 503);
    }
    if (err.message === 'OTP_DAILY_LIMIT_EXCEEDED') {
      return error(res, 'Daily OTP limit exceeded. Try again tomorrow.', 429);
    }
    next(err);
  }
}

// POST /api/v1/auth/verify-otp
async function verifyOtp(req, res, next) {
  try {
    const { userId, otp } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return error(res, 'User not found', 404);
    if (user.is_verified) return error(res, 'Email already verified', 400);

    const valid = await otpService.verifyOtp(userId, otp, 'register');
    if (!valid) return error(res, 'Invalid or expired OTP', 400);

    await user.update({ is_verified: true });

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = await authService.generateRefreshToken(user.id);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return success(
      res,
      {
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      'Email verified successfully'
    );
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/resend-otp
async function resendOtp(req, res, next) {
  try {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return error(res, 'User not found', 404);
    if (user.is_verified) return error(res, 'Email already verified', 400);

    const result = await otpService.createAndSendOtp(user, 'register');
    if (result.cooldownSeconds) {
      return error(res, `Please wait ${result.cooldownSeconds} seconds before resending`, 429);
    }

    return success(res, null, 'OTP resent successfully');
  } catch (err) {
    if (err.message === 'EMAIL_SEND_FAILED') {
      return error(res, 'Could not send verification email. Please try again later.', 503);
    }
    if (err.message === 'OTP_DAILY_LIMIT_EXCEEDED') {
      return error(res, 'Daily OTP limit exceeded. Try again tomorrow.', 429);
    }
    next(err);
  }
}

// POST /api/v1/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return error(res, 'Invalid credentials', 401);

    const valid = await authService.comparePassword(password, user.password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    if (!user.is_verified) {
      return error(res, 'Please verify your email before logging in.', 403, [
        { field: 'email', message: 'Email not verified', userId: user.id },
      ]);
    }

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = await authService.generateRefreshToken(user.id);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return success(res, {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/refresh
async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (!rawToken) return error(res, 'No refresh token', 401);

    const { accessToken, refreshToken, user } = await authService.rotateRefreshToken(rawToken);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return success(res, {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.message === 'INVALID_REFRESH_TOKEN') return error(res, 'Invalid or expired refresh token', 401);
    next(err);
  }
}

// POST /api/v1/auth/logout
async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (rawToken) await authService.revokeRefreshToken(rawToken);

    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/profile
async function getProfile(req, res) {
  const user = req.user;
  return success(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified,
  });
}

// PUT /api/v1/auth/profile
async function updateProfile(req, res, next) {
  try {
    const { name, phone, avatar_url, avatar_public_id } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;
    if (avatar_public_id !== undefined) updates.avatar_public_id = avatar_public_id || null;

    await req.user.update(updates);
    return success(res, {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar_url: req.user.avatar_url,
      role: req.user.role,
    }, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/change-password
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return error(res, 'current_password and new_password are required', 400);
    }
    if (new_password.length < 8) {
      return error(res, 'New password must be at least 8 characters', 400);
    }
    const { User } = require('../models');
    const freshUser = await User.findByPk(req.user.id);
    const valid = await authService.comparePassword(current_password, freshUser.password);
    if (!valid) return error(res, 'Current password is incorrect', 400);

    const hashed = await authService.hashPassword(new_password);
    await freshUser.update({ password: hashed });
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { register, verifyOtp, resendOtp, login, refresh, logout, getProfile, updateProfile, changePassword };
