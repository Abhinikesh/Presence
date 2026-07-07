const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/spotify/login - Redirects to Spotify authorize URL
router.get('/login', auth, (req, res) => {
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  
  if (!spotifyClientId || !redirectUri) {
    return res.status(500).json({ error: 'Spotify integration is not configured on the server.' });
  }

  // Encode the user ID securely using a signed JWT with 15 minutes expiration
  const state = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

  const scopes = 'user-read-currently-playing';
  const authorizeUrl = `https://accounts.spotify.com/authorize?` + 
    `response_type=code` +
    `&client_id=${encodeURIComponent(spotifyClientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(authorizeUrl);
});

// GET /api/spotify/callback - Callback redirected by Spotify
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (error) {
    console.error('Spotify auth callback returned error:', error);
    return res.redirect(`${clientUrl}/home?spotify=error`);
  }

  if (!code || !state) {
    return res.status(400).send('Invalid callback request parameters.');
  }

  try {
    // 1. Verify the state parameter to retrieve the user's ID
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // 2. Exchange Authorization Code for Access & Refresh Tokens
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);
    params.append('client_id', process.env.SPOTIFY_CLIENT_ID);
    params.append('client_secret', process.env.SPOTIFY_CLIENT_SECRET);

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 3. Save Spotify credentials
    user.spotifyAccessToken = tokenResponse.data.access_token;
    user.spotifyRefreshToken = tokenResponse.data.refresh_token;
    user.spotifyTokenExpiresAt = new Date(Date.now() + tokenResponse.data.expires_in * 1000);
    user.spotifyConnected = true;
    await user.save();

    // Redirect to home page with success query param
    res.redirect(`${clientUrl}/home?spotify=connected`);
  } catch (err) {
    console.error('Spotify OAuth callback failed:', err.message);
    res.redirect(`${clientUrl}/home?spotify=failed`);
  }
});

// POST /api/spotify/disconnect - Disconnect Spotify connection
router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = req.user;
    user.spotifyConnected = false;
    user.spotifyAccessToken = null;
    user.spotifyRefreshToken = null;
    user.spotifyTokenExpiresAt = null;
    await user.save();
    
    res.json({ message: 'Spotify account disconnected successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Spotify: ' + err.message });
  }
});

// GET /api/spotify/status - Check connection status
router.get('/status', auth, async (req, res) => {
  try {
    res.json({ spotifyConnected: req.user.spotifyConnected });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check status: ' + err.message });
  }
});

module.exports = router;
