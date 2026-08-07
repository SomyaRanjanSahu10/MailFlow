const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured nodemailer transporter.
 *
 * Required .env variables:
 *   SMTP_HOST      e.g.  smtp.gmail.com
 *   SMTP_PORT      e.g.  587
 *   SMTP_USER      e.g.  yourapp@gmail.com
 *   SMTP_PASS      e.g.  your-16-char-app-password  (Google App Password)
 *   SMTP_FROM_NAME e.g.  MailFlow
 *
 * Gmail setup:
 *  1. Enable 2-Step Verification on your Google account
 *  2. Go to myaccount.google.com → Security → App passwords
 *  3. Generate an App Password for "Mail" → use that 16-char code as SMTP_PASS
 *  4. Do NOT use your actual Gmail password here
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true only for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs in dev
    },
  });
};

/**
 * Verify SMTP connection on startup (non-fatal if it fails).
 */
const verifySmtp = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️  SMTP not configured — email sending disabled (set SMTP_USER + SMTP_PASS in .env)');
    return false;
  }
  try {
    const t = createTransporter();
    await t.verify();
    console.log('✅ SMTP connection verified —', process.env.SMTP_USER);
    return true;
  } catch (err) {
    console.warn('⚠️  SMTP verification failed:', err.message);
    return false;
  }
};

module.exports = { createTransporter, verifySmtp };
