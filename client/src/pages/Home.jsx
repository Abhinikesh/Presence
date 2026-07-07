import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';

function Home() {
  const { user, token, logout, setUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('');
  const [myStatus, setMyStatus] = useState('Free');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Reaction ping state
  const [activePing, setActivePing] = useState(null);
  const [sentStatus, setSentStatus] = useState({ heart: false, wave: false, thinking: false });

  // Music state
  const [songs, setSongs] = useState([]);
  const [isSongsLoading, setIsSongsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Socket connection status
  const [isConnected, setIsConnected] = useState(true);

  // Audio ref
  const audioRef = useRef(null);

  // Watch Together state
  const [ytUrl, setYtUrl] = useState('');
  const [ytError, setYtError] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('');

  // Spotify integration state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [partnerSpotifyTrack, setPartnerSpotifyTrack] = useState(null);
  const [spotifyNotification, setSpotifyNotification] = useState('');

  // Watch Together refs
  const ytPlayerRef = useRef(null);
  const isIncomingSyncRef = useRef(false);
  const lastPlayerTimeRef = useRef(0);
  const seekCheckIntervalRef = useRef(null);

  // Refs for tracking current values to avoid stale closures in Socket callbacks
  const songsRef = useRef([]);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const fetchSongs = async () => {
    if (!token) return;
    setIsSongsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/songs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSongs(data);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      setIsSongsLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    // Establish connection to Socket.IO server, passing token in handshake auth
    const socket = io(BACKEND_URL, {
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

    // Track Socket.IO connection status
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for partner's initial status on connect
    socket.on('partner_status', (data) => {
      setPartnerOnline(data.online);
      if (data.online) {
        setPartnerStatus(data.status || 'Free');
      }
    });

    // Listen for partner coming online
    socket.on('partner_online', (data) => {
      setPartnerOnline(true);
      setPartnerStatus(data?.status || 'Free');
    });

    // Listen for partner going offline
    socket.on('partner_offline', () => {
      setPartnerOnline(false);
    });

    // Listen for partner updating status
    socket.on('partner_status_update', (data) => {
      setPartnerStatus(data.status);
    });

    // Music sync listeners
    socket.on('sync_play', (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error('Audio play error:', e));
      }
    });

    socket.on('sync_pause', (data) => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (typeof data.currentTime === 'number') {
          audioRef.current.currentTime = data.currentTime;
        }
        setIsPlaying(false);
      }
    });

    socket.on('sync_seek', (data) => {
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        setCurrentTime(data.currentTime);
      }
    });

    socket.on('sync_change_song', async (data) => {
      let targetSong = songsRef.current.find(s => s._id === data.songId);
      
      // If not in state yet, pull latest list (in case partner just uploaded)
      if (!targetSong) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/songs`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const dataList = await response.json();
            setSongs(dataList);
            targetSong = dataList.find(s => s._id === data.songId);
          }
        } catch (err) {
          console.error('Error refetching songs on sync change:', err);
        }
      }

      if (targetSong) {
        setCurrentSong(targetSong);
        if (audioRef.current) {
          audioRef.current.src = `${BACKEND_URL}${targetSong.fileUrl}`;
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error('Audio play error:', e));
        }
      }
    });

    // Listen for incoming pings
    socket.on('receive_ping', (data) => {
      setActivePing({
        id: Date.now(),
        fromName: data.fromName,
        type: data.type
      });
    });

    // YouTube sync listeners
    socket.on('yt_sync_change_video', (data) => {
      isIncomingSyncRef.current = true;
      setCurrentVideoId(data.videoId);
    });

    socket.on('yt_sync_play', (data) => {
      isIncomingSyncRef.current = true;
      if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
        if (typeof data.currentTime === 'number') {
          ytPlayerRef.current.seekTo(data.currentTime, true);
          lastPlayerTimeRef.current = data.currentTime;
        }
        ytPlayerRef.current.playVideo();
      }
    });

    socket.on('yt_sync_pause', (data) => {
      isIncomingSyncRef.current = true;
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
        if (typeof data.currentTime === 'number') {
          ytPlayerRef.current.seekTo(data.currentTime, true);
          lastPlayerTimeRef.current = data.currentTime;
        }
      }
    });

    socket.on('yt_sync_seek', (data) => {
      isIncomingSyncRef.current = true;
      if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
        ytPlayerRef.current.seekTo(data.currentTime, true);
        lastPlayerTimeRef.current = data.currentTime;
      }
    });

    socket.on('partner_spotify_update', (data) => {
      setPartnerSpotifyTrack(data);
    });

    // Clean up socket connection on component unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const fetchPairStatus = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/pair/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.paired) {
            setPartnerName(data.partner.name);
          } else {
            // If not paired, redirect to pair page
            navigate('/pair');
          }
        } else {
          setError('Failed to fetch pairing status');
        }
      } catch (err) {
        setError('Network error checking status');
      }
    };

    fetchPairStatus();
  }, [token, navigate]);

  const handleStatusChange = (status) => {
    setMyStatus(status);
    if (socketRef.current) {
      socketRef.current.emit('update_status', { status });
    }
  };

  // Auto dismiss ping notification
  useEffect(() => {
    if (!activePing) return;
    const timer = setTimeout(() => {
      setActivePing(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [activePing]);

  const handleSendPing = (type) => {
    if (socketRef.current) {
      socketRef.current.emit('send_ping', { type });
      setSentStatus(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setSentStatus(prev => ({ ...prev, [type]: false }));
      }, 1000);
    }
  };

  const handleDismissPing = () => {
    setActivePing(null);
  };

  const handleUnpair = async () => {
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/pair/unpair`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Clear pairing state in local context
        if (user) {
          setUser({ ...user, pairId: null });
        }
        navigate('/pair');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to unpair');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Music handlers
  const handleSelectSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = `${BACKEND_URL}${song.fileUrl}`;
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          if (socketRef.current) {
            socketRef.current.emit('change_song', { songId: song._id });
            socketRef.current.emit('play_song', { songId: song._id, currentTime: 0 });
          }
        })
        .catch(e => console.error('Audio play error:', e));
    }
  };

  const handlePlayPause = () => {
    if (!currentSong) return;
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (socketRef.current) {
          socketRef.current.emit('pause_song', { currentTime: audioRef.current.currentTime });
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            if (socketRef.current) {
              socketRef.current.emit('play_song', { songId: currentSong._id, currentTime: audioRef.current.currentTime });
            }
          })
          .catch(e => console.error('Audio play error:', e));
      }
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      if (socketRef.current) {
        socketRef.current.emit('seek_song', { currentTime: newTime });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('song', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/songs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        await fetchSongs();
        e.target.value = null; // Reset input
      } else {
        setUploadError(data.error || 'Upload failed.');
      }
    } catch (err) {
      setUploadError('Network error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Synced YouTube Watching logic
  const extractYoutubeVideoId = (url) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    
    if (match && match[2].length === 11) {
      return match[2];
    }
    
    if (cleanUrl.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return cleanUrl;
    }
    
    return null;
  };

  const startSeekCheck = () => {
    stopSeekCheck();
    if (!ytPlayerRef.current) return;
    
    lastPlayerTimeRef.current = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
    
    seekCheckIntervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !player.getCurrentTime) return;

      const currentTime = player.getCurrentTime();
      const state = player.getPlayerState ? player.getPlayerState() : -1;

      if (state === 1) { // 1 = window.YT.PlayerState.PLAYING
        const timeDiff = currentTime - lastPlayerTimeRef.current;
        if (timeDiff < -0.5 || timeDiff > 3.5) {
          if (!isIncomingSyncRef.current) {
            if (socketRef.current) {
              socketRef.current.emit('yt_seek', { currentTime });
            }
          }
        }
      }
      lastPlayerTimeRef.current = currentTime;
    }, 2000);
  };

  const stopSeekCheck = () => {
    if (seekCheckIntervalRef.current) {
      clearInterval(seekCheckIntervalRef.current);
      seekCheckIntervalRef.current = null;
    }
  };

  const onPlayerReady = () => {
    // Player loaded and ready
  };

  const onPlayerStateChange = (event) => {
    const state = event.data;
    const player = ytPlayerRef.current;
    if (!player) return;

    const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;

    if (isIncomingSyncRef.current) {
      isIncomingSyncRef.current = false;
      if (state === 1) {
        startSeekCheck();
      } else {
        stopSeekCheck();
      }
      return;
    }

    if (state === 1) { // PLAYING
      if (socketRef.current) {
        socketRef.current.emit('yt_play', { currentTime });
      }
      startSeekCheck();
    } else if (state === 2) { // PAUSED
      if (socketRef.current) {
        socketRef.current.emit('yt_pause', { currentTime });
      }
      stopSeekCheck();
    }
  };

  const handleLoadYtVideo = (e) => {
    e.preventDefault();
    setYtError('');
    
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) {
      setYtError('Please enter a valid YouTube URL');
      return;
    }

    setCurrentVideoId(videoId);
    
    if (socketRef.current) {
      socketRef.current.emit('yt_change_video', { videoId });
    }
  };

  // Dynamically load YouTube IFrame API script once on mount
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize and clean up player instance when currentVideoId changes
  useEffect(() => {
    if (!currentVideoId) return;

    let playerInstance = null;

    const initPlayer = () => {
      const playerContainer = document.getElementById('youtube-player');
      if (!playerContainer) return;

      playerInstance = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: currentVideoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange
        }
      });
      ytPlayerRef.current = playerInstance;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };
    }

    return () => {
      if (playerInstance && playerInstance.destroy) {
        playerInstance.destroy();
        ytPlayerRef.current = null;
      }
      stopSeekCheck();
    };
  }, [currentVideoId]);

  // Spotify integration handlers and effects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyStatus = params.get('spotify');
    if (spotifyStatus === 'connected') {
      setSpotifyNotification('Spotify connected successfully!');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      setTimeout(() => {
        setSpotifyNotification('');
      }, 4000);
    } else if (spotifyStatus === 'error' || spotifyStatus === 'failed') {
      setError('Failed to connect Spotify account.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const fetchSpotifyStatus = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/spotify/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSpotifyConnected(data.spotifyConnected);
      }
    } catch (err) {
      console.error('Error fetching Spotify status:', err);
    }
  };

  useEffect(() => {
    fetchSpotifyStatus();
  }, [token]);

  const handleSpotifyConnect = () => {
    window.location.href = `${BACKEND_URL}/api/spotify/login?token=${token}`;
  };

  const handleSpotifyDisconnect = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/spotify/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSpotifyConnected(false);
      } else {
        setError('Failed to disconnect Spotify account.');
      }
    } catch (err) {
      setError('Network error disconnecting Spotify.');
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!user) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading...</div>;
  }

  return (
    <div className="page-top">
      {/* Reconnecting banner */}
      {!isConnected && (
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            zIndex: 1100,
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FCD34D',
            color: '#D97706',
            fontSize: '0.875rem',
            fontWeight: '600',
            padding: '8px',
            textAlign: 'center'
          }}
        >
          Reconnecting...
        </div>
      )}
      
      {/* Spotify success banner */}
      {spotifyNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderLeft: '4px solid #10B981',
            color: '#065F46',
            fontSize: '0.875rem',
            fontWeight: '600',
            padding: '12px 24px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {spotifyNotification}
        </div>
      )}

      {/* Sliding notification banner */}
      {activePing && (
        <div
          onClick={handleDismissPing}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '360px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderLeft: '4px solid #2563EB',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111111' }}>
            {activePing.fromName} sent you {
              activePing.type === 'heart' ? 'a heart' :
              activePing.type === 'wave' ? 'a wave' : 'a thinking of you'
            }
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: '12px' }}>Dismiss</span>
        </div>
      )}
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Main Status & Pairing Card */}
      <div className="card card-left">
        <h2>Presence</h2>
        {error && <div className="error-box">Error: {error}</div>}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: '500', color: 'var(--text-primary)' }}>
            Connected with <strong style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{partnerName || 'Loading partner...'}</strong>
          </span>
          <div className="status-indicator">
            <div className={`dot ${partnerOnline ? 'dot-online' : 'dot-offline'}`} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {partnerOnline ? `Online — ${partnerStatus}` : 'Offline'}
            </span>
          </div>
        </div>

        {partnerOnline && partnerSpotifyTrack && partnerSpotifyTrack.isPlaying && (
          <div style={{ 
            marginTop: '-12px', 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#FAF9F7',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            width: 'fit-content'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Now playing: <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontStyle: 'italic' }}>{partnerSpotifyTrack.songName}</span> — <span style={{ fontStyle: 'italic' }}>{partnerSpotifyTrack.artistName}</span>
            </span>
          </div>
        )}

        <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          You: <strong style={{ color: 'var(--text-primary)' }}>{myStatus}</strong>
        </p>

        <div className="btn-group mb-4">
          {['Free', 'Studying', 'Sleeping', 'Listening'].map((status) => {
            const isSelected = myStatus === status;
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`btn-group-item ${isSelected ? 'selected' : ''}`}
              >
                {status}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '32px' }}>
          Quick Signals:
        </p>
        <div className="ping-group">
          <button
            onClick={() => handleSendPing('heart')}
            className="btn btn-ping-heart"
          >
            {sentStatus.heart ? 'Sent!' : 'Send Heart'}
          </button>
          <button
            onClick={() => handleSendPing('wave')}
            className="btn btn-ping-wave"
          >
            {sentStatus.wave ? 'Sent!' : 'Send Wave'}
          </button>
          <button
            onClick={() => handleSendPing('thinking')}
            className="btn btn-ping-thinking"
          >
            {sentStatus.thinking ? 'Sent!' : 'Send Thinking of You'}
          </button>
        </div>

        {/* Spotify Connection Panel */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '20px', 
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Spotify Integration</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {spotifyConnected ? 'Spotify is connected' : 'Connect to show what you are playing'}
            </p>
          </div>
          {spotifyConnected ? (
            <button 
              onClick={handleSpotifyDisconnect} 
              className="btn" 
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', color: '#EF4444', borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }}
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={handleSpotifyConnect} 
              className="btn btn-primary" 
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
            >
              Connect
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '36px', justifyContent: 'center' }}>
          <button 
            onClick={handleUnpair} 
            className="btn"
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)' 
            }}
          >
            Unpair
          </button>
          <button 
            onClick={handleLogout} 
            className="btn"
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)' 
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Music Card */}
      <div className="card card-left">
        <h2>Music</h2>
        
        {/* Upload Form */}
        <div className="form-group mt-3">
          <label className="form-label">Upload Song (MP3/WAV, max 15MB)</label>
          {isUploading ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Uploading...</div>
          ) : (
            <input
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={handleFileUpload}
              className="input-text"
            />
          )}
          {uploadError && <div style={{ color: '#EF4444', fontSize: '0.875rem', marginTop: '4px' }}>{uploadError}</div>}
        </div>

        {/* Songs List */}
        <div style={{ marginTop: '24px' }}>
          <h3 className="mb-2">Shared Songs</h3>
          {isSongsLoading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading songs...</p>
          ) : songs.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No songs uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {songs.map((song) => {
                const isSelected = currentSong && currentSong._id === song._id;
                return (
                  <div
                    key={song._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: isSelected ? '#F3F4F6' : 'white'
                    }}
                  >
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? '600' : '400',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '220px',
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)'
                    }}>
                      {song.title}
                    </span>
                    <button
                      onClick={() => handleSelectSong(song)}
                      className="btn"
                      style={{
                        width: 'auto',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        backgroundColor: isSelected ? 'var(--accent-color)' : 'white',
                        color: isSelected ? 'white' : 'black',
                        borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)'
                      }}
                    >
                      {isSelected && isPlaying ? 'Playing' : 'Play'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Audio Controller Panel */}
        {currentSong && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            backgroundColor: '#FAFAFA'
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Now Playing</p>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
              {currentSong.title}
            </h4>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime || 0}
              onChange={handleSeek}
              style={{
                width: '100%',
                margin: '8px 0',
                cursor: 'pointer',
                accentColor: 'var(--accent-color)'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              <span>{formatTime(currentTime)}</span>
              <span style={{ marginLeft: 'auto' }}>{formatTime(duration)}</span>
            </div>

            <button
              onClick={handlePlayPause}
              className="btn btn-primary"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        )}
      </div>

      {/* Watch Together Card */}
      <div className="card card-left">
        <h2>Watch Together</h2>
        
        {/* URL Input Form */}
        <form onSubmit={handleLoadYtVideo} style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label className="form-label">YouTube Link or Video ID</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Paste link here..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="input-text"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                Load
              </button>
            </div>
            {ytError && (
              <div style={{ color: '#EF4444', fontSize: '0.875rem', marginTop: '4px' }}>
                {ytError}
              </div>
            )}
          </div>
        </form>

        {/* Player Container */}
        {currentVideoId ? (
          <div className="youtube-container" style={{ marginTop: '20px' }}>
            <div id="youtube-player"></div>
          </div>
        ) : (
          <div style={{ 
            marginTop: '20px', 
            padding: '40px 20px', 
            textAlign: 'center', 
            border: '1px dashed var(--border-color)', 
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem'
          }}>
            No video loaded. Enter a YouTube link above to start watching together.
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
