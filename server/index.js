const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Video = require('./models/Video');
const Note = require('./models/Note');
const PairState = require('./models/PairState');
const { cloudinary } = require('./utils/cloudinary');
require('dotenv').config();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const ICEBREAKER_PROMPTS = [
  { optionA: "Live without music", optionB: "Live without movies" },
  { optionA: "Travel only by trains", optionB: "Travel only by airplanes" },
  { optionA: "Have unlimited free food", optionB: "Have unlimited free travel" },
  { optionA: "Explore the deep ocean", optionB: "Explore outer space" },
  { optionA: "Be an expert at painting", optionB: "Be an expert at coding" },
  { optionA: "Always have to say what you think", optionB: "Never speak again" },
  { optionA: "Have super strength", optionB: "Have the ability to fly" },
  { optionA: "Live in a constant summer", optionB: "Live in a constant winter" },
  { optionA: "Speak all human languages", optionB: "Speak to animals" },
  { optionA: "Work remotely forever", optionB: "Work in a beautiful office" },
  { optionA: "Have a photographic memory", optionB: "Be able to forget anything at will" },
  { optionA: "Live in a quiet cabin in the woods", optionB: "Live in a busy downtown penthouse" },
  { optionA: "Always be 15 minutes early", optionB: "Always be 10 minutes late" },
  { optionA: "Read minds", optionB: "Predict the future" },
  { optionA: "Be a famous musician", optionB: "Be a famous director" },
  { optionA: "Never eat sweet foods again", optionB: "Never eat savory foods again" },
  { optionA: "Have a third eye", optionB: "Have a third arm" },
  { optionA: "Be able to breathe underwater", optionB: "Be immune to extreme hot and cold" },
  { optionA: "Only read non-fiction", optionB: "Only read fiction" },
  { optionA: "Give up caffeine forever", optionB: "Give up social media forever" },
  { optionA: "Always have internet access but slow", optionB: "Have fast internet but only 1 hour daily" },
  { optionA: "Live in the past", optionB: "Live in the future" },
  { optionA: "Be a master chef", optionB: "Be a master baker" },
  { optionA: "Solve global climate issues", optionB: "Solve global poverty issues" },
  { optionA: "Eat pizza for every meal", optionB: "Eat burgers for every meal" },
  { optionA: "Spend a day at a busy theme park", optionB: "Spend a day at a quiet spa" },
  { optionA: "Never have to clean again", optionB: "Never have to cook again" },
  { optionA: "Win a million dollars instantly", optionB: "Win 10,000 dollars monthly for life" },
  { optionA: "Be able to run at 60 mph", optionB: "Be able to jump 50 feet high" },
  { optionA: "Have no taste buds", optionB: "Be colorblind" },
  { optionA: "Only watch black-and-white media", optionB: "Only listen to mono-channel audio" },
  { optionA: "Know when you will die", optionB: "Know how you will die" },
  { optionA: "Be a deep sea diver", optionB: "Be a mountain climber" },
  { optionA: "Spend your life creating art", optionB: "Spend your life solving math theorems" },
  { optionA: "Only speak in whispers", optionB: "Only speak in shouts" },
  { optionA: "Have a small house in paradise", optionB: "Have a mansion in a boring town" },
  { optionA: "Never use a touchscreen again", optionB: "Never use a keyboard again" },
  { optionA: "Be able to change your hair color at will", optionB: "Be able to change your eye color at will" }
];

function getNewPromptIndex(recentList) {
  const availableIndices = [];
  for (let i = 0; i < ICEBREAKER_PROMPTS.length; i++) {
    if (!recentList.includes(i)) {
      availableIndices.push(i);
    }
  }
  if (availableIndices.length === 0) {
    return Math.floor(Math.random() * ICEBREAKER_PROMPTS.length);
  }
  const randomIndex = Math.floor(Math.random() * availableIndices.length);
  return availableIndices[randomIndex];
}

function getGameKey(userA, userB) {
  return [userA.toString(), userB.toString()].sort().join('-');
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

const whiteboardStrokes = new Map();
const whiteboardDebounceTimers = new Map();
const sharedNotesBuffer = new Map();
const sharedNotesDebounceTimers = new Map();
const hangmanGames = new Map(); // gameKey → hangman game state

// ─── Hangman helpers ─────────────────────────────────────────────────────────
function makeHangmanGame(pickerUserId, guesserUserId) {
  return {
    pickerUserId,
    guesserUserId,
    word: null,          // set by picker
    guessedLetters: [],  // letters already tried
    wrongGuesses: 0,
    maxWrong: 6,
    status: 'waiting_for_word', // 'waiting_for_word' | 'playing' | 'won' | 'lost'
    winner: null
  };
}

function buildHangmanStateForUser(game, userId) {
  const isPicker = game.pickerUserId === userId;
  const revealed = game.word
    ? game.word.split('').map(ch => game.guessedLetters.includes(ch) ? ch : '_')
    : [];

  return {
    role: isPicker ? 'picker' : 'guesser',
    wordLength: game.word ? game.word.length : null,
    revealed,
    guessedLetters: game.guessedLetters,
    wrongGuesses: game.wrongGuesses,
    maxWrong: game.maxWrong,
    status: game.status,
    winner: game.winner,
    // picker sees the actual word so they can verify
    actualWord: isPicker && game.word ? game.word : null
  };
}

async function updateHangmanScore(gameKey, winnerUserId) {
  try {
    const [u1, u2] = gameKey.split('-');
    const field = winnerUserId === u1 ? 'hangmanScore.user1Wins' : 'hangmanScore.user2Wins';
    await PairState.findOneAndUpdate(
      { pairId: gameKey },
      { $inc: { [field]: 1 }, updatedAt: Date.now() },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error updating hangman score:', err);
  }
}
// ─────────────────────────────────────────────────────────────────────────────


async function updateTicTacToeScore(gameKey, winnerUserId, isDraw) {
  try {
    const sortedUserIds = gameKey.split('-');
    const user1Id = sortedUserIds[0];
    const user2Id = sortedUserIds[1];

    let updateQuery = {};
    if (isDraw) {
      updateQuery = { $inc: { 'ticTacToeScore.draws': 1 } };
    } else if (winnerUserId === user1Id) {
      updateQuery = { $inc: { 'ticTacToeScore.user1Wins': 1 } };
    } else if (winnerUserId === user2Id) {
      updateQuery = { $inc: { 'ticTacToeScore.user2Wins': 1 } };
    }

    await PairState.findOneAndUpdate(
      { pairId: gameKey },
      updateQuery,
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error('Error updating game score in PairState:', err);
  }
}

async function saveWhiteboardStroke(gameKey, stroke) {
  try {
    if (!whiteboardStrokes.has(gameKey)) {
      const pairState = await PairState.findOne({ pairId: gameKey });
      let existingStrokes = [];
      if (pairState && pairState.whiteboardData) {
        try {
          existingStrokes = JSON.parse(pairState.whiteboardData);
          if (!Array.isArray(existingStrokes)) existingStrokes = [];
        } catch (e) {
          existingStrokes = [];
        }
      }
      whiteboardStrokes.set(gameKey, existingStrokes);
    }

    const strokes = whiteboardStrokes.get(gameKey);
    strokes.push(stroke);

    if (whiteboardDebounceTimers.has(gameKey)) {
      clearTimeout(whiteboardDebounceTimers.get(gameKey));
    }

    const timer = setTimeout(async () => {
      try {
        await PairState.findOneAndUpdate(
          { pairId: gameKey },
          { whiteboardData: JSON.stringify(strokes), updatedAt: Date.now() },
          { new: true, upsert: true }
        );
        whiteboardDebounceTimers.delete(gameKey);
      } catch (err) {
        console.error('Error saving whiteboard state in debounce:', err);
      }
    }, 5000);

    whiteboardDebounceTimers.set(gameKey, timer);
  } catch (err) {
    console.error('Error handling saveWhiteboardStroke:', err);
  }
}

async function clearWhiteboardState(gameKey) {
  try {
    whiteboardStrokes.set(gameKey, []);

    if (whiteboardDebounceTimers.has(gameKey)) {
      clearTimeout(whiteboardDebounceTimers.get(gameKey));
      whiteboardDebounceTimers.delete(gameKey);
    }

    await PairState.findOneAndUpdate(
      { pairId: gameKey },
      { whiteboardData: '', updatedAt: Date.now() },
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error('Error clearing whiteboard state:', err);
  }
}

async function saveSharedNote(pairId, content) {
  try {
    sharedNotesBuffer.set(pairId, content);

    if (sharedNotesDebounceTimers.has(pairId)) {
      clearTimeout(sharedNotesDebounceTimers.get(pairId));
    }

    const timer = setTimeout(async () => {
      try {
        const text = sharedNotesBuffer.get(pairId);
        await PairState.findOneAndUpdate(
          { pairId },
          { sharedNote: text, updatedAt: Date.now() },
          { new: true, upsert: true }
        );
        sharedNotesDebounceTimers.delete(pairId);
      } catch (err) {
        console.error('Error saving sharedNote in debounce:', err);
      }
    }, 1000);

    sharedNotesDebounceTimers.set(pairId, timer);
  } catch (err) {
    console.error('Error in saveSharedNote:', err);
  }
}

async function saveTimerState(gameKey, timerData) {
  try {
    let updateFields = {};
    if (timerData.reset) {
      const state = await PairState.findOne({ pairId: gameKey });
      const duration = (state && state.studyTimer && state.studyTimer.durationMinutes) || 25;
      updateFields = {
        'studyTimer.isRunning': false,
        'studyTimer.remainingSeconds': duration * 60,
        updatedAt: Date.now()
      };
    } else {
      if (timerData.isRunning !== undefined) {
        updateFields['studyTimer.isRunning'] = timerData.isRunning;
      }
      if (timerData.remainingSeconds !== undefined) {
        updateFields['studyTimer.remainingSeconds'] = timerData.remainingSeconds;
      }
      if (timerData.durationMinutes !== undefined) {
        updateFields['studyTimer.durationMinutes'] = timerData.durationMinutes;
      }
      updateFields.updatedAt = Date.now();
    }

    await PairState.findOneAndUpdate(
      { pairId: gameKey },
      updateFields,
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error('Error saving timer state in PairState:', err);
  }
}


const app = express();
const port = process.env.PORT || 5000;
const path = require('path');
const fs = require('fs');

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5175';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));
app.use(express.json());

// Import Routes
const authRouter = require('./routes/auth');
const pairRouter = require('./routes/pair');
const songsRouter = require('./routes/songs');
const videosRouter = require('./routes/videos');
const notesRouter = require('./routes/notes');
const tasksRouter = require('./routes/tasks');
const pairStateRouter = require('./routes/pairState');
const kanbanRouter = require('./routes/kanban');

// Single test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Route Middlewares
app.use('/api/auth', authRouter);
app.use('/api/pair', pairRouter);
app.use('/api/songs', songsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/notes', notesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/pair-state', pairStateRouter);
app.use('/api/kanban', kanbanRouter);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// In-memory mapping of online users: userId -> { socketId, status }
const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);

// In-memory mapping of Tic-Tac-Toe games: gameKey -> gameInfo
const tictactoeGames = new Map();

// In-memory mapping of Icebreaker games: gameKey -> gameInfo
const icebreakerGames = new Map();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach userId (using id field from payload) to socket object
    socket.userId = decoded.id || decoded.userId;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection event
io.on('connection', async (socket) => {
  const userId = socket.userId;
  // Default status is "Free" on connection
  onlineUsers.set(userId, { socketId: socket.id, status: 'Free' });
  console.log(`User connected: ${userId} (Socket: ${socket.id})`);

  try {
    // Look up the user's pairId (partner's ID)
    const user = await User.findById(userId);
    if (user && user.pairId) {
      const partnerId = user.pairId.toString();
      const partnerInfo = onlineUsers.get(partnerId);
      const partnerOnline = !!partnerInfo;

      // 1. Emit partner's status immediately to the current user
      if (partnerOnline) {
        socket.emit('partner_status', { online: true, status: partnerInfo.status });
      } else {
        socket.emit('partner_status', { online: false });
      }

      // 2. If partner is online, notify them that this user connected with status "Free"
      if (partnerOnline) {
        io.to(partnerInfo.socketId).emit('partner_online', { status: 'Free' });
      }
    } else {
      // User is not paired yet
      socket.emit('partner_status', { online: false });
    }
  } catch (err) {
    console.error(`Error handling socket connection for user ${userId}:`, err);
  }

  // Handle status updates
  socket.on('update_status', async (data) => {
    const { status } = data;
    const validStatuses = ['Studying', 'Sleeping', 'Free', 'Listening'];
    if (!validStatuses.includes(status)) {
      return;
    }

    const userInfo = onlineUsers.get(userId);
    if (userInfo) {
      userInfo.status = status;
      onlineUsers.set(userId, userInfo);
    } else {
      onlineUsers.set(userId, { socketId: socket.id, status });
    }

    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('partner_status_update', { status });
        }

        // Check if there's a pending note left by the partner for this status
        const pendingNote = await Note.findOne({
          fromUserId: user.pairId,
          triggerStatus: status,
          delivered: false
        });

        if (pendingNote) {
          let fromName = 'Your partner';
          if (partnerInfo && partnerInfo.name) {
            fromName = partnerInfo.name;
          } else {
            const partnerUser = await User.findById(user.pairId);
            if (partnerUser) {
              fromName = partnerUser.name;
            }
          }

          // Emit "note_delivered" to the current user's socket
          socket.emit('note_delivered', {
            id: pendingNote._id,
            message: pendingNote.message,
            fromName
          });

          // Mark note as delivered
          pendingNote.delivered = true;
          await pendingNote.save();
        }
      }
    } catch (err) {
      console.error(`Error broadcasting status update or checking notes for user ${userId}:`, err);
    }
  });

  // Music sync events
  socket.on('play_song', async (data) => {
    const { songId, currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('sync_play', { songId, currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing play for user ${userId}:`, err);
    }
  });

  socket.on('pause_song', async (data) => {
    const { currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('sync_pause', { currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing pause for user ${userId}:`, err);
    }
  });

  socket.on('seek_song', async (data) => {
    const { currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('sync_seek', { currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing seek for user ${userId}:`, err);
    }
  });

  socket.on('change_song', async (data) => {
    const { songId } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('sync_change_song', { songId });
        }
      }
    } catch (err) {
      console.error(`Error syncing change_song for user ${userId}:`, err);
    }
  });

  socket.on('send_ping', async (data) => {
    const { type } = data;
    const validTypes = ['heart', 'wave', 'thinking'];
    if (!validTypes.includes(type)) return;

    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('receive_ping', {
            type,
            fromName: user.name
          });
        }
      }
    } catch (err) {
      console.error(`Error sending ping from user ${userId}:`, err);
    }
  });

  // Synced YouTube watching events
  socket.on('yt_change_video', async (data) => {
    const { videoId } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('yt_sync_change_video', { videoId });
        }
      }
    } catch (err) {
      console.error(`Error syncing yt_change_video for user ${userId}:`, err);
    }
  });

  socket.on('yt_play', async (data) => {
    const { currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('yt_sync_play', { currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing yt_play for user ${userId}:`, err);
    }
  });

  socket.on('yt_pause', async (data) => {
    const { currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('yt_sync_pause', { currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing yt_pause for user ${userId}:`, err);
    }
  });

  socket.on('yt_seek', async (data) => {
    const { currentTime } = data;
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('yt_sync_seek', { currentTime });
        }
      }
    } catch (err) {
      console.error(`Error syncing yt_seek for user ${userId}:`, err);
    }
  });

  socket.on('update_location', async (data) => {
    try {
      const userInfo = onlineUsers.get(userId);
      if (!userInfo) return;

      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        userInfo.location = { latitude: data.latitude, longitude: data.longitude };
      } else {
        delete userInfo.location;
      }

      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);

        if (userInfo.location && partnerInfo && partnerInfo.location) {
          const d = calculateDistance(
            userInfo.location.latitude,
            userInfo.location.longitude,
            partnerInfo.location.latitude,
            partnerInfo.location.longitude
          );
          const distanceKm = d < 10 ? Math.round(d * 10) / 10 : Math.round(d);

          io.to(userInfo.socketId).emit('distance_update', { distanceKm });
          io.to(partnerInfo.socketId).emit('distance_update', { distanceKm });
        } else {
          io.to(userInfo.socketId).emit('distance_update', { distanceKm: null });
          if (partnerInfo) {
            io.to(partnerInfo.socketId).emit('distance_update', { distanceKm: null });
          }
        }
      }
    } catch (err) {
      console.error(`Error updating location for user ${userId}:`, err);
    }
  });

  socket.on('timer_start', async (data) => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerInfo = onlineUsers.get(user.pairId.toString());
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('timer_sync_start', data);
        }
        const gameKey = getGameKey(userId, user.pairId.toString());
        await saveTimerState(gameKey, {
          isRunning: true,
          remainingSeconds: data.durationMinutes * 60,
          durationMinutes: data.durationMinutes
        });
      }
    } catch (err) {
      console.error(`Error relaying timer_start for user ${userId}:`, err);
    }
  });

  socket.on('timer_pause', async (data) => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerInfo = onlineUsers.get(user.pairId.toString());
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('timer_sync_pause', data);
        }
        const gameKey = getGameKey(userId, user.pairId.toString());
        await saveTimerState(gameKey, {
          isRunning: false,
          remainingSeconds: data.remainingSeconds
        });
      }
    } catch (err) {
      console.error(`Error relaying timer_pause for user ${userId}:`, err);
    }
  });

  socket.on('timer_reset', async () => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerInfo = onlineUsers.get(user.pairId.toString());
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('timer_sync_reset');
        }
        const gameKey = getGameKey(userId, user.pairId.toString());
        await saveTimerState(gameKey, {
          isRunning: false,
          reset: true
        });
      }
    } catch (err) {
      console.error(`Error relaying timer_reset for user ${userId}:`, err);
    }
  });

  socket.on('game_start_tictactoe', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
      const playerSymbols = {
        [userId]: symbols[0],
        [partnerId]: symbols[1]
      };

      const turnUserId = Math.random() < 0.5 ? userId : partnerId;

      const game = {
        board: Array(9).fill(null),
        turnUserId,
        playerSymbols,
        status: 'playing',
        winnerUserId: null
      };

      tictactoeGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      if (userInfo) {
        io.to(userInfo.socketId).emit('game_state_update', game);
      }
      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('game_state_update', game);
      }
    } catch (err) {
      console.error('Error starting game:', err);
    }
  });

  socket.on('game_make_move', async (data) => {
    const { cellIndex } = data;
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      const game = tictactoeGames.get(gameKey);
      if (!game || game.status !== 'playing') return;

      if (game.turnUserId !== userId) return;
      if (cellIndex < 0 || cellIndex > 8 || game.board[cellIndex] !== null) return;

      const symbol = game.playerSymbols[userId];
      game.board[cellIndex] = symbol;

      const winnerSymbol = checkWinner(game.board);
      if (winnerSymbol) {
        game.status = 'won';
        game.winnerUserId = userId;
        await updateTicTacToeScore(gameKey, userId, false);
      } else if (game.board.every((cell) => cell !== null)) {
        game.status = 'draw';
        await updateTicTacToeScore(gameKey, null, true);
      } else {
        game.turnUserId = partnerId;
      }

      tictactoeGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      if (userInfo) {
        io.to(userInfo.socketId).emit('game_state_update', game);
      }
      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('game_state_update', game);
      }
    } catch (err) {
      console.error('Error making move:', err);
    }
  });

  socket.on('game_reset_tictactoe', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
      const playerSymbols = {
        [userId]: symbols[0],
        [partnerId]: symbols[1]
      };

      const turnUserId = Math.random() < 0.5 ? userId : partnerId;

      const game = {
        board: Array(9).fill(null),
        turnUserId,
        playerSymbols,
        status: 'playing',
        winnerUserId: null
      };

      tictactoeGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      if (userInfo) {
        io.to(userInfo.socketId).emit('game_state_update', game);
      }
      if (partnerInfo) {
        io.to(partnerInfo.socketId).emit('game_state_update', game);
      }
    } catch (err) {
      console.error('Error resetting game:', err);
    }
  });

  socket.on('canvas_draw', async (data) => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('canvas_sync_draw', data);
        }
        const gameKey = getGameKey(userId, partnerId);
        await saveWhiteboardStroke(gameKey, data);
      }
    } catch (err) {
      console.error(`Error relaying canvas_draw for user ${userId}:`, err);
    }
  });

  socket.on('canvas_clear', async () => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('canvas_sync_clear');
        }
        const gameKey = getGameKey(userId, partnerId);
        await clearWhiteboardState(gameKey);
      }
    } catch (err) {
      console.error(`Error relaying canvas_clear for user ${userId}:`, err);
    }
  });

  socket.on('note_update', async (data) => {
    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('note_sync_update', data);
        }
        const gameKey = getGameKey(userId, partnerId);
        await saveSharedNote(gameKey, data.content);
      }
    } catch (err) {
      console.error(`Error relaying note_update for user ${userId}:`, err);
    }
  });

  // ─── Hangman Socket Events ───────────────────────────────────────────────

  socket.on('hangman_start', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      // First caller becomes picker, partner becomes guesser
      const game = makeHangmanGame(userId, partnerId);
      hangmanGames.set(gameKey, game);
      if (userInfo) io.to(userInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, userId));
      if (partnerInfo) io.to(partnerInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, partnerId));
    } catch (err) {
      console.error('hangman_start error:', err);
    }
  });

  socket.on('hangman_set_word', async ({ word }) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = hangmanGames.get(gameKey);
      if (!game) return socket.emit('hangman_error', { message: 'No active game. Start a game first.' });
      if (game.pickerUserId !== userId) return socket.emit('hangman_error', { message: 'It is not your turn to pick.' });
      if (game.status !== 'waiting_for_word') return socket.emit('hangman_error', { message: 'Word already set.' });

      const cleaned = (word || '').trim().toLowerCase().replace(/\s+/g, '');
      if (!/^[a-z]+$/.test(cleaned)) return socket.emit('hangman_error', { message: 'Word must be letters only (a-z).' });
      if (cleaned.length < 3 || cleaned.length > 20) return socket.emit('hangman_error', { message: 'Word must be 3–20 letters long.' });

      game.word = cleaned;
      game.status = 'playing';
      hangmanGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      if (userInfo) io.to(userInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, userId));
      if (partnerInfo) io.to(partnerInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, partnerId));
    } catch (err) {
      console.error('hangman_set_word error:', err);
    }
  });

  socket.on('hangman_guess_letter', async ({ letter }) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = hangmanGames.get(gameKey);
      if (!game) return socket.emit('hangman_error', { message: 'No active game.' });
      if (game.guesserUserId !== userId) return socket.emit('hangman_error', { message: 'You are not the guesser this round.' });
      if (game.status !== 'playing') return socket.emit('hangman_error', { message: 'Game is not in progress.' });

      const ch = (letter || '').trim().toLowerCase();
      if (!/^[a-z]$/.test(ch)) return socket.emit('hangman_error', { message: 'Invalid letter.' });
      if (game.guessedLetters.includes(ch)) return socket.emit('hangman_error', { message: 'Letter already guessed.' });

      game.guessedLetters.push(ch);
      if (!game.word.includes(ch)) {
        game.wrongGuesses += 1;
      }

      // Check win: all letters revealed
      const allRevealed = game.word.split('').every(c => game.guessedLetters.includes(c));
      if (allRevealed) {
        game.status = 'won';
        game.winner = userId; // guesser wins
        await updateHangmanScore(gameKey, userId);
      } else if (game.wrongGuesses >= game.maxWrong) {
        game.status = 'lost';
        game.winner = game.pickerUserId; // picker wins
        await updateHangmanScore(gameKey, game.pickerUserId);
      }

      hangmanGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      if (userInfo) io.to(userInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, userId));
      if (partnerInfo) io.to(partnerInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, partnerId));
    } catch (err) {
      console.error('hangman_guess_letter error:', err);
    }
  });

  socket.on('hangman_new_round', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const prev = hangmanGames.get(gameKey);
      // Swap roles
      const newPicker = prev ? prev.guesserUserId : userId;
      const newGuesser = prev ? prev.pickerUserId : partnerId;
      const game = makeHangmanGame(newPicker, newGuesser);
      hangmanGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      if (userInfo) io.to(userInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, userId));
      if (partnerInfo) io.to(partnerInfo.socketId).emit('hangman_state_update', buildHangmanStateForUser(game, partnerId));
    } catch (err) {
      console.error('hangman_new_round error:', err);
    }
  });

  socket.on('hangman_get_state', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = hangmanGames.get(gameKey);
      if (game) {
        socket.emit('hangman_state_update', buildHangmanStateForUser(game, userId));
      }
    } catch (err) {
      console.error('hangman_get_state error:', err);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

  socket.on('icebreaker_start', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      let game = icebreakerGames.get(gameKey) || { recentPrompts: [], answers: {}, currentPrompt: null };
      const promptIdx = getNewPromptIndex(game.recentPrompts);

      game.recentPrompts.push(promptIdx);
      if (game.recentPrompts.length > 5) {
        game.recentPrompts.shift();
      }

      game.currentPrompt = {
        ...ICEBREAKER_PROMPTS[promptIdx],
        index: promptIdx
      };
      game.answers = {};

      icebreakerGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      const emitPayload = {
        optionA: game.currentPrompt.optionA,
        optionB: game.currentPrompt.optionB
      };

      if (userInfo) io.to(userInfo.socketId).emit('icebreaker_new_prompt', emitPayload);
      if (partnerInfo) io.to(partnerInfo.socketId).emit('icebreaker_new_prompt', emitPayload);
    } catch (err) {
      console.error('Error starting icebreaker:', err);
    }
  });

  socket.on('icebreaker_answer', async (data) => {
    const { choice } = data;
    if (choice !== 'A' && choice !== 'B') return;

    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      const game = icebreakerGames.get(gameKey);
      if (!game || !game.currentPrompt) return;

      // Ignore additional answers from user who already answered this round
      if (game.answers[userId]) return;

      game.answers[userId] = choice;
      icebreakerGames.set(gameKey, game);

      const hasUserAnswered = game.answers[userId] !== undefined;
      const hasPartnerAnswered = game.answers[partnerId] !== undefined;

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      if (hasUserAnswered && hasPartnerAnswered) {
        const partnerUser = await User.findById(partnerId);
        const currentUser = await User.findById(userId);

        const revealPayload = {
          choices: {
            [userId]: game.answers[userId],
            [partnerId]: game.answers[partnerId]
          },
          names: {
            [userId]: currentUser ? currentUser.name : 'You',
            [partnerId]: partnerUser ? partnerUser.name : 'Partner'
          }
        };

        if (userInfo) io.to(userInfo.socketId).emit('icebreaker_reveal', revealPayload);
        if (partnerInfo) io.to(partnerInfo.socketId).emit('icebreaker_reveal', revealPayload);
      } else {
        if (userInfo) {
          io.to(userInfo.socketId).emit('icebreaker_waiting');
        }
      }
    } catch (err) {
      console.error('Error recording icebreaker answer:', err);
    }
  });

  socket.on('icebreaker_next', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;

      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      let game = icebreakerGames.get(gameKey) || { recentPrompts: [], answers: {}, currentPrompt: null };
      const promptIdx = getNewPromptIndex(game.recentPrompts);

      game.recentPrompts.push(promptIdx);
      if (game.recentPrompts.length > 5) {
        game.recentPrompts.shift();
      }

      game.currentPrompt = {
        ...ICEBREAKER_PROMPTS[promptIdx],
        index: promptIdx
      };
      game.answers = {};

      icebreakerGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      const emitPayload = {
        optionA: game.currentPrompt.optionA,
        optionB: game.currentPrompt.optionB
      };

      if (userInfo) io.to(userInfo.socketId).emit('icebreaker_new_prompt', emitPayload);
      if (partnerInfo) io.to(partnerInfo.socketId).emit('icebreaker_new_prompt', emitPayload);
    } catch (err) {
      console.error('Error loading next icebreaker:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
    
    // Only remove from onlineUsers if this socket is the active one mapped
    const userInfo = onlineUsers.get(userId);
    if (userInfo && userInfo.socketId === socket.id) {
      onlineUsers.delete(userId);
    }

    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        
        // Notify partner that current user is offline
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('partner_offline');
        }

        // If partner is also offline, clean up uploaded videos from Cloudinary and DB
        const isPartnerOnline = onlineUsers.has(partnerId);
        if (!isPartnerOnline) {
          const videos = await Video.find({
            pairId: { $in: [user._id, user.pairId] }
          });

          for (const video of videos) {
            if (video.publicId) {
              try {
                await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
              } catch (cloudinaryErr) {
                console.error(`Error deleting video ${video.publicId} from Cloudinary:`, cloudinaryErr);
              }
            }
          }

          await Video.deleteMany({
            pairId: { $in: [user._id, user.pairId] }
          });
          console.log(`Cleaned up videos for pair ${user.pairId} because both users disconnected`);
        }
      }
    } catch (err) {
      console.error(`Error handling socket disconnect for user ${userId}:`, err);
    }
  });
});
// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/presence';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    console.log('Server will continue running, but MongoDB features will not work.');
  });

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
