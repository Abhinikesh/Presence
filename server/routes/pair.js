const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PairState = require('../models/PairState');
const KanbanCard = require('../models/KanbanCard');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiter for pairing attempts: max 6 attempts per 10 minutes to prevent brute-forcing
const pairLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Too many pairing attempts. Please wait 10 minutes before trying again.'
});

router.post('/connect', auth, pairLimiter, async (req, res) => {
  try {
    const { pairCode } = req.body;
    const currentUser = req.user;

    if (!pairCode || typeof pairCode !== 'string') {
      return res.status(400).json({ error: 'Pair code is required and must be a string' });
    }

    const cleanCode = pairCode.trim().toUpperCase();

    // Strict validation: pair codes are 6 alphanumeric characters
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'Invalid pair code format. Must be 6 alphanumeric characters.' });
    }

    if (currentUser.pairCode === cleanCode) {
      return res.status(400).json({ error: 'You cannot connect with your own code' });
    }

    if (currentUser.pairId) {
      return res.status(400).json({ error: 'You are already paired. Please unpair first.' });
    }

    const partner = await User.findOne({ pairCode: cleanCode });
    if (!partner) {
      return res.status(404).json({ error: 'Partner code not found' });
    }

    if (partner.pairId) {
      return res.status(400).json({ error: 'This partner is already connected to someone else' });
    }

    // dono users ko ek dusre se link kr rhe hai
    currentUser.pairId = partner._id;
    partner.pairId = currentUser._id;
    await currentUser.save();
    await partner.save();

    // Real-time notification to partner if online
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    if (io && onlineUsers) {
      const partnerInfo = onlineUsers.get(partner._id.toString());
      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('paired_success', {
          partner: { id: currentUser._id, name: currentUser.displayName || currentUser.name }
        });
      }
    }

    res.json({
      message: 'Successfully paired!',
      partner: { id: partner._id, name: partner.displayName || partner.name }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during pairing: ' + error.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser.pairId) {
      return res.json({ paired: false });
    }

    const partner = await User.findById(currentUser.pairId);
    if (!partner) {
      currentUser.pairId = null;
      await currentUser.save();
      return res.json({ paired: false });
    }

    res.json({ paired: true, partner: { id: partner._id, name: partner.displayName || partner.name } });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching status: ' + error.message });
  }
});

router.post('/unpair', auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser.pairId) {
      return res.status(400).json({ error: 'You are not currently paired' });
    }

    const partnerId = currentUser.pairId.toString();
    const userId = currentUser._id.toString();
    const pairId = [userId, partnerId].sort().join('-');

    // Clean up database records for this pair
    await PairState.deleteOne({ pairId });
    await KanbanCard.deleteMany({ pairId });
    await Message.deleteMany({ pairId });

    const partner = await User.findById(partnerId);
    if (partner) {
      partner.pairId = null;
      await partner.save();
    }

    currentUser.pairId = null;
    await currentUser.save();

    // Clean up in-memory caches and notify both parties via Socket.IO
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    if (io && onlineUsers) {
      const partnerInfo = onlineUsers.get(partnerId);
      const userInfo = onlineUsers.get(userId);

      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('partner_unpaired', { message: 'Your partner has unpaired.' });
        io.to(partnerInfo.socketId).emit('partner_status', { online: false });
      }
      if (userInfo) {
        io.to(userInfo.socketId).emit('partner_unpaired', { message: 'You have unpaired.' });
        io.to(userInfo.socketId).emit('partner_status', { online: false });
      }

      // Clear in-memory cleanup hook if available
      const clearPairCache = req.app.get('clearPairCache');
      if (typeof clearPairCache === 'function') {
        clearPairCache(pairId);
      }
    }

    res.json({ message: 'Successfully unpaired!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during unpairing: ' + error.message });
  }
});

module.exports = router;
