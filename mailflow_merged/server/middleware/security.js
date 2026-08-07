const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// ── Rate limiters ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // strict for login/register
  message: { message: 'Too many auth attempts, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'Too many uploads, please slow down.' },
});

// ── XSS sanitizer for req.body ────────────────────────────────────────────────
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = obj => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          // Allow HTML in htmlBody field (already sanitized by DOMPurify on frontend)
          if (key !== 'htmlBody') obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

// ── Activity logger helper ─────────────────────────────────────────────────────
const logActivity = async (userId, action, detail = '', ip = '', success = true) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({ user: userId, action, detail, ip, success });
  } catch {}
};

module.exports = { generalLimiter, authLimiter, uploadLimiter, sanitizeBody, mongoSanitize, logActivity };
