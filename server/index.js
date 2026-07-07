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

// ─── Desire Meets Discretion ─────────────────────────────────────────────────
const DESIRE_PROMPTS = [
  // 💕 Romance
  { category: 'romance', question: 'Your idea of the most romantic surprise is…', optionA: 'A handwritten love letter left for you to find', optionB: 'Being taken on an unplanned midnight adventure' },
  { category: 'romance', question: 'The moment you feel most in love is…', optionA: 'When they remember the tiny details you once mentioned', optionB: 'When they hold your hand without saying a word' },
  { category: 'romance', question: 'Your perfect romantic evening looks like…', optionA: 'Cooking together with music playing softly', optionB: 'Stargazing on a blanket with takeout and candles' },
  { category: 'romance', question: 'The most meaningful way to say "I love you" is…', optionA: 'Whispering it quietly in a tender moment', optionB: 'Showing it through a planned, thoughtful gesture' },
  { category: 'romance', question: 'You fall harder for someone who…', optionA: 'Makes you laugh until your stomach hurts', optionB: 'Makes you feel completely seen and understood' },
  { category: 'romance', question: 'Your favourite kind of date is…', optionA: 'Slow mornings with coffee and nowhere to be', optionB: 'A spontaneous night that turns into a story you tell for years' },
  // 🌹 Desires
  { category: 'desires', question: 'Your heart races most when your partner…', optionA: 'Unexpectedly pulls you close and whispers your name', optionB: 'Looks at you across a room like you\'re the only one there' },
  { category: 'desires', question: 'The thing you secretly crave most in a relationship is…', optionA: 'Complete vulnerability — being fully known and still chosen', optionB: 'A quiet, burning tension that makes every moment electric' },
  { category: 'desires', question: 'You feel most desired when…', optionA: 'They choose you again and again, even when they don\'t have to', optionB: 'They can\'t keep their eyes off you in a crowded room' },
  { category: 'desires', question: 'What you want most at the end of a hard day is…', optionA: 'To be held in silence by the person you love', optionB: 'To have them distract you completely from the world' },
  { category: 'desires', question: 'The kind of love you secretly crave most is…', optionA: 'Soft, steady and certain — like coming home', optionB: 'Intense, consuming and electric — like lightning in a storm' },
  { category: 'desires', question: 'The thought that makes you blush most is…', optionA: 'Being completely known — every flaw, every fear — and still adored', optionB: 'Being wanted so badly that they can\'t even hide it' },
  // 🎭 Fantasy
  { category: 'fantasy', question: 'In your romantic fantasy, you and your partner are…', optionA: 'Strangers who meet on a train in a foreign city', optionB: 'Childhood friends who finally realise they were always in love' },
  { category: 'fantasy', question: 'Your dream romantic escape is…', optionA: 'A secret cabin in the mountains, completely snowed in', optionB: 'A spontaneous flight to a city neither of you has been to' },
  { category: 'fantasy', question: 'You imagine the most passionate kiss happening…', optionA: 'In the rain, after a long, aching separation', optionB: 'Slow and deliberate, with nowhere else to be' },
  { category: 'fantasy', question: 'The role you play in your love fantasy…', optionA: 'The mysterious one who sweeps them off their feet', optionB: 'The devoted lover who knows every corner of their soul' },
  { category: 'fantasy', question: 'The romantic scene you\'d replay forever is…', optionA: 'Lying in bed talking until 4am about everything and nothing', optionB: 'That first moment when you both knew — and neither said it yet' },
  // 💑 Compatibility
  { category: 'compatibility', question: 'In a relationship, you are more…', optionA: 'The initiator — grand gestures, first to say "I love you"', optionB: 'The sustainer — steady presence, the one they always return to' },
  { category: 'compatibility', question: 'When things get difficult, you tend to…', optionA: 'Talk it through immediately — words help you process', optionB: 'Take space to think clearly, then return when you\'re ready' },
  { category: 'compatibility', question: 'Your love language leans more toward…', optionA: 'Physical touch and quality time', optionB: 'Words of affirmation and acts of service' },
  { category: 'compatibility', question: 'When you imagine your future together, you see…', optionA: 'A quiet life — a home, routines, deep familiarity', optionB: 'An adventurous life — always something new, always evolving' },
  { category: 'compatibility', question: 'The relationship dynamic that feels most natural is…', optionA: 'Being their safe harbour — constant and calm', optionB: 'Being their spark — exciting and ever-inspiring' },
  { category: 'compatibility', question: 'When you say "I need you", you mean…', optionA: 'You\'re my person — I can\'t imagine life without you', optionB: 'Right now, in this moment, please just be here with me' },
  // Mixed
  { category: 'romance', question: 'The most romantic thing your partner could do tomorrow is…', optionA: 'Leave a note somewhere only you would find it', optionB: 'Cancel everything and spend the whole day with just you' },
  { category: 'fantasy', question: 'The scenario that makes your heart race most is…', optionA: 'Being found and chosen by someone who adores you', optionB: 'Running away together from everything and everyone else' },
  // 🔥 Spicy
  { category: 'spicy', question: 'You prefer the vibe in bed to be…', optionA: 'Slow, sensual and deeply intimate — savour every second', optionB: 'Raw, intense and completely unrestrained — no holding back' },
  { category: 'spicy', question: 'When it comes to initiating, you are…', optionA: 'The one who makes the first move — you love the chase', optionB: 'The one who loves being chased and pulled in' },
  { category: 'spicy', question: 'The kind of dirty talk you\'re into is…', optionA: 'Whispered, intimate, close to the ear — soft and filthy', optionB: 'Bold and explicit — hearing exactly what they want to do to you' },
  { category: 'spicy', question: 'Your favourite place to be touched first is…', optionA: 'Neck and ears — you melt instantly', optionB: 'Waist and lower back — it sends electricity everywhere' },
  { category: 'spicy', question: 'When it comes to control in bed, you prefer…', optionA: 'Being in control — you love setting the pace and calling the shots', optionB: 'Letting go of control — being fully at their mercy' },
  { category: 'spicy', question: 'The fantasy you\'ve never admitted out loud is…', optionA: 'A strangers-in-a-hotel scenario — all desire, no names', optionB: 'Being completely blindfolded and surprised by your partner' },
  { category: 'spicy', question: 'What turns you on more outside the bedroom is…', optionA: 'A lingering look across the room that says everything without words', optionB: 'Their hand on the small of your back in public — knowing and possessive' },
  { category: 'spicy', question: 'The body part you find most irresistible on your partner is…', optionA: 'Their hands — the things they can do with them', optionB: 'Their lips — how they look before they kiss you' },
  { category: 'spicy', question: 'When it comes to foreplay, you believe…', optionA: 'The longer the better — build it until you can\'t stand it', optionB: 'Sometimes you want to skip straight to the good part' },
  { category: 'spicy', question: 'Your hottest sexual fantasy involves…', optionA: 'Being taken completely by surprise when you least expect it', optionB: 'A slow, deliberate seduction that plays out all night long' },
  { category: 'spicy', question: 'The thing that gets you in the mood fastest is…', optionA: 'Them being confident and knowing exactly what they want', optionB: 'The slow build — stolen glances, accidental touches, tension' },
  { category: 'spicy', question: 'When you\'re sexting, you prefer to…', optionA: 'Send explicit descriptions of exactly what you want them to do', optionB: 'Play coy and let the tension build with what you don\'t say' },
  { category: 'spicy', question: 'Your preferred location for sex, other than the bedroom, is…', optionA: 'Against the kitchen counter — spontaneous and urgent', optionB: 'In the shower — wet, hot and completely uninhibited' },
  { category: 'spicy', question: 'When it comes to trying new things in bed, you are…', optionA: 'Always down — the more adventurous the better', optionB: 'Open, but you need to feel completely safe and trusted first' },
  { category: 'spicy', question: 'The kind of sex you crave most right now is…', optionA: 'Passionate and emotional — where you feel completely connected', optionB: 'Purely physical — raw, animal and mindless' },
  { category: 'spicy', question: 'You find it hottest when your partner…', optionA: 'Takes charge completely and doesn\'t ask — just acts', optionB: 'Asks what you want in the most seductive way possible' },
  { category: 'spicy', question: 'After sex, you are more…', optionA: 'Clingy — you want to be held, talked to, stay tangled up', optionB: 'Euphoric and independent — you ride the high in your own space' },
  { category: 'spicy', question: 'The thing you want your partner to do more of in bed is…', optionA: 'Use their mouth — words, kisses, everything', optionB: 'Use their hands — on you, always, everywhere' },
  { category: 'spicy', question: 'Your biggest turn-on that\'s hard to admit is…', optionA: 'Being completely exposed and seen — raw vulnerability as foreplay', optionB: 'The power dynamic — knowing they want you so badly they lose control' },
  { category: 'spicy', question: 'The setting of your hottest sexual memory or fantasy is…', optionA: 'Somewhere risky — where you might get caught', optionB: 'Somewhere completely private — where you can be completely loud and free' },
];

function getDesirePromptIndex(recentList, category) {
  const pool = category === 'all'
    ? DESIRE_PROMPTS
    : DESIRE_PROMPTS.filter(p => p.category === category);
  const available = pool.map((_, i) => DESIRE_PROMPTS.indexOf(pool[i])).filter(i => !recentList.includes(i));
  if (available.length === 0) return Math.floor(Math.random() * DESIRE_PROMPTS.length);
  return available[Math.floor(Math.random() * available.length)];
}

const lovegameGames = new Map(); // gameKey -> { category, currentPrompt, recentPrompts[], answers{}, matchCount, totalCount }
// ─────────────────────────────────────────────────────────────────────────────

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

  // ─── Desire Meets Discretion Socket Events ───────────────────────────────

  function emitDesirePrompt(gameKey, game, userInfo, partnerInfo) {
    const payload = {
      question: game.currentPrompt.question,
      optionA: game.currentPrompt.optionA,
      optionB: game.currentPrompt.optionB,
      category: game.currentPrompt.category,
      matchCount: game.matchCount,
      totalCount: game.totalCount
    };
    if (userInfo) io.to(userInfo.socketId).emit('desire_new_prompt', payload);
    if (partnerInfo) io.to(partnerInfo.socketId).emit('desire_new_prompt', payload);
  }

  socket.on('desire_start', async ({ category = 'all' } = {}) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);

      const game = lovegameGames.get(gameKey) || { category: 'all', recentPrompts: [], answers: {}, currentPrompt: null, matchCount: 0, totalCount: 0 };
      game.category = category;
      const idx = getDesirePromptIndex(game.recentPrompts, category);
      game.recentPrompts.push(idx);
      if (game.recentPrompts.length > 8) game.recentPrompts.shift();
      game.currentPrompt = { ...DESIRE_PROMPTS[idx] };
      game.answers = {};
      lovegameGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      emitDesirePrompt(gameKey, game, userInfo, partnerInfo);
    } catch (err) {
      console.error('desire_start error:', err);
    }
  });

  socket.on('desire_answer', async ({ choice } = {}) => {
    if (choice !== 'A' && choice !== 'B') return;
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = lovegameGames.get(gameKey);
      if (!game || !game.currentPrompt) return;
      if (game.answers[userId]) return; // already answered

      game.answers[userId] = choice;
      lovegameGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);

      if (game.answers[userId] && game.answers[partnerId]) {
        // Both answered — build reveal
        const partnerUser = await User.findById(partnerId);
        const currentUser = await User.findById(userId);
        const isMatch = game.answers[userId] === game.answers[partnerId];
        game.totalCount += 1;
        if (isMatch) game.matchCount += 1;
        lovegameGames.set(gameKey, game);

        const revealPayload = {
          choices: { [userId]: game.answers[userId], [partnerId]: game.answers[partnerId] },
          names: { [userId]: currentUser ? currentUser.name : 'You', [partnerId]: partnerUser ? partnerUser.name : 'Partner' },
          isMatch,
          matchCount: game.matchCount,
          totalCount: game.totalCount,
          currentPrompt: game.currentPrompt
        };
        if (userInfo) io.to(userInfo.socketId).emit('desire_reveal', revealPayload);
        if (partnerInfo) io.to(partnerInfo.socketId).emit('desire_reveal', revealPayload);
      } else {
        // Only one answered — send waiting event to the person who just answered
        if (userInfo) io.to(userInfo.socketId).emit('desire_waiting');
      }
    } catch (err) {
      console.error('desire_answer error:', err);
    }
  });

  socket.on('desire_next', async () => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = lovegameGames.get(gameKey) || { category: 'all', recentPrompts: [], answers: {}, currentPrompt: null, matchCount: 0, totalCount: 0 };
      const idx = getDesirePromptIndex(game.recentPrompts, game.category || 'all');
      game.recentPrompts.push(idx);
      if (game.recentPrompts.length > 8) game.recentPrompts.shift();
      game.currentPrompt = { ...DESIRE_PROMPTS[idx] };
      game.answers = {};
      lovegameGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      emitDesirePrompt(gameKey, game, userInfo, partnerInfo);
    } catch (err) {
      console.error('desire_next error:', err);
    }
  });

  socket.on('desire_change_category', async ({ category = 'all' } = {}) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pairId) return;
      const partnerId = user.pairId.toString();
      const gameKey = getGameKey(userId, partnerId);
      const game = lovegameGames.get(gameKey) || { category: 'all', recentPrompts: [], answers: {}, currentPrompt: null, matchCount: 0, totalCount: 0 };
      game.category = category;
      game.recentPrompts = [];
      const idx = getDesirePromptIndex(game.recentPrompts, category);
      game.recentPrompts.push(idx);
      game.currentPrompt = { ...DESIRE_PROMPTS[idx] };
      game.answers = {};
      lovegameGames.set(gameKey, game);

      const userInfo = onlineUsers.get(userId);
      const partnerInfo = onlineUsers.get(partnerId);
      emitDesirePrompt(gameKey, game, userInfo, partnerInfo);
    } catch (err) {
      console.error('desire_change_category error:', err);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

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
