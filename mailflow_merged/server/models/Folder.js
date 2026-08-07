const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:  { type: String, required: true, trim: true, maxlength: 60 },
    color: { type: String, default: '#0078d4' },
  },
  { timestamps: true }
);

FolderSchema.index({ owner: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Folder', FolderSchema);
