const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter.middleware');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 8, max: 100 }).withMessage('Password must be 8-100 characters'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('userId').notEmpty().withMessage('userId is required'),
    body('otp').trim().isLength({ min: 4, max: 8 }).withMessage('OTP is required'),
  ],
  validate,
  ctrl.verifyOtp
);

router.post(
  '/resend-otp',
  otpLimiter,
  [body('userId').notEmpty().withMessage('userId is required')],
  validate,
  ctrl.resendOtp
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

router.get('/profile', authenticate, ctrl.getProfile);
router.put(
  '/profile',
  authenticate,
  [body('name').optional().trim().isLength({ min: 1, max: 100 })],
  validate,
  ctrl.updateProfile
);
router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
