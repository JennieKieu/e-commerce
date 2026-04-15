const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Generate JWT access token.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

/**
 * Generate a secure opaque refresh token and persist its hash.
 */
async function generateRefreshToken(userId) {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  return rawToken;
}

/**
 * Rotate refresh token: revoke old, issue new.
 */
async function rotateRefreshToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await RefreshToken.findOne({
    where: {
      token_hash: tokenHash,
      is_revoked: false,
      expires_at: { [Op.gt]: new Date() },
    },
    include: [{ association: 'user' }],
  });

  if (!record) throw new Error('INVALID_REFRESH_TOKEN');

  await record.update({ is_revoked: true });

  const user = record.user;
  const accessToken = generateAccessToken(user);
  const newRawToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken: newRawToken, user };
}

/**
 * Revoke a refresh token on logout.
 */
async function revokeRefreshToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await RefreshToken.update({ is_revoked: true }, { where: { token_hash: tokenHash } });
}

/**
 * Hash a password with bcrypt.
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

/**
 * Compare plain password against hash.
 */
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Purge expired / revoked tokens periodically (call from a cron job or on startup).
 */
async function purgeExpiredTokens() {
  const deleted = await RefreshToken.destroy({
    where: {
      [Op.or]: [
        { is_revoked: true },
        { expires_at: { [Op.lt]: new Date() } },
      ],
    },
  });
  logger.info(`Purged ${deleted} expired/revoked refresh tokens`);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  hashPassword,
  comparePassword,
  purgeExpiredTokens,
};
