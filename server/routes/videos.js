const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const { videoStorage } = require('../utils/cloudinary');

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp4', '.webm', '.mov', '.mkv', '.ogg'];
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP4, WEBM, and MOV video files are allowed.'));
  }
};

const upload = multer({
  storage: videoStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/upload', auth, (req, res) => {
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to upload videos.' });
  }

  upload.single('video')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size allowed is 100MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a video file.' });
    }

    try {
      const title = req.body.title || req.file.originalname;
      const video = new Video({
        title: title,
        fileUrl: req.file.path,
        publicId: req.file.filename,
        uploadedBy: req.user._id,
        pairId: req.user.pairId
      });
      await video.save();
      res.status(201).json({ message: 'Video uploaded successfully!', video });
    } catch (dbErr) {
      res.status(500).json({ error: 'Database error saving video: ' + dbErr.message });
    }
  });
});

router.get('/', auth, async (req, res) => {
  try {
    const partnerId = req.user.pairId;
    if (!partnerId) {
      return res.json([]);
    }
    const videos = await Video.find({
      pairId: { $in: [req.user._id, partnerId] }
    }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching videos: ' + error.message });
  }
});

module.exports = router;
