import { useState, useEffect, useRef, useCallback } from 'react';

export function useMusicPlayer(initialTracks = []) {
  const [tracks, setTracks] = useState(initialTracks);
  const [currentTrack, setCurrentTrack] = useState(initialTracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  // Repeat mode: 'off' | 'all' | 'one'
  const [repeatMode, setRepeatMode] = useState('all');

  const audioRef = useRef(null);
  const tracksRef = useRef(tracks);
  const currentTrackRef = useRef(currentTrack);
  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef(repeatMode);
  const isPlayingRef = useRef(isPlaying);
  const playedIndicesRef = useRef(new Set());

  // Keep refs synchronized
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load and play track helper
  const loadAndPlayTrack = useCallback((track, shouldPlay = true) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) {
      audio.pause();
      audio.src = '';
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Fully pause and reset before loading new track to avoid race conditions
    audio.pause();
    setCurrentTime(0);
    currentTrackRef.current = track;
    setCurrentTrack(track);

    if (track.fileUrl) {
      audio.src = track.fileUrl;
      audio.load();

      if (shouldPlay) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Playback prevented or aborted:', err.message);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(false);
      }
    } else {
      // Placeholder track with no audio url
      audio.src = '';
      setIsPlaying(false);
    }
  }, []);

  // Advance to next track (for end-of-track or manual skip)
  const advanceTrack = useCallback((autoTriggered = false) => {
    const currentList = tracksRef.current;
    if (!currentList || currentList.length === 0) return;

    // Single track edge case
    if (currentList.length === 1) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        if (isPlayingRef.current || autoTriggered) {
          audio.play().catch(() => {});
          setIsPlaying(true);
        }
      }
      return;
    }

    const currentIndex = currentList.findIndex((t) => t._id === currentTrackRef.current?._id);
    let nextIndex = -1;

    if (isShuffleRef.current) {
      // Pick a random unplayed track this cycle
      const unplayed = [];
      for (let i = 0; i < currentList.length; i++) {
        if (i !== currentIndex && !playedIndicesRef.current.has(i)) {
          unplayed.push(i);
        }
      }

      if (unplayed.length > 0) {
        const randomIndex = Math.floor(Math.random() * unplayed.length);
        nextIndex = unplayed[randomIndex];
        playedIndicesRef.current.add(nextIndex);
      } else {
        // All tracks played this cycle, reset cycle
        playedIndicesRef.current.clear();
        if (currentIndex >= 0) playedIndicesRef.current.add(currentIndex);
        const remaining = currentList.map((_, i) => i).filter((i) => i !== currentIndex);
        nextIndex = remaining[Math.floor(Math.random() * remaining.length)];
        playedIndicesRef.current.add(nextIndex);
      }
    } else {
      // Sequential queue
      if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        // Reached end of queue
        if (repeatModeRef.current === 'all') {
          nextIndex = 0;
        } else if (repeatModeRef.current === 'off') {
          // If auto-triggered at the end of queue and repeat is off, stop playback cleanly
          if (autoTriggered) {
            const audio = audioRef.current;
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
            }
            setIsPlaying(false);
            setCurrentTime(0);
            return;
          }
          nextIndex = 0; // If manually clicked next, loop around
        } else {
          nextIndex = 0;
        }
      }
    }

    if (nextIndex >= 0 && nextIndex < currentList.length) {
      const shouldPlay = autoTriggered ? true : isPlayingRef.current;
      loadAndPlayTrack(currentList[nextIndex], shouldPlay);
    }
  }, [loadAndPlayTrack]);

  // Previous track
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If played more than 3 seconds, restart current track from beginning
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentList = tracksRef.current;
    if (!currentList || currentList.length === 0) return;

    if (currentList.length === 1) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentIndex = currentList.findIndex((t) => t._id === currentTrackRef.current?._id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = currentList.length - 1;
    }

    loadAndPlayTrack(currentList[prevIndex], isPlayingRef.current);
  }, [loadAndPlayTrack]);

  // Toggle Play / Pause
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const track = currentTrackRef.current;
      if (!track) {
        if (tracksRef.current.length > 0) {
          loadAndPlayTrack(tracksRef.current[0], true);
        }
        return;
      }

      if (audio.src && audio.src === track.fileUrl) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Play interrupted:', err);
            setIsPlaying(false);
          });
      } else if (track.fileUrl) {
        loadAndPlayTrack(track, true);
      }
    }
  }, [isPlaying, loadAndPlayTrack]);

  // Play specific track directly
  const playTrack = useCallback((track) => {
    loadAndPlayTrack(track, true);
  }, [loadAndPlayTrack]);

  // Seek progress
  const seek = useCallback((timeSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(timeSeconds, duration || audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Toggle Shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      playedIndicesRef.current.clear();
      return next;
    });
  }, []);

  // Cycle Repeat Mode: off -> all -> one -> off
  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Queue Reordering: Move track up
  const moveUp = useCallback((index) => {
    if (index <= 0) return;
    setTracks((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(index - 1, 0, moved);
      return updated;
    });
  }, []);

  // Queue Reordering: Move track down
  const moveDown = useCallback((index) => {
    setTracks((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(index + 1, 0, moved);
      return updated;
    });
  }, []);

  // Queue Item Removal
  const removeTrack = useCallback((trackToRemove) => {
    setTracks((prev) => {
      const filtered = prev.filter((t) => t._id !== trackToRemove._id);

      // If removed track was the one currently playing, advance to next
      if (currentTrackRef.current?._id === trackToRemove._id) {
        if (filtered.length > 0) {
          const removedIndex = prev.findIndex((t) => t._id === trackToRemove._id);
          const nextIndex = removedIndex < filtered.length ? removedIndex : 0;
          loadAndPlayTrack(filtered[nextIndex], isPlayingRef.current);
        } else {
          loadAndPlayTrack(null, false);
        }
      }

      return filtered;
    });
  }, [loadAndPlayTrack]);

  // Set whole queue (e.g. from backend fetch)
  const setQueue = useCallback((newTracks) => {
    setTracks(newTracks);
    if (!currentTrackRef.current && newTracks.length > 0) {
      setCurrentTrack(newTracks[0]);
    }
  }, []);

  // Initialize single shared Audio instance and attach listeners
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (repeatModeRef.current === 'one') {
        // Repeat one track
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else {
        // Continuous playback: automatically advance and keep playing
        advanceTrack(true);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [advanceTrack]);

  // ── Media Session API & Hardware Controls Integration ──
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      const title = currentTrack.title || 'Untitled Track';
      const artist = currentTrack.artist || currentTrack.uploaderName || 'Presence Music';

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist,
          album: 'Presence Shared Songs',
          artwork: [
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="64" fill="%237C3AED"/><circle cx="200" cy="380" r="50" fill="%23FFFFFF"/><circle cx="360" cy="340" r="50" fill="%23FFFFFF"/><path d="M250 380V120l160-40v260" stroke="%23FFFFFF" stroke-width="40" fill="none"/></svg>',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        });
      } catch (_) {}
    }
  }, [currentTrack]);

  // Sync playback state with OS/lock-screen media widget
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }, [isPlaying]);

  // Sync position state with OS scrubber
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && isFinite(duration) && currentTime >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0),
          playbackRate: 1,
          position: Math.min(Math.max(currentTime, 0), duration)
        });
      } catch (_) {}
    }
  }, [currentTime, duration]);

  // Route OS hardware media keys & lock-screen actions into existing transport controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionMap = [
      ['play', () => togglePlayPause()],
      ['pause', () => togglePlayPause()],
      ['previoustrack', () => prevTrack()],
      ['nexttrack', () => advanceTrack(false)],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      }]
    ];

    actionMap.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (_) {}
    });

    return () => {
      actionMap.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (_) {}
      });
    };
  }, [togglePlayPause, prevTrack, advanceTrack, seek]);

  // ── Auto-Pause on Device Disconnect (Headphones / Bluetooth unplug) ──
  // Browser limitation note: Supported in modern Chromium, Firefox, and Safari via navigator.mediaDevices.
  // When an active audio output sink (e.g. 3.5mm jack or Bluetooth A2DP) is detached mid-playback,
  // the devicechange event fires and we pause playback to prevent loud blasting from internal speakers.
  useEffect(() => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.addEventListener !== 'function') {
      return;
    }

    const handleDeviceChange = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack: () => advanceTrack(false),
    prevTrack,
    playTrack,
    seek,
    toggleShuffle,
    cycleRepeat,
    moveUp,
    moveDown,
    removeTrack,
    setQueue
  };
}
