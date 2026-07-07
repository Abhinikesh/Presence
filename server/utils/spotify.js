const axios = require('axios');

/**
 * Retrieves the currently playing track for a Spotify-connected user.
 * Automatically refreshes access tokens if expired.
 * Returns null if nothing is playing or if the user is disconnected.
 */
async function getCurrentlyPlaying(user) {
  if (!user || !user.spotifyConnected || !user.spotifyRefreshToken) {
    return null;
  }

  // 1. Check if token is expired or close to expiry (within 60 seconds)
  const isExpired = !user.spotifyTokenExpiresAt || 
    (new Date(user.spotifyTokenExpiresAt).getTime() - Date.now() < 60000);

  if (isExpired) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', user.spotifyRefreshToken);
      params.append('client_id', process.env.SPOTIFY_CLIENT_ID);
      params.append('client_secret', process.env.SPOTIFY_CLIENT_SECRET);

      const response = await axios.post('https://accounts.spotify.com/api/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      user.spotifyAccessToken = response.data.access_token;
      if (response.data.refresh_token) {
        user.spotifyRefreshToken = response.data.refresh_token;
      }
      user.spotifyTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      await user.save();
    } catch (err) {
      console.error(`Error refreshing Spotify token for user ${user._id}:`, err.message);
      // Disconnect if credentials are bad
      if (err.response && (err.response.status === 400 || err.response.status === 401)) {
        user.spotifyConnected = false;
        user.spotifyAccessToken = null;
        user.spotifyRefreshToken = null;
        user.spotifyTokenExpiresAt = null;
        await user.save();
      }
      return null;
    }
  }

  // 2. Query Spotify API
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${user.spotifyAccessToken}`
      }
    });

    // 204 No Content means nothing is playing
    if (response.status === 204 || !response.data || !response.data.item) {
      return null;
    }

    const { item, is_playing } = response.data;
    const songName = item.name;
    const artistName = item.artists.map(a => a.name).join(', ');

    return {
      songName,
      artistName,
      isPlaying: is_playing
    };
  } catch (err) {
    // If the access token is invalid/revoked (e.g. 401), we also log and return null
    console.error(`Error fetching Spotify playing status for user ${user._id}:`, err.message);
    return null;
  }
}

module.exports = { getCurrentlyPlaying };
