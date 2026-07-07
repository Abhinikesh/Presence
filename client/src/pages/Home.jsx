import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Home() {
  const { user, token, logout, setUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('');
  const [myStatus, setMyStatus] = useState('Free');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [activePing, setActivePing] = useState(null);
  const [sentStatus, setSentStatus] = useState({ heart: false, wave: false, thinking: false });

  const [songs, setSongs] = useState([]);
  const [isSongsLoading, setIsSongsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [isConnected, setIsConnected] = useState(true);

  const audioRef = useRef(null);

  const [ytUrl, setYtUrl] = useState('');
  const [ytError, setYtError] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('');

  const [shareLocation, setShareLocation] = useState(false);
  const [distanceApart, setDistanceApart] = useState(null);
  const watchIdRef = useRef(null);

  const [noteMessage, setNoteMessage] = useState('');
  const [noteTriggerStatus, setNoteTriggerStatus] = useState('Free');
  const [activeNote, setActiveNote] = useState(null);
  const [noteFeedback, setNoteFeedback] = useState('');

  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [focusCompletionMsg, setFocusCompletionMsg] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const timerIntervalRef = useRef(null);
  const durationMinutesRef = useRef(25);
  
  const [gameState, setGameState] = useState(null);

  const [selectedGame, setSelectedGame] = useState('tictactoe');

  const [hangmanState, setHangmanState] = useState(null);
  const [hangmanWordInput, setHangmanWordInput] = useState('');
  const [hangmanError, setHangmanError] = useState('');
  const [hangmanScores, setHangmanScores] = useState({ me: 0, partner: 0 });

  const [brushColor, setBrushColor] = useState('#1A1A1A');
  const [brushWidth, setBrushWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const prevCoordsRef = useRef({ x: 0, y: 0 });

  const [icebreakerPrompt, setIcebreakerPrompt] = useState(null);
  const [icebreakerChoice, setIcebreakerChoice] = useState(null);
  const [icebreakerStatus, setIcebreakerStatus] = useState('idle');
  const [icebreakerRevealData, setIcebreakerRevealData] = useState(null);

  const [desireStatus, setDesireStatus] = useState('idle');
  const [desirePrompt, setDesirePrompt] = useState(null);
  const [desireChoice, setDesireChoice] = useState(null);
  const [desireReveal, setDesireReveal] = useState(null);
  const [desireCategory, setDesireCategory] = useState('all');
  const [desireMatchCount, setDesireMatchCount] = useState(0);
  const [desireTotalCount, setDesireTotalCount] = useState(0);

  const [partnerId, setPartnerId] = useState('');
  const partnerIdRef = useRef('');
  useEffect(() => {
    partnerIdRef.current = partnerId;
  }, [partnerId]);
  const [scores, setScores] = useState({ me: 0, partner: 0, draws: 0 });
  useEffect(() => {
    durationMinutesRef.current = durationMinutes;
  }, [durationMinutes]);

  const [kanbanCards, setKanbanCards] = useState({ todo: [], in_progress: [], done: [] });
  const [kanbanNewText, setKanbanNewText] = useState('');
  const [kanbanEditingId, setKanbanEditingId] = useState(null);
  const [kanbanEditText, setKanbanEditText] = useState('');

  const [sharedNote, setSharedNote] = useState('');
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [lastNoteUpdated, setLastNoteUpdated] = useState(null);
  const localIsTypingRef = useRef(false);
  const localTypingTimeoutRef = useRef(null);
  const noteDebounceTimeoutRef = useRef(null);
  const partnerTypingIndicatorTimeoutRef = useRef(null);

  const ytPlayerRef = useRef(null);
  const isIncomingSyncRef = useRef(false);
  const lastPlayerTimeRef = useRef(0);
  const seekCheckIntervalRef = useRef(null);
  const lastIncomingSyncTimeRef = useRef(0);

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

    // socket connection initialize kr rhe hai token ke sath
    const socket = io(BACKEND_URL, {
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

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

    socket.on('partner_status', (data) => {
      setPartnerOnline(data.online);
      if (data.online) {
        setPartnerStatus(data.status || 'Free');
      }
    });

    socket.on('partner_online', (data) => {
      setPartnerOnline(true);
      setPartnerStatus(data?.status || 'Free');
    });

    socket.on('partner_offline', () => {
      setPartnerOnline(false);
    });

    socket.on('partner_status_update', (data) => {
      setPartnerStatus(data.status);
    });

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

    socket.on('receive_ping', (data) => {
      setActivePing({
        id: Date.now(),
        fromName: data.fromName,
        type: data.type
      });
    });

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

    socket.on('kanban_card_created', (card) => {
      setKanbanCards(prev => ({
        ...prev,
        [card.column]: [...prev[card.column], card].sort((a, b) => a.position - b.position)
      }));
    });

    socket.on('kanban_card_moved', (card) => {
      setKanbanCards(prev => {
        const next = { todo: [], in_progress: [], done: [] };
        ['todo', 'in_progress', 'done'].forEach(col => {
          next[col] = prev[col].filter(c => c._id !== card._id);
        });
        next[card.column] = [...next[card.column], card].sort((a, b) => a.position - b.position);
        return next;
      });
    });

    socket.on('kanban_card_updated', (card) => {
      setKanbanCards(prev => {
        const next = { ...prev };
        next[card.column] = prev[card.column].map(c => c._id === card._id ? card : c);
        return next;
      });
    });

    socket.on('kanban_card_deleted', ({ _id }) => {
      setKanbanCards(prev => ({
        todo: prev.todo.filter(c => c._id !== _id),
        in_progress: prev.in_progress.filter(c => c._id !== _id),
        done: prev.done.filter(c => c._id !== _id),
      }));
    });

    socket.on('note_sync_update', (data) => {
      setPartnerIsTyping(true);
      if (partnerTypingIndicatorTimeoutRef.current) {
        clearTimeout(partnerTypingIndicatorTimeoutRef.current);
      }
      partnerTypingIndicatorTimeoutRef.current = setTimeout(() => {
        setPartnerIsTyping(false);
      }, 2000);

      if (!localIsTypingRef.current) {
        setSharedNote(data.content || '');
        setLastNoteUpdated(new Date());
      }
    });

    socket.on('hangman_state_update', (state) => {
      setHangmanState(state);
      if (state.status === 'won' || state.status === 'lost') {
        fetchPairState(partnerIdRef.current);
      }
    });

    socket.on('hangman_error', (data) => {
      setHangmanError(data.message || 'Something went wrong.');
      setTimeout(() => setHangmanError(''), 3000);
    });

    socket.on('desire_new_prompt', (data) => {
      setDesirePrompt(data);
      setDesireChoice(null);
      setDesireStatus('playing');
      setDesireReveal(null);
      setDesireMatchCount(data.matchCount || 0);
      setDesireTotalCount(data.totalCount || 0);
    });

    socket.on('desire_waiting', () => {
      setDesireStatus('waiting');
    });

    socket.on('desire_reveal', (data) => {
      setDesireReveal(data);
      setDesireStatus('reveal');
      setDesireMatchCount(data.matchCount || 0);
      setDesireTotalCount(data.totalCount || 0);
    });

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

  const groupByColumn = (cards) => {
    const grouped = { todo: [], in_progress: [], done: [] };
    cards.forEach(card => {
      if (grouped[card.column]) grouped[card.column].push(card);
    });
    ['todo', 'in_progress', 'done'].forEach(col => {
      grouped[col].sort((a, b) => a.position - b.position);
    });
    return grouped;
  };

  const fetchKanbanCards = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/kanban/cards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const cards = await res.json();
        setKanbanCards(groupByColumn(cards));
      }
    } catch (err) {
      console.error('Error fetching kanban cards:', err);
    }
  };

  const handleAddKanbanCard = async () => {
    const text = kanbanNewText.trim();
    if (!text) return;
    setKanbanNewText('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/kanban/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text, column: 'todo' })
      });
      if (res.ok) {
        const card = await res.json();
        setKanbanCards(prev => ({
          ...prev,
          todo: [...prev.todo, card]
        }));
      }
    } catch (err) {
      console.error('Error adding kanban card:', err);
    }
  };

  const handleDeleteKanbanCard = async (card) => {
    setKanbanCards(prev => ({
      ...prev,
      [card.column]: prev[card.column].filter(c => c._id !== card._id)
    }));
    try {
      await fetch(`${BACKEND_URL}/api/kanban/cards/${card._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error deleting kanban card:', err);
      fetchKanbanCards();
    }
  };

  const handleCommitKanbanEdit = async (card) => {
    const newText = kanbanEditText.trim();
    setKanbanEditingId(null);
    if (!newText || newText === card.text) return;
    setKanbanCards(prev => ({
      ...prev,
      [card.column]: prev[card.column].map(c => c._id === card._id ? { ...c, text: newText } : c)
    }));
    try {
      await fetch(`${BACKEND_URL}/api/kanban/cards/${card._id}/text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newText })
      });
    } catch (err) {
      console.error('Error editing kanban card:', err);
      fetchKanbanCards();
    }
  };

  const handleKanbanDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    const allCards = { ...kanbanCards };
    const srcList = Array.from(allCards[srcCol]);
    const [moved] = srcList.splice(source.index, 1);
    const dstList = srcCol === dstCol ? srcList : Array.from(allCards[dstCol]);
    dstList.splice(destination.index, 0, { ...moved, column: dstCol });

    const newState = { ...allCards, [srcCol]: srcList, [dstCol]: dstList };
    newState[dstCol] = newState[dstCol].map((c, i) => ({ ...c, position: i }));
    if (srcCol !== dstCol) newState[srcCol] = newState[srcCol].map((c, i) => ({ ...c, position: i }));
    setKanbanCards(newState);

    try {
      await fetch(`${BACKEND_URL}/api/kanban/cards/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ column: dstCol, position: destination.index })
      });
      const promises = [];
      newState[dstCol].forEach((c, i) => {
        if (c._id !== draggableId) {
          promises.push(fetch(`${BACKEND_URL}/api/kanban/cards/${c._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ position: i })
          }));
        }
      });
      if (srcCol !== dstCol) {
        newState[srcCol].forEach((c, i) => {
          promises.push(fetch(`${BACKEND_URL}/api/kanban/cards/${c._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ position: i })
          }));
        });
      }
      await Promise.all(promises);
    } catch (err) {
      console.error('Error saving kanban reorder:', err);
      fetchKanbanCards();
    }
  };

  const handleHangmanStart = () => {
    if (!socketRef.current) return;
    setHangmanError('');
    setHangmanWordInput('');
    socketRef.current.emit('hangman_start');
  };

  const handleHangmanSetWord = (e) => {
    e.preventDefault();
    if (!socketRef.current) return;
    setHangmanError('');
    socketRef.current.emit('hangman_set_word', { word: hangmanWordInput });
    setHangmanWordInput('');
  };

  const handleHangmanGuess = (letter) => {
    if (!socketRef.current) return;
    setHangmanError('');
    socketRef.current.emit('hangman_guess_letter', { letter });
  };

  const handleHangmanNewRound = () => {
    if (!socketRef.current) return;
    setHangmanError('');
    setHangmanWordInput('');
    socketRef.current.emit('hangman_new_round');
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setSharedNote(val);
    setLastNoteUpdated(new Date());

    localIsTypingRef.current = true;
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
    }
    localTypingTimeoutRef.current = setTimeout(() => {
      localIsTypingRef.current = false;
    }, 1500);

    if (noteDebounceTimeoutRef.current) {
      clearTimeout(noteDebounceTimeoutRef.current);
    }
    noteDebounceTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('note_update', { content: val });
      }
    }, 400);
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

        if (data.ticTacToeScore) {
          const { user1Wins, user2Wins, draws } = data.ticTacToeScore;
          const myId = String(user._id);
          if (myId < pId) {
            setScores({ me: user1Wins, partner: user2Wins, draws });
          } else {
            setScores({ me: user2Wins, partner: user1Wins, draws });
          }
        }

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

        if (data.sharedNote !== undefined) {
          setSharedNote(data.sharedNote || '');
        }

        if (data.hangmanScore) {
          const myId = String(user._id);
          const pId = partnerIdRef.current;
          if (myId < pId) {
            setHangmanScores({ me: data.hangmanScore.user1Wins || 0, partner: data.hangmanScore.user2Wins || 0 });
          } else {
            setHangmanScores({ me: data.hangmanScore.user2Wins || 0, partner: data.hangmanScore.user1Wins || 0 });
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
            fetchKanbanCards();
          } else {
            // paired nahi hai to connect code page pr bhejenge
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
        e.target.value = null;
      } else {
        setUploadError(data.error || 'Upload failed.');
      }
    } catch (err) {
      setUploadError('Network error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

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

      if (state === 1) {
        const elapsedSinceSync = Date.now() - lastIncomingSyncTimeRef.current;
        if (elapsedSinceSync < 1500) {
          lastPlayerTimeRef.current = currentTime;
          return;
        }

        const timeDiff = currentTime - lastPlayerTimeRef.current;
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

    if (state === 1) {
      if (socketRef.current) {
        socketRef.current.emit('yt_play', { currentTime });
      }
      startSeekCheck();
    } else if (state === 2) {
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

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (!currentVideoId) return;

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

  useEffect(() => {
    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      stopSeekCheck();
    };
  }, []);

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

  const handleDesireStart = (cat = desireCategory) => {
    if (!socketRef.current) return;
    socketRef.current.emit('desire_start', { category: cat });
  };

  const handleDesireAnswer = (choice) => {
    setDesireChoice(choice);
    if (!socketRef.current) return;
    socketRef.current.emit('desire_answer', { choice });
  };

  const handleDesireNext = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('desire_next');
  };

  const handleDesireCategoryChange = (cat) => {
    setDesireCategory(cat);
    if (!socketRef.current) return;
    socketRef.current.emit('desire_change_category', { category: cat });
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
      <div className="bg-grain" />

      <div className="bg-blobs-premium">
        <div className="blob-coral" />
        <div className="blob-purple" />
        <div className="blob-yellow" />
        <div className="blob-teal" />
        <div className="blob-rose" />
      </div>

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

      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

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

      <div className="home-content-container">
        
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

        <div className="quick-actions-strip">
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

        <div className="dashboard-grid">
          <div className="feature-card card-accent-study" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Study Room <span style={{ fontSize: '0.75rem', color: '#4A90E2', fontWeight: 'bold', textTransform: 'uppercase' }}>Focus Zone</span></h2>
            
            <div style={{ 
              textAlign: 'center', 
              margin: '16px 0', 
              backgroundColor: '#FAF9F7', 
              borderRadius: 'var(--radius)', 
              border: '1px solid var(--border-color)',
              padding: '20px 16px'
            }}>
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

          <div className="feature-card card-accent-games" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Games <span style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>Play Time</span></h2>

            <div className="game-tab-bar">
              <button
                className={`game-tab-btn${selectedGame === 'tictactoe' ? ' active' : ''}`}
                onClick={() => setSelectedGame('tictactoe')}
              >
                ✕ Tic-Tac-Toe
              </button>
              <button
                className={`game-tab-btn${selectedGame === 'hangman' ? ' active' : ''}`}
                onClick={() => setSelectedGame('hangman')}
              >
                🪢 Hangman
              </button>
            </div>

            {selectedGame === 'tictactoe' && (
              <div>
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
                    <button onClick={handleStartGame} className="btn btn-primary" style={{ width: '100%' }}>
                      Start Game
                    </button>
                  </div>
                ) : (
                  <div>
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
                          <span style={{ color: '#065F46' }}>You won! 🎉</span>
                        ) : (
                          <span style={{ color: 'var(--accent-color)' }}>{partnerName || 'Partner'} won!</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>It's a draw!</span>
                      )}
                    </div>

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

                    {gameState.status !== 'playing' && (
                      <button onClick={handleResetGame} className="btn btn-primary" style={{ width: '100%' }}>
                        Play Again
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedGame === 'hangman' && (() => {
              const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
              const hs = hangmanState;
              const isOver = hs && (hs.status === 'won' || hs.status === 'lost');
              const isPicker = hs && hs.role === 'picker';
              const isGuesser = hs && hs.role === 'guesser';

              return (
                <div>
                  <div className="hangman-score-bar">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#7C3AED', fontSize: '1.1rem', fontWeight: '800' }}>{hangmanScores.me}</div>
                      <div style={{ color: '#6B7280', fontWeight: '500' }}>You</div>
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: '500' }}>— Wins —</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#F59E0B', fontSize: '1.1rem', fontWeight: '800' }}>{hangmanScores.partner}</div>
                      <div style={{ color: '#6B7280', fontWeight: '500' }}>{partnerName || 'Partner'}</div>
                    </div>
                  </div>

                  {hangmanError && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius-sm)',
                      color: '#991B1B',
                      fontSize: '0.8125rem',
                      marginBottom: '12px',
                      fontWeight: '500'
                    }}>
                      ⚠ {hangmanError}
                    </div>
                  )}

                  {!hs ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        One player picks a secret word, the other guesses letter by letter!
                      </p>
                      <button onClick={handleHangmanStart} className="btn btn-primary" style={{ width: '100%' }}>
                        Start Hangman
                      </button>
                    </div>
                  ) : (
                    <div>
                      {hs.status === 'waiting_for_word' && (
                        <div className={`hangman-status-banner playing`}>
                          {isPicker ? '🤫 You are the word picker — enter a secret word below.' : `⏳ Waiting for ${partnerName || 'your partner'} to set the word…`}
                        </div>
                      )}
                      {hs.status === 'playing' && (
                        <div className={`hangman-status-banner playing`}>
                          {isPicker ? `🤐 You set the word (${hs.wordLength} letters). Root for your partner!` : '🔤 Your turn to guess — pick a letter below.'}
                        </div>
                      )}
                      {hs.status === 'won' && (
                        <div className={`hangman-status-banner won`}>
                          {isGuesser ? `🎉 You guessed it! The word was "${hs.revealed.join('')}"` : `🎊 ${partnerName || 'Partner'} guessed your word "${hs.actualWord || hs.revealed.join('')}"!`}
                        </div>
                      )}
                      {hs.status === 'lost' && (
                        <div className={`hangman-status-banner lost`}>
                          {isPicker ? `😈 They ran out of guesses! The word was "${hs.actualWord}"` : `😢 Out of guesses! The word was hidden — better luck next time.`}
                        </div>
                      )}

                      {hs.status !== 'waiting_for_word' && (
                        <div className="hangman-word-display">
                          {hs.revealed.map((ch, i) => (
                            <div
                              key={i}
                              className={`hangman-letter-blank${ch !== '_' ? ' revealed' : ''}`}
                            >
                              {ch !== '_' ? ch : ''}
                            </div>
                          ))}
                        </div>
                      )}

                      {hs.status === 'playing' && (
                        <div className="hangman-wrong-counter">
                          Wrong guesses: <span>{hs.wrongGuesses}</span> / {hs.maxWrong}
                          {' '}{'🔴'.repeat(hs.wrongGuesses)}{'⚪'.repeat(Math.max(0, hs.maxWrong - hs.wrongGuesses))}
                        </div>
                      )}
                      {isOver && hs.wrongGuesses > 0 && (
                        <div className="hangman-wrong-counter">
                          Final: <span>{hs.wrongGuesses}</span> / {hs.maxWrong} wrong guesses
                        </div>
                      )}

                      {isPicker && hs.status === 'waiting_for_word' && (
                        <form onSubmit={handleHangmanSetWord} style={{ marginTop: '8px' }}>
                          <input
                            type="text"
                            className="hangman-word-input"
                            value={hangmanWordInput}
                            onChange={e => setHangmanWordInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                            placeholder="Type a secret word (3–20 letters)…"
                            maxLength={20}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '10px' }}
                            disabled={hangmanWordInput.trim().length < 3}
                          >
                            Set Word
                          </button>
                        </form>
                      )}

                      {isGuesser && hs.status === 'playing' && (
                        <div className="hangman-alpha-grid">
                          {ALPHABET.map(letter => {
                            const isGuessed = hs.guessedLetters.includes(letter);
                            const isCorrect = isGuessed && hs.revealed.includes(letter);
                            const isWrong = isGuessed && !hs.revealed.includes(letter);
                            return (
                              <button
                                key={letter}
                                className={`hangman-alpha-btn${isCorrect ? ' correct' : isWrong ? ' wrong' : ''}`}
                                onClick={() => handleHangmanGuess(letter)}
                                disabled={isGuessed}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isOver && (
                        <button
                          onClick={handleHangmanNewRound}
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '16px' }}
                        >
                          New Round (swap roles)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

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

                  {icebreakerStatus === 'waiting' && (
                    <div style={{ padding: '8px 0', textAlign: 'center' }}>
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

                  {icebreakerStatus === 'reveal' && icebreakerRevealData && (
                    <div>
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

          <div className="feature-card card-accent-desire" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2 style={{ marginBottom: '4px' }}>
              💋 Desire Meets Discretion{' '}
              <span style={{ fontSize: '0.75rem', color: '#BE185D', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Explore Together
              </span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Answer privately. Reveal together. Discover how you align.
            </p>

            <div className="desire-category-bar">
              {[
                { id: 'all', label: '🎲 All' },
                { id: 'romance', label: '💕 Romance' },
                { id: 'desires', label: '🌹 Desires' },
                { id: 'fantasy', label: '🎭 Fantasy' },
                { id: 'compatibility', label: '💑 Compatibility' },
                { id: 'spicy', label: '🔥 Spicy' },
              ].map(c => (
                <button
                  key={c.id}
                  className={`desire-cat-btn${desireCategory === c.id ? ' active' : ''}`}
                  onClick={() => handleDesireCategoryChange(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {desireTotalCount > 0 && (
              <div className="desire-score-bar">
                <div>
                  <div className="desire-compatibility-pct">
                    {Math.round((desireMatchCount / desireTotalCount) * 100)}%
                  </div>
                  <div className="desire-compatibility-label">Compatible</div>
                </div>
                <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <div>{desireMatchCount} match{desireMatchCount !== 1 ? 'es' : ''}</div>
                  <div>out of {desireTotalCount} questions</div>
                </div>
              </div>
            )}

            {desireStatus === 'idle' && (
              <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌹</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                  One question. Two private answers. Reveal simultaneously —<br />
                  see where your desires align.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #BE185D, #9D174D)', border: 'none' }}
                  onClick={() => handleDesireStart(desireCategory)}
                >
                  Begin the Game
                </button>
              </div>
            )}

            {(desireStatus === 'playing' || desireStatus === 'waiting') && desirePrompt && (
              <div>
                <div className="desire-question-card">
                  <div className="desire-category-pill">
                    {desirePrompt.category === 'romance' ? '💕 Romance'
                      : desirePrompt.category === 'desires' ? '🌹 Desires'
                      : desirePrompt.category === 'fantasy' ? '🎭 Fantasy'
                      : desirePrompt.category === 'spicy' ? '🔥 Spicy'
                      : '💑 Compatibility'}
                  </div>
                  <div className="desire-question-text">{desirePrompt.question}</div>
                </div>

                {desireStatus === 'playing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      className={`desire-option-btn${desireChoice === 'A' ? ' selected' : ''}`}
                      onClick={() => handleDesireAnswer('A')}
                    >
                      <span style={{ fontWeight: '700', color: '#BE185D', marginRight: '8px' }}>A</span>
                      {desirePrompt.optionA}
                    </button>
                    <div className="desire-or-divider">— or —</div>
                    <button
                      className={`desire-option-btn${desireChoice === 'B' ? ' selected' : ''}`}
                      onClick={() => handleDesireAnswer('B')}
                    >
                      <span style={{ fontWeight: '700', color: '#BE185D', marginRight: '8px' }}>B</span>
                      {desirePrompt.optionB}
                    </button>
                  </div>
                )}

                {desireStatus === 'waiting' && (
                  <div>
                    <div className="desire-reveal-row is-me" style={{ marginBottom: '10px' }}>
                      <div className="who">Your answer ✓</div>
                      <div>{desireChoice === 'A' ? desirePrompt.optionA : desirePrompt.optionB}</div>
                    </div>
                    <div className="desire-waiting-box">
                      ⏳ Waiting for {partnerName || 'your partner'} to choose…
                    </div>
                  </div>
                )}
              </div>
            )}

            {desireStatus === 'reveal' && desireReveal && desirePrompt && (
              <div>
                <div className="desire-question-card" style={{ marginBottom: '12px' }}>
                  <div className="desire-category-pill">
                    {desireReveal.currentPrompt?.category === 'romance' ? '💕 Romance'
                      : desireReveal.currentPrompt?.category === 'desires' ? '🌹 Desires'
                      : desireReveal.currentPrompt?.category === 'fantasy' ? '🎭 Fantasy'
                      : desireReveal.currentPrompt?.category === 'spicy' ? '🔥 Spicy'
                      : '💑 Compatibility'}
                  </div>
                  <div className="desire-question-text">{desireReveal.currentPrompt?.question || desirePrompt.question}</div>
                </div>

                <div className={`desire-reveal-match${desireReveal.isMatch ? ' match' : ' different'}`}>
                  {desireReveal.isMatch
                    ? '💕 You both feel the same way!'
                    : '✨ Opposites attract — you chose differently!'}
                </div>

                {Object.entries(desireReveal.choices).map(([uid, choice]) => {
                  const isMe = uid === user._id;
                  const name = desireReveal.names[uid] || (isMe ? 'You' : partnerName || 'Partner');
                  const prompt = desireReveal.currentPrompt || desirePrompt;
                  const text = choice === 'A' ? prompt.optionA : prompt.optionB;
                  return (
                    <div key={uid} className={`desire-reveal-row${isMe ? ' is-me' : ' is-partner'}`}>
                      <div className="who">{isMe ? 'You' : name}</div>
                      <div>{text}</div>
                    </div>
                  );
                })}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '14px', background: 'linear-gradient(135deg, #BE185D, #9D174D)', border: 'none' }}
                  onClick={handleDesireNext}
                >
                  Next Question →
                </button>
              </div>
            )}
          </div>

          <div className="feature-card card-accent-whiteboard" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Whiteboard <span style={{ fontSize: '0.75rem', color: '#2ECC71', fontWeight: 'bold', textTransform: 'uppercase' }}>Live Canvas</span></h2>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
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

          <div className="feature-card card-accent-music" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Music <span style={{ fontSize: '0.75rem', color: '#E8623F', fontWeight: 'bold', textTransform: 'uppercase' }}>Synced Player</span></h2>
            
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

          <div className="feature-card card-accent-watch" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <h2>Watch Together <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Sync Video</span></h2>
            
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

          <div className="feature-card card-accent-kanban" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave} style={{ gridColumn: '1 / -1' }}>
            <h2>Kanban Board <span style={{ fontSize: '0.75rem', color: '#14B8A6', fontWeight: 'bold', textTransform: 'uppercase' }}>Shared Tasks</span></h2>

            <DragDropContext onDragEnd={handleKanbanDragEnd}>
              <div className="kanban-board">
                {[
                  { id: 'todo', label: 'To Do', dotColor: '#F59E0B' },
                  { id: 'in_progress', label: 'In Progress', dotColor: '#3B82F6' },
                  { id: 'done', label: 'Done', dotColor: '#22C55E' }
                ].map(col => (
                  <Droppable droppableId={col.id} key={col.id}>
                    {(provided, snapshot) => (
                      <div
                        className={`kanban-column${snapshot.isDraggingOver ? ' drag-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <div className="kanban-col-header">
                          <span className="kanban-col-title">
                            <span className="kanban-col-dot" style={{ backgroundColor: col.dotColor }} />
                            {col.label}
                          </span>
                          <span className="kanban-col-count">{kanbanCards[col.id].length}</span>
                        </div>

                        <div className="kanban-cards-list">
                          {kanbanCards[col.id].map((card, index) => (
                            <Draggable key={card._id} draggableId={card._id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  className={`kanban-card${snapshot.isDragging ? ' is-dragging' : ''}`}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  {kanbanEditingId === card._id ? (
                                    <input
                                      className="kanban-edit-input"
                                      value={kanbanEditText}
                                      onChange={(e) => setKanbanEditText(e.target.value)}
                                      onBlur={() => handleCommitKanbanEdit(card)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleCommitKanbanEdit(card); }
                                        if (e.key === 'Escape') setKanbanEditingId(null);
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      className="kanban-card-text"
                                      onClick={() => { setKanbanEditingId(card._id); setKanbanEditText(card.text); }}
                                    >
                                      {card.text}
                                    </span>
                                  )}
                                  <button
                                    className="kanban-card-delete"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteKanbanCard(card); }}
                                    title="Delete"
                                  >✕</button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>

                        {col.id === 'todo' && (
                          <form className="kanban-add-form" onSubmit={(e) => { e.preventDefault(); handleAddKanbanCard(); }}>
                            <input
                              className="kanban-add-input"
                              value={kanbanNewText}
                              onChange={(e) => setKanbanNewText(e.target.value)}
                              placeholder="+ Add a task..."
                              maxLength={500}
                            />
                            <button type="submit" className="kanban-add-btn" disabled={!kanbanNewText.trim()}>Add</button>
                          </form>
                        )}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>

          <div
            className="feature-card card-accent-notes"
            onMouseMove={handleTiltMove}
            onMouseLeave={handleTiltLeave}
            style={{ gridColumn: '1 / -1' }}
          >
            <h2 style={{ marginBottom: '4px' }}>
              📝 Shared Notes{' '}
              <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Live Synced
              </span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              A shared space for both of you — thoughts, to-dos, anything. Last write wins.
            </p>

            <textarea
              className="shared-note-textarea"
              value={sharedNote}
              onChange={handleNoteChange}
              placeholder="Start writing something together…"
              maxLength={10000}
              spellCheck={true}
            />

            <div className="note-typing-indicator">
              {partnerIsTyping ? `${partnerName} is typing…` : ''}
            </div>

            <div className="note-footer">
              <span>
                {lastNoteUpdated
                  ? `Last updated ${lastNoteUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Start typing to sync with your partner'}
              </span>
              <span>{sharedNote.length} / 10,000 chars</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Home;
