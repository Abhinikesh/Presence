const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PairState = require('../models/PairState');
const KanbanCard = require('../models/KanbanCard');
const auth = require('../middleware/auth');

// POST /api/pair/connect - Connect to a partner using their pairCode
router.post('/connect', auth, async (req, res) => {
  try {
    const { pairCode } = req.body;
    const currentUser = req.user;

    if (!pairCode) {
      return res.status(400).json({ error: 'Pair code is required' });
    }

    const cleanCode = pairCode.trim().toUpperCase();

    // Prevent pairing with oneself
    if (currentUser.pairCode === cleanCode) {
      return res.status(400).json({ error: 'You cannot connect with your own code' });
    }

    // Check if current user is already paired
    if (currentUser.pairId) {
      return res.status(400).json({ error: 'You are already paired. Please unpair first.' });
    }

    // Find the partner
    const partner = await User.findOne({ pairCode: cleanCode });
    if (!partner) {
      return res.status(404).json({ error: 'Partner code not found' });
    }

    // Check if partner is already paired
    if (partner.pairId) {
      return res.status(400).json({ error: 'This partner is already connected to someone else' });
    }

    // Link both users
    currentUser.pairId = partner._id;
    partner.pairId = currentUser._id;

    await currentUser.save();
    await partner.save();

    res.json({
      message: 'Successfully paired!',
      partner: {
        id: partner._id,
        name: partner.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during pairing: ' + error.message });
  }
});

// GET /api/pair/status - Check current pairing status
router.get('/status', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser.pairId) {
      return res.json({ paired: false });
    }

    const partner = await User.findById(currentUser.pairId);
    if (!partner) {
      // In case partner was deleted, clean up reference
      currentUser.pairId = null;
      await currentUser.save();
      return res.json({ paired: false });
    }

    res.json({
      paired: true,
      partner: {
        id: partner._id,
        name: partner.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching status: ' + error.message });
  }
});

// POST /api/pair/unpair - Unpair/Disconnect from the current partner
router.post('/unpair', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser.pairId) {
      return res.status(400).json({ error: 'You are not currently paired' });
    }

    // Delete the PairState record and all Kanban cards for this pair
    const pairId = [currentUser._id.toString(), currentUser.pairId.toString()].sort().join('-');
    await PairState.deleteOne({ pairId });
    await KanbanCard.deleteMany({ pairId });

    // Find the partner
    const partner = await User.findById(currentUser.pairId);
    if (partner) {
      // Clear partner's pairId
      partner.pairId = null;
      await partner.save();
    }

    // Clear current user's pairId
    currentUser.pairId = null;
    await currentUser.save();

    res.json({ message: 'Successfully unpaired!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during unpairing: ' + error.message });
  }
});

module.exports = router;
