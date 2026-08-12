const express = require('express');
const router = express.Router();
const KanbanCard = require('../models/KanbanCard');
const auth = require('../middleware/auth');

const COLS = ['todo', 'in_progress', 'done'];

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
    if (partnerInfo) io.to(partnerInfo.socketId).emit(event, data);
  }
}

async function getFullBoard(pairId) {
  const cards = await KanbanCard.find({ pairId }).sort({ position: 1 });
  const board = { todo: [], in_progress: [], done: [] };
  cards.forEach(c => { if (board[c.column]) board[c.column].push(c); });
  return board;
}

router.get('/cards', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });
    const cards = await KanbanCard.find({ pairId }).sort({ position: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /board — grouped
router.get('/board', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });
    res.json(await getFullBoard(pairId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cards — create
router.post('/cards', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const { text, column = 'todo' } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
    if (!COLS.includes(column)) return res.status(400).json({ error: 'Invalid column' });

    const maxCard = await KanbanCard.findOne({ pairId, column }).sort({ position: -1 });
    const position = maxCard ? maxCard.position + 1 : 0;

    const card = new KanbanCard({ pairId, text: text.trim(), column, position, createdBy: req.user._id });
    await card.save();

    const board = await getFullBoard(pairId);
    emitToPartner(req, 'kanban_board_refresh', board);
    res.status(201).json({ card, board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /cards/:id/move — atomic move between columns (drag-and-drop + button)
router.patch('/cards/:id/move', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const { column: newCol, position: newPos } = req.body;
    if (!COLS.includes(newCol)) return res.status(400).json({ error: 'Invalid column' });

    const card = await KanbanCard.findOne({ _id: req.params.id, pairId });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const oldCol = card.column;

    // Remove from old column — reorder remaining cards
    if (oldCol !== newCol) {
      const srcCards = await KanbanCard.find({ pairId, column: oldCol }).sort({ position: 1 });
      const filtered = srcCards.filter(c => c._id.toString() !== card._id.toString());
      await Promise.all(filtered.map((c, i) =>
        KanbanCard.updateOne({ _id: c._id }, { position: i })
      ));
    }

    // Insert into new column at desired position
    const dstCards = await KanbanCard.find({
      pairId, column: newCol, _id: { $ne: card._id }
    }).sort({ position: 1 });

    const insertAt = Math.max(0, Math.min(newPos ?? dstCards.length, dstCards.length));
    dstCards.splice(insertAt, 0, card);
    await Promise.all(dstCards.map((c, i) =>
      KanbanCard.updateOne({ _id: c._id }, { position: i, column: newCol })
    ));

    const board = await getFullBoard(pairId);
    emitToPartner(req, 'kanban_board_refresh', board);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /cards/:id/text — update text
router.patch('/cards/:id/text', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

    const card = await KanbanCard.findOneAndUpdate(
      { _id: req.params.id, pairId },
      { text: text.trim() },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const board = await getFullBoard(pairId);
    emitToPartner(req, 'kanban_board_refresh', board);
    res.json({ card, board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /cards/:id
router.delete('/cards/:id', auth, async (req, res) => {
  try {
    const pairId = getPairKey(req.user);
    if (!pairId) return res.status(400).json({ error: 'Not paired' });

    const card = await KanbanCard.findOneAndDelete({ _id: req.params.id, pairId });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Reorder remaining in that column
    const remaining = await KanbanCard.find({ pairId, column: card.column }).sort({ position: 1 });
    await Promise.all(remaining.map((c, i) => KanbanCard.updateOne({ _id: c._id }, { position: i })));

    const board = await getFullBoard(pairId);
    emitToPartner(req, 'kanban_board_refresh', board);
    res.json({ message: 'Deleted', board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
