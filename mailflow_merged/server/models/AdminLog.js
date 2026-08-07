const mongoose = require('mongoose');

// Tracks every admin action for audit trail
const AdminLogSchema = new mongoose.Schema(
  {
    admin:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },   // e.g. 'DELETE_USER', 'VIEW_EMAILS'
    target: { type: String, default: '' },       // userId or emailId acted upon
    detail: { type: String, default: '' },       // human-readable description
    ip:     { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminLog', AdminLogSchema);
