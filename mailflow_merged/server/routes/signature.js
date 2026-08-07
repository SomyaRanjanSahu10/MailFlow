const express   = require('express');
const router    = express.Router();
const Signature = require('../models/Signature');
const { protect } = require('../middleware/auth');

// GET /api/signature — get current user's signature
router.get('/', protect, async (req, res) => {
  try {
    const sig = await Signature.findOne({ user: req.user._id });
    res.json({ signature: sig || null });
  } catch { res.status(500).json({ message: 'Error fetching signature' }); }
});

// POST /api/signature — create or update signature
router.post('/', protect, async (req, res) => {
  try {
    const { name, designation, company, phone, regards, htmlContent, isEnabled } = req.body;
    const sig = await Signature.findOneAndUpdate(
      { user: req.user._id },
      { name, designation, company, phone, regards, htmlContent,
        isEnabled: isEnabled !== undefined ? isEnabled : true },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ message: 'Signature saved', signature: sig });
  } catch { res.status(500).json({ message: 'Error saving signature' }); }
});

// DELETE /api/signature — remove signature
router.delete('/', protect, async (req, res) => {
  try {
    await Signature.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Signature removed' });
  } catch { res.status(500).json({ message: 'Error removing signature' }); }
});

module.exports = router;
