const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Song = require('../models/Song');
const auth = require('../middleware/auth');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/songs');
    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate a unique safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Multer file filter config
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/x-pn-wav'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp3', '.wav'];

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP3 and WAV audio files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
});

// POST /api/songs/upload - Upload a song
router.post('/upload', auth, (req, res) => {
  // Check if user is paired
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to upload songs.' });
  }

  // Handle multer upload
  upload.single('song')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size allowed is 15MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an audio file.' });
    }

    try {
      const title = req.body.title || req.file.originalname;

      const song = new Song({
        title: title,
        fileUrl: `/uploads/songs/${req.file.filename}`,
        uploadedBy: req.user._id,
        pairId: req.user.pairId
      });

      await song.save();

      res.status(201).json({
        message: 'Song uploaded successfully!',
        song
      });
    } catch (dbErr) {
      res.status(500).json({ error: 'Database error saving song: ' + dbErr.message });
    }
  });
});

// GET /api/songs - Fetch all shared songs in the pair
router.get('/', auth, async (req, res) => {
  try {
    const partnerId = req.user.pairId;
    if (!partnerId) {
      return res.json([]);
    }

    // Return songs where pairId is either this user or their partner
    const songs = await Song.find({
      pairId: { $in: [req.user._id, partnerId] }
    }).sort({ createdAt: -1 });

    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve songs: ' + error.message });
  }
});

module.exports = router;
