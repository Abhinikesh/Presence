const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  pairId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 300,
    trim: true
  },
  triggerStatus: {
    type: String,
    required: true,
    enum: ['Free', 'Studying', 'Sleeping', 'Listening']
  },
  delivered: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', noteSchema);
