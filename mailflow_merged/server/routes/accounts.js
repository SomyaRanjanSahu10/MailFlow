const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// GET /api/accounts — list all sessions for current user
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activeSessions name email avatar');
    res.json({ sessions: user.activeSessions });
  } catch { res.status(500).json({ message: 'Error fetching accounts' }); }
});

// POST /api/accounts/add — add/login another account (returns new token)
router.post('/add', protect, async (req, res) => {
  try {
    const { email, password, label } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const account = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!account || !(await account.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(account._id, account.role);
    // Store session reference on the other account
    await User.findByIdAndUpdate(account._id, {
      $push: { activeSessions: { token, label: label || 'Secondary' } },
    });
    res.json({
      message: 'Account added',
      token,
      user: { id: account._id, name: account.name, email: account.email, role: account.role, avatar: account.avatar },
    });
  } catch { res.status(500).json({ message: 'Error adding account' }); }
});

// DELETE /api/accounts/logout-session — logout a specific session
router.delete('/logout-session', protect, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { activeSessions: { token } },
    });
    res.json({ message: 'Session removed' });
  } catch { res.status(500).json({ message: 'Error removing session' }); }
});

module.exports = router;
