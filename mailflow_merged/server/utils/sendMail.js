const { createTransporter } = require('../config/nodemailer');

/**
 * sendMail — thin wrapper around nodemailer.
 *
 * @param {object} opts
 * @param {string}   opts.to           recipient email
 * @param {string}   opts.subject      subject line
 * @param {string}   [opts.text]       plain-text fallback
 * @param {string}   [opts.html]       HTML body (preferred)
 * @param {Array}    [opts.attachments] nodemailer attachment array
 * @returns {Promise<object>} nodemailer info object
 */
const sendMail = async ({ to, subject, text, html, attachments = [] }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured — skipping real email send');
    return { skipped: true };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'MailFlow'}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text:  text || subject,
    html:  html || text || subject,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent → ${to} | messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ SMTP send failed → ${to}:`, err.message);
    throw err;
  }
};

module.exports = sendMail;
