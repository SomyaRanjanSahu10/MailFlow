const mongoose = require('mongoose');

// Feature 2: Email Signature
const SignatureSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name:        { type: String, default: '' },
    designation: { type: String, default: '' },
    company:     { type: String, default: '' },
    phone:       { type: String, default: '' },
    regards:     { type: String, default: 'Best Regards' },
    htmlContent: { type: String, default: '' }, // custom rich HTML override
    isEnabled:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Signature', SignatureSchema);
