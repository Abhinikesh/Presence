const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Google Auth Route
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify the Google ID token using google-auth-library
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const { sub: googleId, email, name, picture: profilePicture } = payload;

    // Check if user with this googleId already exists
    let user = await User.findOne({ googleId });

    if (!user) {
      // Create new user if not found
      const pairCode = await generateUniquePairCode();
      user = new User({
        googleId,
        name,
        email,
        profilePicture,
        pairCode
      });
      await user.save();
    } else {
      // Update profile details if they changed
      let updated = false;
      if (user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (user.profilePicture !== profilePicture) {
        user.profilePicture = profilePicture;
        updated = true;
      }
      if (user.email !== email) {
        user.email = email;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Generate our own JWT containing userId and id (for middleware)
    const jwtToken = jwt.sign(
      { id: user._id, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        pairCode: user.pairCode,
        pairId: user.pairId
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed: ' + error.message });
  }
});
// Get Current Logged-in User

// Get Current Logged-in User
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
