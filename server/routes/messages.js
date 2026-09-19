const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { decrypt } = require('../utils/crypto');

function getPairKey(user) {
  if (!user.pairId) return null;
  return [user._id.toString(), user.pairId.toString()].sort().join('-');
}

// GET /api/messages - Fetch messages between the paired users
router.get('/', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.status(400).json({ error: 'You are not paired with anyone yet.' });
    }

    // Verify reciprocal pair relationship
    const partner = await User.findById(req.user.pairId);
    if (!partner || !partner.pairId || partner.pairId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Pair connection is inactive or invalid.' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const messages = await Message.find({ pairId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    const decryptedMessages = messages.map((msg) => ({
      _id: msg._id,
      pairId: msg.pairId,
      sender: msg.sender,
      recipient: msg.recipient,
      text: decrypt(msg.text, msg.iv, msg.tag, msg.pairId || pairId),
      read: msg.read,
      readAt: msg.readAt,
      createdAt: msg.createdAt
    }));

    res.json({ messages: decryptedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages: ' + error.message });
  }
});

// GET /api/messages/unread-count - Get total unread count for current user
router.get('/unread-count', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.json({ unreadCount: 0 });
    }

    const count = await Message.countDocuments({
      pairId,
      recipient: req.user._id,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to count unread messages: ' + error.message });
  }
});

// POST /api/messages/mark-read - Mark partner's messages to me as read
router.post('/mark-read', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.status(400).json({ error: 'Not paired' });
    }

    const now = new Date();
    const result = await Message.updateMany(
      {
        pairId,
        recipient: req.user._id,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: now
        }
      }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read: ' + error.message });
  }
});

module.exports = router;
