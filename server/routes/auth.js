const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper to generate unique pairCode
const generateUniquePairCode = async () => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    // Generate 6 character alphanumeric string
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await User.findOne({ pairCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Generate unique pairCode
    const pairCode = await generateUniquePairCode();

    // Create and save user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      pairCode
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, pairCode: user.pairCode } });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup: ' + error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, pairCode: user.pairCode } });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login: ' + error.message });
  }
});

// Get Current Logged-in User
router.get('/me', auth, async (req, res) => {
  const user = req.user.toObject();
  delete user.password;
  res.json(user);
});

module.exports = router;
