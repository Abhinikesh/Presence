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

  // Geolocation Distance Sync states
  const [shareLocation, setShareLocation] = useState(false);
  const [distanceApart, setDistanceApart] = useState(null);
  const watchIdRef = useRef(null);

  // Leave-behind note states
  const [noteMessage, setNoteMessage] = useState('');
  const [noteTriggerStatus, setNoteTriggerStatus] = useState('Free');
  const [activeNote, setActiveNote] = useState(null);
  const [noteFeedback, setNoteFeedback] = useState('');

  // Study Room States
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [focusCompletionMsg, setFocusCompletionMsg] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const timerIntervalRef = useRef(null);
  const durationMinutesRef = useRef(25);
  
  // Tic-Tac-Toe Game State
  const [gameState, setGameState] = useState(null);

  // Whiteboard States & Refs
  const [brushColor, setBrushColor] = useState('#1A1A1A');
  const [brushWidth, setBrushWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const prevCoordsRef = useRef({ x: 0, y: 0 });

  // Icebreaker states
  const [icebreakerPrompt, setIcebreakerPrompt] = useState(null);
  const [icebreakerChoice, setIcebreakerChoice] = useState(null);
  const [icebreakerStatus, setIcebreakerStatus] = useState('idle');
  const [icebreakerRevealData, setIcebreakerRevealData] = useState(null);

  // Persistence State & Refs
  const [partnerId, setPartnerId] = useState('');
  const partnerIdRef = useRef('');
  useEffect(() => {
    partnerIdRef.current = partnerId;
  }, [partnerId]);
  const [scores, setScores] = useState({ me: 0, partner: 0, draws: 0 });
  useEffect(() => {
    durationMinutesRef.current = durationMinutes;
  }, [durationMinutes]);

  // Watch Together refs
  const ytPlayerRef = useRef(null);
  const isIncomingSyncRef = useRef(false);
  const lastPlayerTimeRef = useRef(0);
  const seekCheckIntervalRef = useRef(null);
  const lastIncomingSyncTimeRef = useRef(0);

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
      lastIncomingSyncTimeRef.current = Date.now();
      if (ytPlayerRef.current) {
        const localTime = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
        const diff = Math.abs(localTime - data.currentTime);
        
        if (diff > 1.5 && ytPlayerRef.current.seekTo) {
          ytPlayerRef.current.seekTo(data.currentTime, true);
          lastPlayerTimeRef.current = data.currentTime;
        }
        
        if (ytPlayerRef.current.playVideo) {
          ytPlayerRef.current.playVideo();
        }
      }
    });

    socket.on('yt_sync_pause', (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();
      if (ytPlayerRef.current) {
        const localTime = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
        const diff = Math.abs(localTime - data.currentTime);
        
        if (diff > 1.5 && ytPlayerRef.current.seekTo) {
          ytPlayerRef.current.seekTo(data.currentTime, true);
          lastPlayerTimeRef.current = data.currentTime;
        }
        
        if (ytPlayerRef.current.pauseVideo) {
          ytPlayerRef.current.pauseVideo();
        }
      }
    });

    socket.on('yt_sync_seek', (data) => {
      isIncomingSyncRef.current = true;
      lastIncomingSyncTimeRef.current = Date.now();
      if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
        ytPlayerRef.current.seekTo(data.currentTime, true);
        lastPlayerTimeRef.current = data.currentTime;
      }
    });

    socket.on('distance_update', (data) => {
      if (data && typeof data.distanceKm === 'number') {
        setDistanceApart(`${data.distanceKm} km apart`);
      } else {
        setDistanceApart(null);
      }
    });

    socket.on('note_delivered', (data) => {
      if (data && data.message) {
        setActiveNote(data);
      }
    });

    socket.on('timer_sync_start', (data) => {
      const { durationMinutes: dMins, startedAt } = data;
      const elapsedMs = Date.now() - startedAt;
      const elapsedSecs = Math.floor(elapsedMs / 1000);
      const totalSecs = dMins * 60;
      const remaining = Math.max(0, totalSecs - elapsedSecs);

      setDurationMinutes(dMins);
      setRemainingSeconds(remaining);
      setFocusCompletionMsg('');

      if (remaining > 0) {
        setTimerActive(true);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              setTimerActive(false);
              setFocusCompletionMsg(`Session complete! You both focused for ${dMins} minutes`);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setTimerActive(false);
        setFocusCompletionMsg(`Session complete! You both focused for ${dMins} minutes`);
      }
    });

    socket.on('timer_sync_pause', (data) => {
      setTimerActive(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRemainingSeconds(data.remainingSeconds);
    });

    socket.on('timer_sync_reset', () => {
      setTimerActive(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRemainingSeconds(durationMinutesRef.current * 60);
      setFocusCompletionMsg('');
    });

    socket.on('task_created', (task) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === task._id)) return prev;
        return [...prev, task];
      });
    });

    socket.on('task_updated', (task) => {
      setTasks((prev) => prev.map((t) => t._id === task._id ? task : t));
    });

    socket.on('task_deleted', (data) => {
      setTasks((prev) => prev.filter((t) => t._id !== data.id));
    });

    socket.on('game_state_update', (game) => {
      setGameState(game);
      if (game && (game.status === 'won' || game.status === 'draw')) {
        fetchPairState(partnerIdRef.current);
      }
    });

    socket.on('canvas_sync_draw', (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(data.prevX * canvas.width, data.prevY * canvas.height);
      ctx.lineTo(data.x * canvas.width, data.y * canvas.height);
      ctx.stroke();
      ctx.closePath();
    });

    socket.on('canvas_sync_clear', () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    socket.on('icebreaker_new_prompt', (data) => {
      setIcebreakerPrompt(data);
      setIcebreakerChoice(null);
      setIcebreakerStatus('playing');
      setIcebreakerRevealData(null);
    });

    socket.on('icebreaker_waiting', () => {
      setIcebreakerStatus('waiting');
    });

    socket.on('icebreaker_reveal', (data) => {
      setIcebreakerRevealData(data);
      setIcebreakerStatus('reveal');
    });

    // Clean up socket connection on component unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const fetchPendingNote = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/notes/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.message) {
          setActiveNote(data);
        }
      }
    } catch (err) {
      console.error('Error fetching pending note:', err);
    }
  };

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleLeaveNote = async (e) => {
    e.preventDefault();
    setNoteFeedback('');
    
    if (!noteMessage.trim()) {
      setError('Please enter a note message');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: noteMessage.trim(),
          triggerStatus: noteTriggerStatus
        })
      });

      const data = await response.json();
      if (response.ok) {
        setNoteFeedback(`Note will show when they're ${noteTriggerStatus}`);
        setNoteMessage('');
        setTimeout(() => {
          setNoteFeedback('');
        }, 4000);
      } else {
        setError(data.error || 'Failed to leave note');
      }
    } catch (err) {
      setError('Network error leaving note.');
    }
  };

  const replayStrokes = (strokes) => {
    const canvas = canvasRef.current;
    if (!canvas || !strokes || !Array.isArray(strokes)) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.prevX * canvas.width, stroke.prevY * canvas.height);
      ctx.lineTo(stroke.x * canvas.width, stroke.y * canvas.height);
      ctx.stroke();
      ctx.closePath();
    });
  };

  const fetchPairState = async (pId = partnerId) => {
    if (!token || !pId) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/pair-state`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();

        // 1. Restore Whiteboard
        if (data.whiteboardData) {
          try {
            const strokes = JSON.parse(data.whiteboardData);
            if (Array.isArray(strokes)) {
              setTimeout(() => replayStrokes(strokes), 100);
            }
          } catch (e) {
            console.error('Error parsing whiteboard data:', e);
          }
        }

        // 2. Restore Scores
        if (data.ticTacToeScore) {
          const { user1Wins, user2Wins, draws } = data.ticTacToeScore;
          const myId = String(user._id);
          if (myId < pId) {
            setScores({ me: user1Wins, partner: user2Wins, draws });
          } else {
            setScores({ me: user2Wins, partner: user1Wins, draws });
          }
        }

        // 3. Restore Timer
        if (data.studyTimer) {
          const { isRunning, remainingSeconds: savedRemaining, durationMinutes: savedDuration } = data.studyTimer;
          setDurationMinutes(savedDuration);
          durationMinutesRef.current = savedDuration;

          if (isRunning) {
            const elapsed = Math.floor((Date.now() - new Date(data.updatedAt).getTime()) / 1000);
            const remaining = Math.max(0, savedRemaining - elapsed);
            setRemainingSeconds(remaining);
            
            if (remaining > 0) {
              setTimerActive(true);
              if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                  if (prev <= 1) {
                    clearInterval(timerIntervalRef.current);
                    setTimerActive(false);
                    setFocusCompletionMsg(`Session complete! You both focused for ${savedDuration} minutes`);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            } else {
              setTimerActive(false);
              setFocusCompletionMsg(`Session complete! You both focused for ${savedDuration} minutes`);
            }
          } else {
            setRemainingSeconds(savedRemaining);
            setTimerActive(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching pair state:', err);
    }
  };

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
            setPartnerId(data.partner.id);
            fetchPendingNote();
            fetchTasks();
            fetchPairState(data.partner.id);
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
        // Skip check if we recently processed an incoming sync command (1.5s cooldown)
        const elapsedSinceSync = Date.now() - lastIncomingSyncTimeRef.current;
        if (elapsedSinceSync < 1500) {
          lastPlayerTimeRef.current = currentTime;
          return;
        }

        const timeDiff = currentTime - lastPlayerTimeRef.current;
        // Expected delta is ~3s. Only trigger if difference is > 2s (i.e. delta < 1s or > 5s)
        if (timeDiff < 1.0 || timeDiff > 5.0) {
          if (!isIncomingSyncRef.current) {
            if (socketRef.current) {
              socketRef.current.emit('yt_seek', { currentTime });
            }
          }
        }
      }
      lastPlayerTimeRef.current = currentTime;
    }, 3000);
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

    // If player already exists, just load the video ID (preventing destroy & recreate)
    if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
      const currentUrl = ytPlayerRef.current.getVideoUrl ? ytPlayerRef.current.getVideoUrl() : '';
      if (!currentUrl.includes(currentVideoId)) {
        isIncomingSyncRef.current = true;
        ytPlayerRef.current.loadVideoById(currentVideoId);
      }
      return;
    }

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
  }, [currentVideoId]);

  // Clean up player on unmount
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      stopSeekCheck();
    };
  }, []);

  // Geolocation Distance Sync handlers and effects
  const handleToggleLocation = () => {
    if (shareLocation) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setShareLocation(false);
      setDistanceApart(null);
      if (socketRef.current) {
        socketRef.current.emit('update_location', null);
      }
    } else {
      setShareLocation(true);
      setDistanceApart(null);
      
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        setShareLocation(false);
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (socketRef.current) {
            socketRef.current.emit('update_location', { latitude, longitude });
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          if (err.code === err.PERMISSION_DENIED) {
            setError('Location access denied. Please enable location permissions in your browser settings.');
          } else {
            setError('Unable to retrieve location.');
          }
          setShareLocation(false);
          if (socketRef.current) {
            socketRef.current.emit('update_location', null);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
      watchIdRef.current = watchId;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Study Room Timer Handlers
  const handleTimerStart = (duration = durationMinutes) => {
    const totalSeconds = duration * 60;
    setRemainingSeconds(totalSeconds);
    setTimerActive(true);
    setFocusCompletionMsg('');

    const startedAt = Date.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setTimerActive(false);
          setFocusCompletionMsg(`Session complete! You both focused for ${duration} minutes`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (socketRef.current) {
      socketRef.current.emit('timer_start', { durationMinutes: duration, startedAt });
    }
  };

  const handleTimerPause = () => {
    setTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.emit('timer_pause', { remainingSeconds });
    }
  };

  const handleTimerReset = () => {
    setTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setRemainingSeconds(durationMinutes * 60);
    setFocusCompletionMsg('');
    if (socketRef.current) {
      socketRef.current.emit('timer_reset');
    }
  };

  const handlePresetChange = (minutes) => {
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setFocusCompletionMsg('');
    if (timerActive) {
      handleTimerStart(minutes);
    }
  };

  // Shared Task List Handlers
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newTaskText.trim() })
      });

      if (response.ok) {
        const task = await response.json();
        setTasks((prev) => [...prev, task]);
        setNewTaskText('');
      } else {
        setError('Failed to create task');
      }
    } catch (err) {
      setError('Network error creating task.');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) => prev.map((t) => t._id === taskId ? updatedTask : t));
      } else {
        setError('Failed to toggle task');
      }
    } catch (err) {
      setError('Network error updating task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      } else {
        setError('Failed to delete task');
      }
    } catch (err) {
      setError('Network error deleting task.');
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Tic-Tac-Toe Game Handlers
  const handleStartGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('game_start_tictactoe');
    }
  };

  const handleMakeMove = (cellIndex) => {
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.turnUserId !== user._id) return;
    if (gameState.board[cellIndex] !== null) return;

    if (socketRef.current) {
      socketRef.current.emit('game_make_move', { cellIndex });
    }
  };

  const handleResetGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('game_reset_tictactoe');
    }
  };

  // Whiteboard Canvas handlers
  const drawLine = (x1, y1, x2, y2, color, lineWidth, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
    ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
    ctx.stroke();
    ctx.closePath();

    if (emit && socketRef.current) {
      socketRef.current.emit('canvas_draw', {
        x: x2,
        y: y2,
        prevX: x1,
        prevY: y1,
        color,
        lineWidth
      });
    }
  };

  const handleStartDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches) {
      e.preventDefault();
    }
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    setIsDrawing(true);
    prevCoordsRef.current = { x, y };
  };

  const handleDrawing = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches) {
      e.preventDefault();
    }

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const dx = x - prevCoordsRef.current.x;
    const dy = y - prevCoordsRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return;

    drawLine(prevCoordsRef.current.x, prevCoordsRef.current.y, x, y, brushColor, brushWidth, true);
    prevCoordsRef.current = { x, y };
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (socketRef.current) {
      socketRef.current.emit('canvas_clear');
    }
  };

  // Icebreaker click handlers
  const handleStartIcebreaker = () => {
    if (socketRef.current) {
      socketRef.current.emit('icebreaker_start');
    }
  };

  const handleIcebreakerAnswer = (choice) => {
    setIcebreakerChoice(choice);
    if (socketRef.current) {
      socketRef.current.emit('icebreaker_answer', { choice });
    }
  };

  const handleNextIcebreaker = () => {
    if (socketRef.current) {
      socketRef.current.emit('icebreaker_next');
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

  // Tilt card handlers — max 5° rotation, driven via CSS custom properties
  const handleTiltMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 5;
    const rotateX = -((y - centerY) / centerY) * 5;
    card.style.setProperty('--tiltX', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--tiltY', `${rotateY.toFixed(2)}deg`);
  };

  const handleTiltLeave = (e) => {
    const card = e.currentTarget;
    card.classList.add('tilt-reset');
    card.style.setProperty('--tiltX', '0deg');
    card.style.setProperty('--tiltY', '0deg');
    setTimeout(() => card.classList.remove('tilt-reset'), 500);
  };

  return (
    <div className="home-wrapper">
      {/* Grain texture overlay for premium tactile depth */}
      <div className="bg-grain" />

      {/* Background Blobs — 5-layer depth system */}
      <div className="bg-blobs-premium">
        <div className="blob-coral" />
        <div className="blob-purple" />
        <div className="blob-yellow" />
        <div className="blob-teal" />
        <div className="blob-rose" />
      </div>

      {/* Leave-behind Note Modal Overlay */}
      {activeNote && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            textAlign: 'center',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: '#FAF0E6',
              color: 'var(--accent-color)',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px'
            }}>
              Received Note
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Note from {activeNote.fromName}
            </h3>
            <p style={{ 
              fontSize: '0.925rem', 
              lineHeight: '1.6', 
              color: 'var(--text-primary)', 
              backgroundColor: '#FAF9F7', 
              padding: '16px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-color)',
              marginBottom: '20px', 
              fontStyle: 'italic',
              wordBreak: 'break-word'
            }}>
              "{activeNote.message}"
            </p>
            <button
              onClick={() => setActiveNote(null)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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

      {/* Sticky Top Navigation Bar */}
      <nav className="home-nav">
        <div className="home-nav-container">
          <div className="nav-logo">
            Presence <span className="nav-logo-dot" />
          </div>
          <div className="partner-status-compact">
            <span className={`dot ${partnerOnline ? 'dot-online' : 'dot-offline'}`} />
            <span>
              {partnerName || 'Partner'}: {partnerOnline ? partnerStatus || 'Free' : 'Offline'}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout-compact">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="home-content-container">
        
        {/* HeroGreeting / Summary strip */}
        <div className="home-hero-strip">
          <h1 className="hero-greeting">
            Hey {user.name.split(' ')[0] || user.name}, <span className="partner-name">{partnerName || 'your partner'}</span> is {partnerOnline ? partnerStatus || 'Free' : 'Offline'} 🌙
          </h1>
          <div className="hero-distance-line">
            {partnerOnline && distanceApart && (
              <>
                <span>📍 {distanceApart}</span>
                <span>•</span>
              </>
            )}
            <span>Socket: {isConnected ? 'Connected 🟢' : 'Disconnected 🔴'}</span>
          </div>
        </div>

        {/* Quick Actions Zone */}
        <div className="quick-actions-strip">
          {/* Left Panel: Status Selectors */}
          <div className="quick-actions-panel" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Your Status</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              You are currently: <strong style={{ color: 'var(--text-primary)' }}>{myStatus}</strong>
            </p>
            
            <div className="btn-group" style={{ margin: '0 0 20px 0', gap: '8px' }}>
              {['Free', 'Studying', 'Sleeping', 'Listening'].map((status) => {
                const isSelected = myStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`btn-group-item ${isSelected ? 'selected' : ''}`}
                    style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Share Location</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Only distance is calculated and shared
                </p>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={shareLocation} 
                  onChange={handleToggleLocation} 
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: shareLocation ? 'var(--accent-color)' : '#ccc',
                  transition: '0.4s',
                  borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px', width: '18px',
                    left: shareLocation ? '22px' : '4px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.4s',
                    borderRadius: '50%'
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button 
                onClick={handleUnpair} 
                className="btn"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  width: 'auto'
                }}
              >
                Unpair Partner
              </button>
            </div>
          </div>

          {/* Right Panel: Send Signal / Leave Note */}
          <div className="quick-actions-panel" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Interact</h3>
            
            <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Quick Signals:
            </p>
            <div className="ping-group" style={{ marginBottom: '20px' }}>
              <button onClick={() => handleSendPing('heart')} className="btn btn-ping-heart">
                {sentStatus.heart ? 'Sent!' : 'Send Heart ❤️'}
              </button>
              <button onClick={() => handleSendPing('wave')} className="btn btn-ping-wave">
                {sentStatus.wave ? 'Sent!' : 'Send Wave 👋'}
              </button>
              <button onClick={() => handleSendPing('thinking')} className="btn btn-ping-thinking">
                {sentStatus.thinking ? 'Sent!' : 'Send Think 💭'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <form onSubmit={handleLeaveNote}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                    Leave a note for next status change:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      maxLength="300"
                      placeholder="Type a note... (e.g. Wake up!)"
                      value={noteMessage}
                      onChange={(e) => setNoteMessage(e.target.value)}
                      className="input-text"
                      style={{ flex: 1, padding: '8px 12px' }}
                    />
                    <select
                      value={noteTriggerStatus}
                      onChange={(e) => setNoteTriggerStatus(e.target.value)}
                      className="input-text"
                      style={{ width: '120px', padding: '8px 12px' }}
                    >
                      <option value="Free">Free</option>
                      <option value="Studying">Studying</option>
                      <option value="Sleeping">Sleeping</option>
                      <option value="Listening">Listening</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8125rem', width: 'auto' }}>
                  Leave Note
                </button>
                
                {noteFeedback && (
                  <div style={{ 
                    color: '#065F46', 
                    backgroundColor: '#ECFDF5', 
                    border: '1px solid #A7F3D0',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem', 
                    marginTop: '8px',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    {noteFeedback}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="dashboard-grid">
          {/* Study Room Card */}
          <div className="feature-card card-accent-study" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Study Room <span style={{ fontSize: '0.75rem', color: '#4A90E2', fontWeight: 'bold', textTransform: 'uppercase' }}>Focus Zone</span></h2>
            
            {/* Pomodoro Timer display */}
            <div style={{ 
              textAlign: 'center', 
              margin: '16px 0', 
              backgroundColor: '#FAF9F7', 
              borderRadius: 'var(--radius)', 
              border: '1px solid var(--border-color)',
              padding: '20px 16px'
            }}>
              {/* Preset Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handlePresetChange(mins)}
                    className="btn"
                    style={{
                      width: 'auto',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: durationMinutes === mins ? 'var(--accent-color)' : 'transparent',
                      color: durationMinutes === mins ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderColor: durationMinutes === mins ? 'var(--accent-color)' : 'var(--border-color)'
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Large timer numbers */}
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: '700', 
                fontFamily: 'monospace', 
                letterSpacing: '0.05em',
                color: timerActive ? 'var(--accent-color)' : 'var(--text-primary)',
                margin: '8px 0'
              }}>
                {formatTime(remainingSeconds)}
              </div>

              {/* Start / Pause / Reset controls */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                {!timerActive ? (
                  <button 
                    onClick={() => handleTimerStart()} 
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
                  >
                    Start
                  </button>
                ) : (
                  <button 
                    onClick={handleTimerPause} 
                    className="btn"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem', border: '1px solid var(--border-color)' }}
                  >
                    Pause
                  </button>
                )}
                <button 
                  onClick={handleTimerReset} 
                  className="btn"
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem', border: '1px solid var(--border-color)' }}
                >
                  Reset
                </button>
              </div>

              {/* Focus completion message */}
              {focusCompletionMsg && (
                <div style={{ 
                  color: '#065F46', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  marginTop: '16px' 
                }}>
                  {focusCompletionMsg}
                </div>
              )}
            </div>

            {/* Shared Task List */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Shared Task List
              </h3>

              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Add a study goal..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="input-text"
                  style={{ flex: 1, padding: '8px 12px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
                  Add
                </button>
              </form>

              {/* Tasks checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {tasks.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', padding: '12px 0' }}>
                    No tasks added yet. Keep each other motivated!
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div 
                      key={task._id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#FAF9F7',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task._id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                        />
                        <span style={{ 
                          fontSize: '0.8125rem', 
                          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          wordBreak: 'break-all'
                        }}>
                          {task.text}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Games Card */}
          <div className="feature-card card-accent-games" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Games <span style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>Play Time</span></h2>
            
            <div style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Tic-Tac-Toe
              </h3>

              {/* Scoreboard */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F5F3FF',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                marginBottom: '16px',
                border: '1px solid #DDD6FE',
                fontSize: '0.8125rem',
                fontWeight: '600',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#7C3AED', fontSize: '1.1rem', fontWeight: '800' }}>{scores.me}</div>
                  <div style={{ color: '#6B7280', fontWeight: '500' }}>You</div>
                </div>
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontWeight: '500' }}>— Score —</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#EC4899', fontSize: '1.1rem', fontWeight: '800' }}>{scores.draws}</div>
                  <div style={{ color: '#6B7280', fontWeight: '500' }}>Draws</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#F59E0B', fontSize: '1.1rem', fontWeight: '800' }}>{scores.partner}</div>
                  <div style={{ color: '#6B7280', fontWeight: '500' }}>{partnerName || 'Partner'}</div>
                </div>
              </div>

              {!gameState ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Play a quick game of Tic-Tac-Toe with your partner!
                  </p>
                  <button 
                    onClick={handleStartGame} 
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Start Game
                  </button>
                </div>
              ) : (
                <div>
                  {/* Game Status/Result banner */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '16px', 
                    padding: '8px 12px',
                    backgroundColor: '#FAF9F7',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {gameState.status === 'playing' ? (
                      gameState.turnUserId === user._id ? (
                        <span style={{ color: 'var(--accent-color)' }}>Your turn (Playing as {gameState.playerSymbols[user._id]})</span>
                      ) : (
                        <span>{partnerName || 'Partner'}'s turn</span>
                      )
                    ) : gameState.status === 'won' ? (
                      gameState.winnerUserId === user._id ? (
                        <span style={{ color: '#065F46' }}>You won!</span>
                      ) : (
                        <span style={{ color: 'var(--accent-color)' }}>{partnerName || 'Partner'} won!</span>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>It's a draw!</span>
                    )}
                  </div>

                  {/* 3x3 Tic-Tac-Toe Board Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px', 
                    maxWidth: '220px', 
                    margin: '0 auto 20px auto'
                  }}>
                    {gameState.board.map((cell, index) => {
                      const isMyTurn = gameState.status === 'playing' && gameState.turnUserId === user._id;
                      const isEmpty = cell === null;
                      const canClick = isMyTurn && isEmpty;
                      
                      return (
                        <div
                          key={index}
                          onClick={() => canClick && handleMakeMove(index)}
                          className={canClick ? 'tictactoe-cell-active' : ''}
                          style={{
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FAF9F7',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '1.4rem',
                            fontWeight: '700',
                            color: cell === 'X' ? 'var(--accent-color)' : 'var(--text-primary)',
                            cursor: canClick ? 'pointer' : 'default',
                            userSelect: 'none',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {cell}
                        </div>
                      );
                    })}
                  </div>

                  {/* Play Again button */}
                  {gameState.status !== 'playing' && (
                    <button 
                      onClick={handleResetGame} 
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      Play Again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Icebreakers Card */}
          <div className="feature-card card-accent-icebreakers" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Icebreakers <span style={{ fontSize: '0.75rem', color: '#EC4899', fontWeight: 'bold', textTransform: 'uppercase' }}>Would You Rather</span></h2>
            
            <div style={{ marginTop: '12px' }}>
              {icebreakerStatus === 'idle' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Answer fun questions privately, then reveal choices simultaneously!
                  </p>
                  <button 
                    onClick={handleStartIcebreaker} 
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Start Icebreaker
                  </button>
                </div>
              ) : (
                <div>
                  {/* Question Banner */}
                  <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      color: 'var(--accent-color)', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      Would you rather...
                    </span>
                  </div>

                  {/* Option Choice Panels */}
                  {icebreakerStatus === 'playing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button
                        onClick={() => handleIcebreakerAnswer('A')}
                        className="btn"
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: '#FAF9F7',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {icebreakerPrompt.optionA}
                      </button>

                      <div style={{ 
                        textAlign: 'center', 
                        fontSize: '0.7rem', 
                        fontWeight: '700', 
                        color: 'var(--text-secondary)',
                        margin: '2px 0' 
                      }}>
                        OR
                      </div>

                      <button
                        onClick={() => handleIcebreakerAnswer('B')}
                        className="btn"
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: '#FAF9F7',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {icebreakerPrompt.optionB}
                      </button>
                    </div>
                  )}

                  {/* Waiting Panel */}
                  {icebreakerStatus === 'waiting' && (
                    <div style={{ padding: '8px 0', textAlign: 'center' }}>
                      {/* Show my choice highlighted */}
                      <div style={{
                        padding: '10px 14px',
                        backgroundColor: '#FDF1EE',
                        border: '1.5px solid var(--accent-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: 'var(--accent-color)',
                        marginBottom: '12px',
                        textAlign: 'left'
                      }}>
                        Your choice: {icebreakerChoice === 'A' ? icebreakerPrompt.optionA : icebreakerPrompt.optionB}
                      </div>
                      
                      <div style={{ 
                        fontSize: '0.8125rem', 
                        fontWeight: '600', 
                        color: 'var(--text-secondary)',
                        padding: '10px',
                        backgroundColor: '#FAF9F7',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        Waiting for your partner to answer...
                      </div>
                    </div>
                  )}

                  {/* Reveal Panel */}
                  {icebreakerStatus === 'reveal' && icebreakerRevealData && (
                    <div>
                      {/* Matched/Mismatched Header */}
                      <div style={{
                        textAlign: 'center',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        marginBottom: '12px',
                        backgroundColor: Object.values(icebreakerRevealData.choices)[0] === Object.values(icebreakerRevealData.choices)[1] 
                          ? '#E6F4EA' 
                          : '#FAF9F7',
                        color: Object.values(icebreakerRevealData.choices)[0] === Object.values(icebreakerRevealData.choices)[1] 
                          ? '#137333' 
                          : 'var(--text-secondary)',
                        border: '1px solid',
                        borderColor: Object.values(icebreakerRevealData.choices)[0] === Object.values(icebreakerRevealData.choices)[1] 
                          ? '#81C784' 
                          : 'var(--border-color)'
                      }}>
                        {Object.values(icebreakerRevealData.choices)[0] === Object.values(icebreakerRevealData.choices)[1] 
                          ? "You both agreed!" 
                          : "You picked differently!"}
                      </div>

                      {/* Choice Lists */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {Object.entries(icebreakerRevealData.choices).map(([uid, choice]) => {
                          const name = icebreakerRevealData.names[uid] || 'Someone';
                          const choiceText = choice === 'A' ? icebreakerPrompt.optionA : icebreakerPrompt.optionB;
                          const isMe = uid === user._id;

                          return (
                            <div 
                              key={uid}
                              style={{
                                padding: '10px 14px',
                                backgroundColor: '#FAF9F7',
                                border: isMe ? '1px solid var(--border-color)' : '1px solid var(--accent-color)',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              <div style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: '700', 
                                color: isMe ? 'var(--text-secondary)' : 'var(--accent-color)',
                                textTransform: 'uppercase',
                                marginBottom: '2px'
                              }}>
                                {isMe ? 'You' : name}
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {choiceText}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Next Prompt Control */}
                      <button 
                        onClick={handleNextIcebreaker} 
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        Next Prompt
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Whiteboard Card */}
          <div className="feature-card card-accent-whiteboard" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Whiteboard <span style={{ fontSize: '0.75rem', color: '#2ECC71', fontWeight: 'bold', textTransform: 'uppercase' }}>Live Canvas</span></h2>
            
            {/* Controls: Brush Presets & Width */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Preset Colors */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#1A1A1A', '#E8623F', '#4A90E2', '#2ECC71', '#F1C40F', '#9B59B6'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: brushColor === color ? '2px solid #FFFFFF' : '1px solid var(--border-color)',
                      boxShadow: brushColor === color ? '0 0 0 2px var(--accent-color)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Size Preset controls */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Size:</span>
                {[
                  { label: 'S', size: 2 },
                  { label: 'M', size: 5 },
                  { label: 'L', size: 12 }
                ].map((preset) => (
                  <button
                    key={preset.size}
                    onClick={() => setBrushWidth(preset.size)}
                    className="btn"
                    style={{
                      width: 'auto',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      backgroundColor: brushWidth === preset.size ? 'var(--accent-color)' : 'transparent',
                      color: brushWidth === preset.size ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderColor: brushWidth === preset.size ? 'var(--accent-color)' : 'var(--border-color)'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas container */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              aspectRatio: '3/2',
              touchAction: 'none'
            }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDrawing}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={handleStartDrawing}
                onTouchMove={handleDrawing}
                onTouchEnd={handleStopDrawing}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  cursor: 'crosshair'
                }}
              />
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClearCanvas}
              className="btn"
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '8px 12px',
                fontSize: '0.8125rem',
                color: '#EF4444',
                backgroundColor: 'transparent',
                border: '1px solid #FCA5A5'
              }}
            >
              Clear Canvas
            </button>
          </div>

          {/* Music Card */}
          <div className="feature-card card-accent-music" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Music <span style={{ fontSize: '0.75rem', color: '#E8623F', fontWeight: 'bold', textTransform: 'uppercase' }}>Synced Player</span></h2>
            
            {/* Upload Form */}
            <div className="form-group mt-2">
              <label className="form-label">Upload Song (MP3/WAV, max 15MB)</label>
              {isUploading ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Uploading...</div>
              ) : (
                <input
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  onChange={handleFileUpload}
                  className="input-text"
                  style={{ padding: '8px 12px' }}
                />
              )}
              {uploadError && <div style={{ color: '#EF4444', fontSize: '0.8125rem', marginTop: '4px' }}>{uploadError}</div>}
            </div>

            {/* Songs List */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Shared Songs</h3>
              {isSongsLoading ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Loading songs...</p>
              ) : songs.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No songs uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
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
                          fontSize: '0.8125rem',
                          fontWeight: isSelected ? '600' : '400',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
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
                marginTop: '16px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                backgroundColor: '#FAFAFA'
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Now Playing</p>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
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

                <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
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
          <div className="feature-card card-accent-watch" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Watch Together <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Sync Video</span></h2>
            
            {/* URL Input Form */}
            <form onSubmit={handleLoadYtVideo} style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">YouTube Link or Video ID</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Paste link here..."
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    className="input-text"
                    style={{ flex: 1, padding: '8px 12px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                    Load
                  </button>
                </div>
                {ytError && (
                  <div style={{ color: '#EF4444', fontSize: '0.8125rem', marginTop: '4px' }}>
                    {ytError}
                  </div>
                )}
              </div>
            </form>

            {/* Player Container */}
            {currentVideoId ? (
              <div className="youtube-container" style={{ marginTop: '16px' }}>
                <div id="youtube-player"></div>
              </div>
            ) : (
              <div style={{ 
                marginTop: '16px', 
                padding: '32px 16px', 
                textAlign: 'center', 
                border: '1px dashed var(--border-color)', 
                borderRadius: 'var(--radius)',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem'
              }}>
                No video loaded. Enter a YouTube link above to start watching together.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;
