/**
 * Mailjet Transactional Email Service
 * Uses Mailjet REST API v3.1 — no SMTP.
 */
const fetch = require('node-fetch');
const logger = require('../utils/logger');

const MAILJET_API_URL = 'https://api.mailjet.com/v3.1/send';

/**
 * Build Basic Auth header from Mailjet credentials.
 */
function getAuthHeader() {
  const credentials = Buffer.from(
    `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`
  ).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Core send function — sends a single email via Mailjet API.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.toName - Recipient display name
 * @param {string} options.subject - Email subject
 * @param {string} options.textPart - Plain text body
 * @param {string} [options.htmlPart] - HTML body (optional)
 */
async function sendEmail({ to, toName, subject, textPart, htmlPart }) {
  const from = process.env.MAILJET_FROM_EMAIL;
  const fromName = process.env.MAILJET_FROM_NAME || 'LuxeMode';

  const payload = {
    Messages: [
      {
        From: { Email: from, Name: fromName },
        To: [{ Email: to, Name: toName || to }],
        Subject: subject,
        TextPart: textPart,
        ...(htmlPart && { HTMLPart: htmlPart }),
      },
    ],
  };

  let response;
  try {
    response = await fetch(MAILJET_API_URL, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    logger.error('Mailjet network error', { error: networkErr.message });
    throw new Error('EMAIL_SEND_FAILED');
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error('Mailjet API error', { status: response.status, body });
    throw new Error('EMAIL_SEND_FAILED');
  }

  const result = await response.json();
  const msgStatus = result?.Messages?.[0]?.Status;
  if (msgStatus && msgStatus !== 'success') {
    logger.error('Mailjet message rejected', { result });
    throw new Error('EMAIL_SEND_FAILED');
  }

  logger.info('Email sent via Mailjet', { to, subject });
  return result;
}

/**
 * Send OTP verification email.
 * @param {string} to - Recipient email
 * @param {string} toName - Recipient name
 * @param {string} otp - Plain-text OTP code
 * @param {number} ttlMinutes - OTP validity duration
 */
async function sendOtpEmail(to, toName, otp, ttlMinutes = 10) {
  const fromName = process.env.MAILJET_FROM_NAME || 'LuxeMode';

  const textPart = `Hello ${toName},\n\nYour verification code is: ${otp}\n\nThis code is valid for ${ttlMinutes} minutes.\nDo not share this code with anyone.\n\n${fromName} Team`;

  const htmlPart = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width:520px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 24px rgba(0,0,0,.07); }
    .header { background:#111111; padding:32px 40px; text-align:center; }
    .header-logo { color:#ffffff; font-size:22px; font-weight:700; letter-spacing:3px; text-transform:uppercase; }
    .body { padding:40px; }
    .greeting { font-size:16px; color:#374151; margin-bottom:24px; }
    .otp-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:24px; text-align:center; margin:24px 0; }
    .otp-label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px; }
    .otp-code { font-size:40px; font-weight:800; color:#111111; letter-spacing:10px; }
    .note { font-size:13px; color:#6b7280; line-height:1.6; margin-top:20px; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; font-size:12px; color:#9ca3af; }
    .warning { color:#ef4444; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">${fromName}</div>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>${toName}</strong>,</p>
      <p style="color:#374151;font-size:15px;">Thank you for registering at <strong>${fromName}</strong>. Use the one-time code below to verify your email:</p>
      <div class="otp-box">
        <div class="otp-label">Verification code</div>
        <div class="otp-code">${otp}</div>
      </div>
      <p class="note">
        ⏱ This code expires in <strong>${ttlMinutes} minutes</strong>.<br/>
        <span class="warning">⚠ Do not share this code with anyone.</span><br/>
        If you did not request this, you can ignore this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    toName,
    subject: `[${fromName}] Your verification code`,
    textPart,
    htmlPart,
  });
}

module.exports = { sendEmail, sendOtpEmail };
