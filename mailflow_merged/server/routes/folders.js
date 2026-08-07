const express = require('express');
const router  = express.Router();
const Folder  = require('../models/Folder');
const Email   = require('../models/Email');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    res.json({ folders: await Folder.find({ owner: req.user._id }).sort({ name: 1 }) });
  } catch { res.status(500).json({ message: 'Error fetching folders' }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Folder name is required' });
    const folder = await Folder.create({ owner: req.user._id, name: name.trim(), color: color || '#0078d4' });
    res.status(201).json({ folder });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Folder name already exists' });
    res.status(500).json({ message: 'Error creating folder' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    if (req.body.name) folder.name = req.body.name.trim();
    if (req.body.color) folder.color = req.body.color;
    await folder.save();
    res.json({ folder });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Folder name already exists' });
    res.status(500).json({ message: 'Error updating folder' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    await Email.updateMany({ folder: folder._id }, { $set: { folder: null } });
    await folder.deleteOne();
    res.json({ message: 'Folder deleted' });
  } catch { res.status(500).json({ message: 'Error deleting folder' }); }
});

router.put('/:id/emails/:emailId', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const email  = await Email.findOne({ _id: req.params.emailId, $or: [{ sender: req.user._id }, { receiver: req.user._id }] });
    if (!email)  return res.status(404).json({ message: 'Email not found' });
    email.folder = folder._id;
    await email.save();
    res.json({ message: 'Email moved to folder' });
  } catch { res.status(500).json({ message: 'Error moving email' }); }
});

router.delete('/:id/emails/:emailId', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.emailId, $or: [{ sender: req.user._id }, { receiver: req.user._id }] });
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.folder = null;
    await email.save();
    res.json({ message: 'Email removed from folder' });
  } catch { res.status(500).json({ message: 'Error updating email' }); }
});

router.get('/:id/emails', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const emails = await Email.find({
      folder: folder._id,
      $or: [{ sender: req.user._id, deletedBySender: false }, { receiver: req.user._id, deletedByReceiver: false }],
    }).populate('sender','name email').populate('receiver','name email').sort({ createdAt: -1 });
    res.json({ folder, emails });
  } catch { res.status(500).json({ message: 'Error fetching folder emails' }); }
});

module.exports = router;
