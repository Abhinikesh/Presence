const express = require('express');
const router = express.Router();
const PairState = require('../models/PairState');
const auth = require('../middleware/auth');

// Helper to get pair unique key
function getPairKey(user) {
  if (!user.pairId) return null;
  return [user._id.toString(), user.pairId.toString()].sort().join('-');
}

// GET /api/pair-state - Get or create pair state
router.get('/', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.status(400).json({ error: 'You are not currently paired.' });
    }

    let pairState = await PairState.findOne({ pairId });
    if (!pairState) {
      pairState = new PairState({ pairId });
      await pairState.save();
    }

    res.json(pairState);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching pair state: ' + error.message });
  }
});

// PATCH /api/pair-state/whiteboard - Update whiteboardData
router.patch('/whiteboard', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.status(400).json({ error: 'You are not currently paired.' });
    }

    const { whiteboardData } = req.body;
    
    const pairState = await PairState.findOneAndUpdate(
      { pairId },
      { whiteboardData, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res.json(pairState);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating whiteboard: ' + error.message });
  }
});

// PATCH /api/pair-state/timer - Update studyTimer
router.patch('/timer', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) {
      return res.status(400).json({ error: 'You are not currently paired.' });
    }

    const { isRunning, remainingSeconds, durationMinutes } = req.body;

    const pairState = await PairState.findOneAndUpdate(
      { pairId },
      { 
        'studyTimer.isRunning': isRunning,
        'studyTimer.remainingSeconds': remainingSeconds,
        'studyTimer.durationMinutes': durationMinutes,
        updatedAt: Date.now()
      },
      { new: true, upsert: true }
    );

    res.json(pairState);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating timer: ' + error.message });
  }
});

module.exports = router;
