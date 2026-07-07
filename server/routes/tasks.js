const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Helper function to emit events to partner
const emitToPartner = (req, eventName, payload) => {
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  if (io && onlineUsers && req.user.pairId) {
    const partnerId = req.user.pairId.toString();
    const partnerInfo = onlineUsers.get(partnerId);
    if (partnerInfo) {
      io.to(partnerInfo.socketId).emit(eventName, payload);
    }
  }
};

// GET /api/tasks - Get all tasks for pair
router.get('/', auth, async (req, res) => {
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to manage tasks.' });
  }
  try {
    const tasks = await Task.find({
      pairId: { $in: [req.user._id, req.user.pairId] }
    }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks: ' + error.message });
  }
});

// POST /api/tasks - Create task
router.post('/', auth, async (req, res) => {
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to manage tasks.' });
  }
  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Task text is required.' });
  }
  try {
    const task = new Task({
      pairId: req.user.pairId,
      text: text.trim(),
      createdBy: req.user._id,
      completed: false
    });
    await task.save();

    emitToPartner(req, 'task_created', task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task: ' + error.message });
  }
});

// PATCH /api/tasks/:id - Toggle completed status
router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const allowedUserIds = [req.user._id.toString(), req.user.pairId?.toString()];
    if (!allowedUserIds.includes(task.createdBy.toString()) && !allowedUserIds.includes(task.pairId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    task.completed = !task.completed;
    await task.save();

    emitToPartner(req, 'task_updated', task);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling task: ' + error.message });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const allowedUserIds = [req.user._id.toString(), req.user.pairId?.toString()];
    if (!allowedUserIds.includes(task.createdBy.toString()) && !allowedUserIds.includes(task.pairId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await task.deleteOne();

    emitToPartner(req, 'task_deleted', { id: req.params.id });

    res.json({ message: 'Task deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task: ' + error.message });
  }
});

module.exports = router;
