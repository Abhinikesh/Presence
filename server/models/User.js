const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  profilePicture: {
    type: String,
    trim: true
  },
  pairId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pairCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
