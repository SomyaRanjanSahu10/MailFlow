const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    lastLogin:{ type: Date, default: null },

    // ── Feature 4: Profile ────────────────────────────────────────────────────
    avatar:      { type: String, default: '' },       // URL/path to profile picture
    designation: { type: String, default: '' },
    department:  { type: String, default: '' },
    phone:       { type: String, default: '' },
    bio:         { type: String, default: '' },

    // ── Feature 5: Multi-account sessions ─────────────────────────────────────
    // Stores active JWT tokens for multiple logins/devices
    activeSessions: [{
      token:     { type: String },
      label:     { type: String, default: 'Primary' }, // e.g. "Work", "Personal"
      createdAt: { type: Date, default: Date.now },
    }],

    // ── Forgot-password ───────────────────────────────────────────────────────
    passwordResetToken:   { type: String, default: null },
    passwordResetExpires: { type: Date,   default: null },
    passwordResetOTP:     { type: String, default: null },
    passwordResetOTPExp:  { type: Date,   default: null },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);
