const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Strict rate limiter for authentication attempts (30 requests per 15 minutes)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

// unique pairCode generate kr rhe hai
const generateUniquePairCode = async () => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await User.findOne({ pairCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

router.post('/google', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const { sub: googleId, email, name, picture: profilePicture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
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
      let updated = false;
      if (user.name !== name) { user.name = name; updated = true; }
      if (user.profilePicture !== profilePicture) { user.profilePicture = profilePicture; updated = true; }
      if (user.email !== email) { user.email = email; updated = true; }
      if (updated) await user.save();
    }

    // apna JWT bana rhe hai jisme userId hai
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

router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// Update display name — saves to DB and pushes socket event to partner
router.patch('/display-name', auth, async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const trimmed = displayName.trim().slice(0, 30);
    const user = req.user;
    user.displayName = trimmed;
    await user.save();

    // Push real-time update to partner if they are online
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    if (io && onlineUsers && user.pairId) {
      const partnerInfo = onlineUsers.get(user.pairId.toString());
      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('partner_name_update', { name: trimmed });
      }
    }

    res.json({ displayName: trimmed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update display name: ' + error.message });
  }
});

// ============================================================
// DEV-ONLY BYPASS — localhost development shortcut
// Requires explicit development mode and is permanently disabled in production.
// ============================================================
const isDevAllowed = (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_LOGIN === 'true')
  && process.env.NODE_ENV !== 'production';

if (isDevAllowed) {
  router.post('/dev-login', authLimiter, async (req, res) => {
    try {
      const DEV_GOOGLE_ID = 'dev_local_bypass_user';
      let user = await User.findOne({ googleId: DEV_GOOGLE_ID });

      if (!user) {
        const pairCode = await generateUniquePairCode();
        user = new User({
          googleId: DEV_GOOGLE_ID,
          name: 'Dev User',
          email: 'dev@localhost.dev',
          profilePicture: '',
          pairCode,
        });
        await user.save();
      }

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
          pairId: user.pairId,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Dev login failed: ' + error.message });
    }
  });
}

module.exports = router;
