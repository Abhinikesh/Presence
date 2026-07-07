const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to leave notes.' });
  }

  const { message, triggerStatus } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }
  if (message.length > 300) {
    return res.status(400).json({ error: 'Message cannot exceed 300 characters.' });
  }

  const validStatuses = ['Free', 'Studying', 'Sleeping', 'Listening'];
  if (!validStatuses.includes(triggerStatus)) {
    return res.status(400).json({ error: 'Invalid trigger status.' });
  }

  try {
    const note = new Note({
      pairId: req.user.pairId,
      fromUserId: req.user._id,
      message: message.trim(),
      triggerStatus,
      delivered: false
    });
    await note.save();
    res.status(201).json({ message: 'Note left successfully!', note });
  } catch (error) {
    res.status(500).json({ error: 'Server error leaving note: ' + error.message });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const partnerId = req.user.pairId;
    if (!partnerId) {
      return res.json(null);
    }

    const onlineUsers = req.app.get('onlineUsers');
    let currentStatus = 'Free';
    if (onlineUsers) {
      const userInfo = onlineUsers.get(req.user._id.toString());
      if (userInfo && userInfo.status) {
        currentStatus = userInfo.status;
      }
    }

    const note = await Note.findOne({
      fromUserId: partnerId,
      triggerStatus: currentStatus,
      delivered: false
    });

    if (note) {
      note.delivered = true;
      await note.save();
      const partnerUser = await User.findById(partnerId);
      return res.json({
        id: note._id,
        message: note.message,
        fromName: partnerUser ? partnerUser.name : 'Your partner'
      });
    }

    res.json(null);
  } catch (error) {
    res.status(500).json({ error: 'Server error checking pending notes: ' + error.message });
  }
});

module.exports = router;
