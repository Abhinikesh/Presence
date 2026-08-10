const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Song = require('../models/Song');
const auth = require('../middleware/auth');
const { cloudinary, musicStorage } = require('../utils/cloudinary');

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
  storage: musicStorage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Normalize a filename for duplicate comparison
function normalizeTitle(name) {
  return name
    .replace(/\.[^.]+$/, '')   // strip extension
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Helper — emit to partner if online
function emitToPartner(req, event, payload) {
  try {
    const io          = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const partnerId   = req.user.pairId?.toString();
    if (!io || !onlineUsers || !partnerId) return;
    const partnerInfo = onlineUsers.get(partnerId);
    if (partnerInfo) io.to(partnerInfo.socketId).emit(event, payload);
  } catch (_) {}
}

// POST /upload
router.post('/upload', auth, (req, res) => {
  if (!req.user.pairId) {
    return res.status(400).json({ error: 'You must be paired to upload songs.' });
  }

  upload.single('song')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum allowed is 15 MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an audio file.' });
    }

    try {
      const rawTitle   = req.body.title || req.file.originalname;
      const normalized = normalizeTitle(rawTitle);

      // ── Duplicate check: same user, same normalised title ──────────────
      const existing = await Song.findOne({
        uploadedBy: req.user._id,
        normalizedTitle: normalized
      });

      if (existing) {
        // Delete the just-uploaded file from Cloudinary so we don't waste storage
        if (req.file.filename) {
          await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' })
            .catch(() => {});
        }
        return res.status(409).json({
          error: `You already uploaded "${existing.title}". Duplicate songs are not allowed.`
        });
      }

      // ── Save to DB ─────────────────────────────────────────────────────
      const song = new Song({
        title:           rawTitle,
        normalizedTitle: normalized,
        fileUrl:         req.file.path,
        publicId:        req.file.filename,
        uploadedBy:      req.user._id,
        pairId:          req.user.pairId
      });
      await song.save();

      // ── Notify partner in real-time ────────────────────────────────────
      emitToPartner(req, 'song_added', song);

      res.status(201).json({ message: 'Song uploaded successfully!', song });
    } catch (dbErr) {
      res.status(500).json({ error: 'Database error: ' + dbErr.message });
    }
  });
});

// GET / — shared songs for this pair
router.get('/', auth, async (req, res) => {
  try {
    const partnerId = req.user.pairId;
    if (!partnerId) return res.json([]);
    const songs = await Song.find({
      pairId: { $in: [req.user._id, partnerId] }
    }).sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve songs: ' + error.message });
  }
});

// DELETE /:id — only the uploader can delete their own song
router.delete('/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found.' });

    // Only the uploader can delete
    if (song.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete songs you uploaded.' });
    }

    // Delete from Cloudinary
    if (song.publicId) {
      await cloudinary.uploader.destroy(song.publicId, { resource_type: 'video' })
        .catch(() => {});
    }

    await song.deleteOne();

    // ── Notify partner in real-time ────────────────────────────────────
    emitToPartner(req, 'song_deleted', { _id: req.params.id });

    res.json({ message: 'Song deleted.', _id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed: ' + err.message });
  }
});

module.exports = router;
