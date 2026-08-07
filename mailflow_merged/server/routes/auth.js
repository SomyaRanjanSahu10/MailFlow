const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');
const sendMail = require('../utils/sendMail');
const { forgotPasswordOTP, passwordChanged, welcomeEmail } = require('../utils/emailTemplates');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Please provide name, email, and password' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ message: 'User with this email already exists' });

    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id, user.role);

    // Send welcome email (non-blocking)
    sendMail({ to: user.email, subject: 'Welcome to MailFlow!', html: welcomeEmail(user.name, user.email) })
      .catch(err => console.warn('Welcome email failed:', err.message));

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(403).json({ message: 'Account suspended. Please contact support.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
// Step 1: user submits email → we generate 6-digit OTP and email it
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond the same way to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, an OTP has been sent.' });

    // Generate 6-digit OTP
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Also generate a secure reset token (used after OTP verification)
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetOTP     = otp;
    user.passwordResetOTPExp  = expiry;
    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save({ validateBeforeSave: false });

    await sendMail({
      to:      user.email,
      subject: 'MailFlow — Password Reset OTP',
      html:    forgotPasswordOTP(user.name, otp),
    });

    // In dev without SMTP, return OTP directly (remove in production!)
    const devHint = (!process.env.SMTP_USER) ? { _devOTP: otp } : {};
    res.json({ message: 'If that email exists, an OTP has been sent.', ...devHint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Step 2: user submits OTP → we return a short-lived reset token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetOTP:    otp,
      passwordResetOTPExp: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    // OTP verified — clear it and return the reset token (raw, not hashed)
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetOTP     = null;
    user.passwordResetOTPExp  = null;
    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'OTP verified', resetToken: rawToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Step 3: user submits new password + reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return res.status(400).json({ message: 'Token and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Reset token is invalid or has expired' });

    user.password             = newPassword; // pre-save hook hashes it
    user.passwordResetToken   = null;
    user.passwordResetExpires = null;
    user.passwordResetOTP     = null;
    user.passwordResetOTPExp  = null;
    await user.save();

    await sendMail({ to: user.email, subject: 'MailFlow — Password Changed', html: passwordChanged(user.name) })
      .catch(() => {});

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
