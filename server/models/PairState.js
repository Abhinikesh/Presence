const mongoose = require('mongoose');

const pairStateSchema = new mongoose.Schema({
  pairId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  whiteboardData: {
    type: String,
    default: ''
  },
  ticTacToeScore: {
    user1Wins: { type: Number, default: 0 },
    user2Wins: { type: Number, default: 0 },
    draws: { type: Number, default: 0 }
  },
  studyTimer: {
    isRunning: { type: Boolean, default: false },
    remainingSeconds: { type: Number, default: 25 * 60 },
    durationMinutes: { type: Number, default: 25 }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

pairStateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PairState', pairStateSchema);
