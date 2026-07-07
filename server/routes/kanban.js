const express = require('express');
const router = express.Router();
const KanbanCard = require('../models/KanbanCard');
const User = require('../models/User');
const auth = require('../middleware/auth');

function getPairKey(user) {
  if (!user.pairId) return null;
  return [user._id.toString(), user.pairId.toString()].sort().join('-');
}

function emitToPartner(req, event, data) {
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  const partnerId = req.user.pairId ? req.user.pairId.toString() : null;
  if (io && onlineUsers && partnerId) {
    const partnerInfo = onlineUsers.get(partnerId);
    if (partnerInfo) {
      io.to(partnerInfo.socketId).emit(event, data);
    }
  }
}

// GET /api/kanban/cards — return all cards for this pair, sorted by column+position
router.get('/cards', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });
    const cards = await KanbanCard.find({ pairId }).sort({ position: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/kanban/cards — create a new card
router.post('/cards', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const { text, column = 'todo' } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });

    // Position at end of that column
    const maxCard = await KanbanCard.findOne({ pairId, column }).sort({ position: -1 });
    const position = maxCard ? maxCard.position + 1 : 0;

    const card = new KanbanCard({
      pairId,
      text: text.trim(),
      column,
      position,
      createdBy: req.user._id
    });
    await card.save();

    emitToPartner(req, 'kanban_card_created', card);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PATCH /api/kanban/cards/:id — move card to new column / reorder (bulk reorder support)
router.patch('/cards/:id', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const card = await KanbanCard.findOne({ _id: req.params.id, pairId });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const { column, position } = req.body;
    if (column !== undefined) card.column = column;
    if (position !== undefined) card.position = position;
    await card.save();

    emitToPartner(req, 'kanban_card_moved', card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PATCH /api/kanban/cards/:id/text — edit card text
router.patch('/cards/:id/text', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });

    const card = await KanbanCard.findOneAndUpdate(
      { _id: req.params.id, pairId },
      { text: text.trim() },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });

    emitToPartner(req, 'kanban_card_updated', card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /api/kanban/cards/:id — delete a card
router.delete('/cards/:id', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const card = await KanbanCard.findOneAndDelete({ _id: req.params.id, pairId });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    emitToPartner(req, 'kanban_card_deleted', { _id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
