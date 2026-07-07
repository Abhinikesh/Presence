const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Check Authorization header or query token
    const authHeader = req.header('Authorization');
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Token missing.' });
    }
    
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Attach user and token to request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = auth;
