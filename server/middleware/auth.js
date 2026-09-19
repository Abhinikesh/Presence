const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Header format: Bearer <token>' });
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ error: 'Server authentication configuration error.' });
    }

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // req me user aur token attach kr rhe hai
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = auth;
