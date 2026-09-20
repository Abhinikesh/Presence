import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import { BACKEND_URL } from '../../config';
import { useMusicPlayer } from './useMusicPlayer';

const MusicContext = createContext(null);

const DEFAULT_SAMPLE_TRACKS = [
  {
    _id: 'sample-1',
    title: 'Andheri Raatein',
    artist: 'Rameet',
    duration: '3:08',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786386019/presence/songs/hdhppqh0jebm9swkjasp.mp3'
  },
  {
    _id: 'sample-2',
    title: 'Khuda Jaane',
    artist: 'KK, Shilpa Rao',
    duration: '4:52',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786393680/presence/songs/oikaxp6fq4najorgm9pq.mp3'
  },
  {
    _id: 'sample-3',
    title: 'Soch Na Sake',
    artist: 'Amaal Mallik, Arijit Singh',
    duration: '4:08',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786386019/presence/songs/hdhppqh0jebm9swkjasp.mp3'
  },
  {
    _id: 'sample-4',
    title: 'Tera Yaar Hoon Main',
    artist: 'Arijit Singh',
    duration: '5:01',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786393680/presence/songs/oikaxp6fq4najorgm9pq.mp3'
  }
];

export function MusicProvider({ children }) {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { showNotification } = useNotification();

  const player = useMusicPlayer(DEFAULT_SAMPLE_TRACKS);
  const {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause: playerTogglePlayPause,
    nextTrack: playerNextTrack,
    prevTrack: playerPrevTrack,
    playTrack: playerPlayTrack,
    seek: playerSeek,
    toggleShuffle: playerToggleShuffle,
    cycleRepeat: playerCycleRepeat,
    moveUp: playerMoveUp,
    moveDown: playerMoveDown,
    removeTrack: playerRemoveTrack,
    setQueue
  } = player;

  // Refs to prevent echo loops when applying incoming sync
  const isIncomingSyncRef = useRef(false);
  const lastIncomingSyncTimeRef = useRef(0);
  const partnerOnlineRef = useRef(false);
  const fallbackAdvanceTimeoutRef = useRef(null);

  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  const currentTrackRef = useRef(currentTrack);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  const isShuffleRef = useRef(isShuffle);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);

  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // Fetch shared songs from backend
  const fetchSongs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/songs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setQueue(data);
        } else if (!tracksRef.current || tracksRef.current.length === 0) {
          setQueue(DEFAULT_SAMPLE_TRACKS);
        }
      }
    } catch (err) {
      console.error('[MusicContext] Error fetching songs:', err);
    }
  }, [token, setQueue]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Request sync on initial connection or reconnect
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('music:request_sync');
    }
  }, [socket, isConnected]);

  // ── Attach Namespaced Socket Listeners for Real-time Playback Sync ──
  useEffect(() => {
    if (!socket) return;

    const handlePartnerStatus = (data) => {
      partnerOnlineRef.current = !!data?.online;
    };
    const handlePartnerOnline = () => {
      partnerOnlineRef.current = true;
      // Share current playing state if we are playing
      if (isPlayingRef.current && currentTrackRef.current) {
        socket.emit('music:sync_state', {
          track: currentTrackRef.current,
          currentTime: currentTimeRef.current,
          isPlaying: true,
          isShuffle: isShuffleRef.current,
          repeatMode: repeatModeRef.current
        });
      }
    };
    const handlePartnerOffline = () => {
      partnerOnlineRef.current = false;
    };

    const handleSyncPlay = (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();

      if (data?.track && (!currentTrackRef.current || currentTrackRef.current._id !== data.track._id)) {
        playerPlayTrack(data.track);
      } else if (!isPlayingRef.current) {
        playerTogglePlayPause();
      }

      if (typeof data?.currentTime === 'number') {
        const diff = Math.abs(currentTimeRef.current - data.currentTime);
        if (diff > 1.0) {
          playerSeek(data.currentTime);
        }
      }

      if (data?.track) {
        const sender = data.senderName || 'Your partner';
        const title = data.track.title || 'Track';
        showNotification({
          type: 'music',
          title: `🎵 ${sender} started playing`,
          message: title,
          onClick: () => {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/music')) {
              window.location.href = '/music';
            }
          }
        });
      }
    };

    const handleSyncPause = (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();

      if (isPlayingRef.current) {
        playerTogglePlayPause();
      }
      if (typeof data?.currentTime === 'number') {
        const diff = Math.abs(currentTimeRef.current - data.currentTime);
        if (diff > 1.0) {
          playerSeek(data.currentTime);
        }
      }
    };

    const handleSyncSeek = (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();
      if (typeof data?.currentTime === 'number') {
        playerSeek(data.currentTime);
      }
    };

    const handleSyncTrackChange = (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();
      clearTimeout(fallbackAdvanceTimeoutRef.current);

      if (data?.track) {
        playerPlayTrack(data.track);
        if (typeof data.currentTime === 'number' && data.currentTime > 0) {
          playerSeek(data.currentTime);
        }

        const sender = data.senderName || 'Your partner';
        const title = data.track.title || 'Track';
        showNotification({
          type: 'music',
          title: `🎵 ${sender} changed track`,
          message: title,
          onClick: () => {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/music')) {
              window.location.href = '/music';
            }
          }
        });
      }
    };

    const handleSyncQueueUpdate = (data) => {
      if (Array.isArray(data?.tracks)) {
        setQueue(data.tracks);
      }
    };

    const handleRequestSync = () => {
      // Respond with active playback snapshot without overriding song catalog
      socket.emit('music:sync_state', {
        track: currentTrackRef.current,
        currentTime: currentTimeRef.current,
        isPlaying: isPlayingRef.current,
        isShuffle: isShuffleRef.current,
        repeatMode: repeatModeRef.current
      });
    };

    const handleSyncState = (data) => {
      if (!data) return;
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();

      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        const incomingHasReal = data.tracks.some((t) => t && t._id && !String(t._id).startsWith('sample-'));
        const localHasReal = tracksRef.current && tracksRef.current.some((t) => t && t._id && !String(t._id).startsWith('sample-'));
        // Only adopt incoming queue if it has real tracks or local has no real tracks
        if (incomingHasReal || !localHasReal) {
          setQueue(data.tracks);
        }
      }
      if (data.track) {
        if (!currentTrackRef.current || currentTrackRef.current._id !== data.track._id) {
          if (data.isPlaying) {
            playerPlayTrack(data.track);
          } else {
            // Load without autoplay
            setQueue((prev) => {
              const exists = prev.find((t) => t._id === data.track._id);
              return exists ? prev : [data.track, ...prev];
            });
          }
        }
        if (typeof data.currentTime === 'number') {
          playerSeek(data.currentTime);
        }
      }
      if (data.isPlaying && !isPlayingRef.current) {
        playerTogglePlayPause();
      }
    };

    const handleSongAdded = () => {
      fetchSongs();
    };

    const handleSongDeleted = () => {
      fetchSongs();
    };

    socket.on('partner_status', handlePartnerStatus);
    socket.on('partner_online', handlePartnerOnline);
    socket.on('partner_offline', handlePartnerOffline);
    socket.on('music:sync_play', handleSyncPlay);
    socket.on('music:sync_pause', handleSyncPause);
    socket.on('music:sync_seek', handleSyncSeek);
    socket.on('music:sync_track_change', handleSyncTrackChange);
    socket.on('music:sync_queue_update', handleSyncQueueUpdate);
    socket.on('music:request_sync', handleRequestSync);
    socket.on('music:sync_state', handleSyncState);
    socket.on('song_added', handleSongAdded);
    socket.on('song_deleted', handleSongDeleted);

    return () => {
      socket.off('partner_status', handlePartnerStatus);
      socket.off('partner_online', handlePartnerOnline);
      socket.off('partner_offline', handlePartnerOffline);
      socket.off('music:sync_play', handleSyncPlay);
      socket.off('music:sync_pause', handleSyncPause);
      socket.off('music:sync_seek', handleSyncSeek);
      socket.off('music:sync_track_change', handleSyncTrackChange);
      socket.off('music:sync_queue_update', handleSyncQueueUpdate);
      socket.off('music:request_sync', handleRequestSync);
      socket.off('music:sync_state', handleSyncState);
      socket.off('song_added', handleSongAdded);
      socket.off('song_deleted', handleSongDeleted);
    };
  }, [socket, playerPlayTrack, playerTogglePlayPause, playerSeek, setQueue, fetchSongs]);

  // ── Wrapped Control Handlers that Broadcast to Partner ──
  const togglePlayPause = useCallback(() => {
    playerTogglePlayPause();
    if (!socket) return;
    if (Date.now() - lastIncomingSyncTimeRef.current < 400) return;

    if (isPlayingRef.current) {
      // Was playing, now pausing
      socket.emit('music:pause', { currentTime: currentTimeRef.current });
    } else {
      // Was paused, now playing
      socket.emit('music:play', {
        track: currentTrackRef.current,
        currentTime: currentTimeRef.current
      });
    }
  }, [playerTogglePlayPause, socket]);

  const seek = useCallback((timeSeconds) => {
    playerSeek(timeSeconds);
    if (!socket) return;
    if (Date.now() - lastIncomingSyncTimeRef.current < 400) return;
    socket.emit('music:seek', { currentTime: timeSeconds });
  }, [playerSeek, socket]);

  const playTrack = useCallback((track) => {
    playerPlayTrack(track);
    if (!socket) return;
    socket.emit('music:track_change', {
      track,
      autoPlay: true,
      currentTime: 0,
      isShuffle: isShuffleRef.current,
      repeatMode: repeatModeRef.current
    });
  }, [playerPlayTrack, socket]);

  const nextTrack = useCallback(() => {
    playerNextTrack();
    if (!socket) return;
    // Broadcast next track after state settles
    setTimeout(() => {
      socket.emit('music:track_change', {
        track: currentTrackRef.current,
        autoPlay: isPlayingRef.current,
        currentTime: 0,
        isShuffle: isShuffleRef.current,
        repeatMode: repeatModeRef.current
      });
    }, 50);
  }, [playerNextTrack, socket]);

  const prevTrack = useCallback(() => {
    playerPrevTrack();
    if (!socket) return;
    setTimeout(() => {
      socket.emit('music:track_change', {
        track: currentTrackRef.current,
        autoPlay: isPlayingRef.current,
        currentTime: 0,
        isShuffle: isShuffleRef.current,
        repeatMode: repeatModeRef.current
      });
    }, 50);
  }, [playerPrevTrack, socket]);

  const moveUp = useCallback((index) => {
    playerMoveUp(index);
    if (!socket) return;
    setTimeout(() => {
      socket.emit('music:queue_update', { tracks: tracksRef.current });
    }, 50);
  }, [playerMoveUp, socket]);

  const moveDown = useCallback((index) => {
    playerMoveDown(index);
    if (!socket) return;
    setTimeout(() => {
      socket.emit('music:queue_update', { tracks: tracksRef.current });
    }, 50);
  }, [playerMoveDown, socket]);

  const removeTrack = useCallback(async (track) => {
    if (!track) return;
    playerRemoveTrack(track);

    // If it's a real database song, delete it from backend so it doesn't reappear on reload
    if (track._id && !String(track._id).startsWith('sample-') && token) {
      try {
        await fetch(`${BACKEND_URL}/api/songs/${track._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('[MusicContext] Failed to delete song from backend:', err);
      }
    }

    if (!socket) return;
    setTimeout(() => {
      socket.emit('music:queue_update', { tracks: tracksRef.current });
    }, 50);
  }, [playerRemoveTrack, socket, token]);

  return (
    <MusicContext.Provider
      value={{
        tracks,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        isShuffle,
        repeatMode,
        togglePlayPause,
        nextTrack,
        prevTrack,
        playTrack,
        seek,
        toggleShuffle: playerToggleShuffle,
        cycleRepeat: playerCycleRepeat,
        moveUp,
        moveDown,
        removeTrack,
        setQueue,
        fetchSongs
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return ctx;
}
