const mongoose = require('mongoose');

// Feature 9: Activity log for admin panel
const ActivityLogSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action:  { type: String, required: true },   // e.g. LOGIN, SEND_EMAIL, DELETE_USER
    detail:  { type: String, default: '' },
    ip:      { type: String, default: '' },
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
