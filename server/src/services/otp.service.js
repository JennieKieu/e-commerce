const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OTP } = require('../models');
const { sendOtpEmail } = require('./mailjet.service');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES) || 10;
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
const OTP_MAX_SENDS_PER_DAY = parseInt(process.env.OTP_MAX_SENDS_PER_DAY_PER_EMAIL) || 5;

/**
 * Generate a numeric OTP of specified length.
 */
function generateOtpCode(length = OTP_LENGTH) {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return String(Math.floor(min + Math.random() * (max - min)));
}

/**
 * Hash an OTP code with bcrypt.
 */
async function hashOtp(plainOtp) {
  return bcrypt.hash(plainOtp, 10);
}

/**
 * Compare plain OTP against stored hash.
 */
async function verifyOtpHash(plainOtp, hash) {
  return bcrypt.compare(plainOtp, hash);
}

/**
 * Create (or replace) an OTP for a user and send it via email.
 * Enforces cooldown & daily send limit.
 *
 * @param {object} user - User model instance { id, email, name }
 * @param {string} purpose - 'register' | 'password_reset'
 * @returns {{ cooldownSeconds: number } | { sent: true }}
 */
async function createAndSendOtp(user, purpose = 'register') {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Check existing active OTP record for this user+purpose today
  const existing = await OTP.findOne({
    where: {
      user_id: user.id,
      purpose,
      is_used: false,
      send_date: today,
    },
    order: [['created_at', 'DESC']],
  });

  if (existing) {
    // Cooldown check
    const secondsSinceLastSend = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000;
    if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
      return { cooldownSeconds: remaining };
    }

    // Daily limit check
    if (existing.sends_today >= OTP_MAX_SENDS_PER_DAY) {
      throw new Error('OTP_DAILY_LIMIT_EXCEEDED');
    }

    // Invalidate old OTP and bump counter
    const plainOtp = generateOtpCode();
    const otpHash = await hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await existing.update({
      otp_hash: otpHash,
      expires_at: expiresAt,
      last_sent_at: new Date(),
      sends_today: existing.sends_today + 1,
    });

    await sendOtpEmail(user.email, user.name, plainOtp, OTP_TTL_MINUTES);
    logger.info('OTP resent', { userId: user.id, purpose });
    return { sent: true };
  }

  // First send of the day
  const plainOtp = generateOtpCode();
  const otpHash = await hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OTP.create({
    user_id: user.id,
    otp_hash: otpHash,
    expires_at: expiresAt,
    purpose,
    sends_today: 1,
    last_sent_at: new Date(),
    send_date: today,
  });

  await sendOtpEmail(user.email, user.name, plainOtp, OTP_TTL_MINUTES);
  logger.info('OTP created and sent', { userId: user.id, purpose });
  return { sent: true };
}

/**
 * Verify an OTP submitted by the user.
 * @param {string} userId
 * @param {string} plainOtp
 * @param {string} purpose
 * @returns {boolean}
 */
async function verifyOtp(userId, plainOtp, purpose = 'register') {
  const record = await OTP.findOne({
    where: {
      user_id: userId,
      purpose,
      is_used: false,
      expires_at: { [Op.gt]: new Date() },
    },
    order: [['created_at', 'DESC']],
  });

  if (!record) return false;

  const isMatch = await verifyOtpHash(plainOtp, record.otp_hash);
  if (!isMatch) return false;

  // Mark as used
  await record.update({ is_used: true });
  return true;
}

/**
 * Invalidate all active OTPs for a user (used on password reset completion, etc.)
 */
async function invalidateOtps(userId, purpose = 'register') {
  await OTP.update(
    { is_used: true },
    { where: { user_id: userId, purpose, is_used: false } }
  );
}

module.exports = {
  createAndSendOtp,
  verifyOtp,
  invalidateOtps,
};
