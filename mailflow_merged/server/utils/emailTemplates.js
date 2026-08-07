/**
 * HTML email templates for system emails (OTP, welcome, notifications).
 * All templates return a full HTML string ready for nodemailer htmlBody.
 */

const baseWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin:0; padding:0; background:#f3f2f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width:560px; margin:32px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
    .header  { background:linear-gradient(135deg,#0078d4,#005a9e); padding:28px 36px; }
    .header h1 { color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px; }
    .header p  { color:rgba(255,255,255,0.75); margin:4px 0 0; font-size:13px; }
    .body    { padding:32px 36px; color:#201f1e; }
    .body h2 { font-size:18px; font-weight:600; margin:0 0 10px; }
    .body p  { font-size:14px; line-height:1.6; color:#444; margin:0 0 16px; }
    .otp-box { background:#f0f7ff; border:2px dashed #0078d4; border-radius:10px; padding:20px; text-align:center; margin:20px 0; }
    .otp-box span { font-size:38px; font-weight:700; letter-spacing:12px; color:#0078d4; }
    .otp-note { font-size:12px; color:#888; margin-top:8px; }
    .btn { display:inline-block; padding:12px 28px; background:#0078d4; color:white; text-decoration:none; border-radius:7px; font-weight:600; font-size:14px; margin:8px 0; }
    .footer { background:#f9f9f9; border-top:1px solid #e1dfdd; padding:16px 36px; font-size:11px; color:#888; text-align:center; }
    .highlight { color:#0078d4; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✉️ MailFlow</h1>
      <p>Your modern email experience</p>
    </div>
    ${content}
    <div class="footer">
      This is an automated email from MailFlow. Please do not reply.<br/>
      © ${new Date().getFullYear()} MailFlow. All rights reserved.
    </div>
  </div>
</body>
</html>`;

// OTP for password reset
const forgotPasswordOTP = (name, otp) => baseWrapper(`
  <div class="body">
    <h2>Password Reset Request</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>We received a request to reset your MailFlow password. Use the OTP below to proceed.</p>
    <div class="otp-box">
      <span>${otp}</span>
      <p class="otp-note">Valid for <strong>10 minutes</strong>. Do not share this with anyone.</p>
    </div>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  </div>`);

// Password changed confirmation
const passwordChanged = (name) => baseWrapper(`
  <div class="body">
    <h2>Password Changed Successfully</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>Your MailFlow password was successfully changed.</p>
    <p>If you did not make this change, please contact support immediately or reset your password.</p>
  </div>`);

// Welcome email after registration
const welcomeEmail = (name, email) => baseWrapper(`
  <div class="body">
    <h2>Welcome to MailFlow! 🎉</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>Your account has been created successfully.</p>
    <p><strong>Your email:</strong> ${email}</p>
    <p>You can now send and receive emails, attach files, organise your inbox, and more.</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn">Open MailFlow</a>
    <p style="font-size:12px;color:#888;margin-top:16px;">If you didn't create this account, ignore this email.</p>
  </div>`);

// Notification: you received a new email
const newEmailNotification = (receiverName, senderName, subject) => baseWrapper(`
  <div class="body">
    <h2>New Email Received</h2>
    <p>Hi <span class="highlight">${receiverName}</span>,</p>
    <p>You have a new email from <strong>${senderName}</strong>.</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn">Open MailFlow</a>
  </div>`);

module.exports = { forgotPasswordOTP, passwordChanged, welcomeEmail, newEmailNotification };
