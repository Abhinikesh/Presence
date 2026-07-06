const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRouter = require('./routes/auth');
const pairRouter = require('./routes/pair');

// Single test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Route Middlewares
app.use('/api/auth', authRouter);
app.use('/api/pair', pairRouter);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development template, can restrict later
    methods: ['GET', 'POST']
  }
});

// In-memory mapping of online users: userId -> { socketId, status }
const onlineUsers = new Map();

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
    console.log(`User ${userId} updated status to: ${status}`);

    try {
      const user = await User.findById(userId);
      if (user && user.pairId) {
        const partnerId = user.pairId.toString();
        const partnerInfo = onlineUsers.get(partnerId);
        if (partnerInfo) {
          io.to(partnerInfo.socketId).emit('partner_status_update', { status });
        }
      }
    } catch (err) {
      console.error(`Error broadcasting status update for user ${userId}:`, err);
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
