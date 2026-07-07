const mongoose = require('mongoose');

const kanbanCardSchema = new mongoose.Schema({
  pairId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  column: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo'
  },
  position: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

kanbanCardSchema.index({ pairId: 1, column: 1, position: 1 });

module.exports = mongoose.model('KanbanCard', kanbanCardSchema);
