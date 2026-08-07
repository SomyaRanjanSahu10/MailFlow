const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');

// Multer for avatar uploads
const AVATARS_DIR = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user._id}_${uuidv4()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

// GET /api/profile — get profile
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -activeSessions -passwordReset*');
    res.json({ user });
  } catch { res.status(500).json({ message: 'Error fetching profile' }); }
});

// GET /api/profile/:userId — get any user's public profile card
router.get('/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email avatar designation department phone');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch { res.status(500).json({ message: 'Error fetching profile' }); }
});

// PUT /api/profile — update profile fields
router.put('/', protect, async (req, res) => {
  try {
    const { name, designation, department, phone, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, designation, department, phone, bio },
      { new: true, runValidators: true }
    ).select('-password -activeSessions');
    res.json({ message: 'Profile updated', user });
  } catch { res.status(500).json({ message: 'Error updating profile' }); }
});

// POST /api/profile/avatar — upload profile picture
router.post('/avatar', protect, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    // Delete old avatar file if it exists
    const oldUser = await User.findById(req.user._id);
    if (oldUser.avatar && oldUser.avatar.includes('uploads/avatars')) {
      const oldPath = path.join(__dirname, '..', oldUser.avatar.replace('/uploads', 'uploads'));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id, { avatar: avatarUrl }, { new: true }
    ).select('-password');
    res.json({ message: 'Avatar updated', avatar: avatarUrl, user });
  } catch { res.status(500).json({ message: 'Error uploading avatar' }); }
});

module.exports = router;
