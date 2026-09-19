import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config';
import { useMusicPlayer } from './useMusicPlayer';
import NowPlayingHero from './NowPlayingHero';
import SearchBar from './SearchBar';
import QueueList from './QueueList';
import { ArrowLeftIcon } from './icons';
import './music.css';

// Sample demonstration tracks matching the reference screenshot
const SAMPLE_TRACKS = [
  {
    _id: 'sample-1',
    title: 'Andheri Raatein',
    artist: 'Rameet',
    duration: '3:08',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786386019/presence/songs/hdhppqh0jebm9swkjasp.mp3'
  },
  {
    _id: 'sample-2',
    title: 'Khuda Jaane',
    artist: 'KK, Shilpa Rao',
    duration: '4:52',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786393680/presence/songs/oikaxp6fq4najorgm9pq.mp3'
  },
  {
    _id: 'sample-3',
    title: 'Soch Na Sake',
    artist: 'Amaal Mallik, Arijit Singh',
    duration: '4:08',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786386019/presence/songs/hdhppqh0jebm9swkjasp.mp3'
  },
  {
    _id: 'sample-4',
    title: 'Tera Yaar Hoon Main',
    artist: 'Arijit Singh',
    duration: '5:01',
    fileUrl: 'https://res.cloudinary.com/dcz4tgtft/video/upload/v1786393680/presence/songs/oikaxp6fq4najorgm9pq.mp3'
  }
];

export default function MusicPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ── Dynamic Theme Integration (Uses existing localStorage & CSS variables) ──
  const [bgColor, setBgColor] = useState(
    () => localStorage.getItem('presence_bgColor') || '#FAF9F7'
  );
  const [cardColor, setCardColor] = useState(
    () => localStorage.getItem('presence_cardColor') || '#FFFFFF'
  );

  // Sync theme changes if updated from Settings
  useEffect(() => {
    const handleStorageChange = () => {
      const savedBg = localStorage.getItem('presence_bgColor');
      const savedCard = localStorage.getItem('presence_cardColor');
      if (savedBg) setBgColor(savedBg);
      if (savedCard) setCardColor(savedCard);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Playback Engine Hook ──
  const {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    playTrack,
    seek,
    toggleShuffle,
    cycleRepeat,
    moveUp,
    moveDown,
    removeTrack,
    setQueue
  } = useMusicPlayer(SAMPLE_TRACKS);

  // ── Search Query State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch existing shared songs from backend
  const fetchSongs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/songs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setQueue(data);
        } else {
          setQueue(SAMPLE_TRACKS);
        }
      } else {
        setQueue(SAMPLE_TRACKS);
      }
    } catch (err) {
      console.error('Error fetching songs for Music page:', err);
      setQueue(SAMPLE_TRACKS);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [token]);

  // Upload handler reusing existing backend endpoint
  const handleUploadSong = async (file) => {
    if (!file || !token) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15MB limit.');
      setTimeout(() => setUploadError(''), 5000);
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('song', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/songs/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSongs();
        setUploadError('');
      } else {
        setUploadError(data.error || 'Upload failed.');
        setTimeout(() => setUploadError(''), 6000);
      }
    } catch {
      setUploadError('Network error uploading song.');
      setTimeout(() => setUploadError(''), 6000);
    } finally {
      setIsUploading(false);
    }
  };

  // Reorder handlers that map through track IDs for robustness
  const handleMoveUp = (track) => {
    const idx = tracks.findIndex((t) => t._id === track._id);
    if (idx > 0) {
      moveUp(idx);
    }
  };

  const handleMoveDown = (track) => {
    const idx = tracks.findIndex((t) => t._id === track._id);
    if (idx >= 0 && idx < tracks.length - 1) {
      moveDown(idx);
    }
  };

  // Live search filtering (filters view without mutating underlying queue/playback)
  const visibleTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.uploaderName && t.uploaderName.toLowerCase().includes(q))
    );
  }, [tracks, searchQuery]);

  const isDarkBg = ['#1C1F26'].includes(bgColor);

  return (
    <div
      className="music-page-wrapper"
      style={{
        backgroundColor: bgColor,
        color: isDarkBg ? '#F0F0F0' : undefined,
        '--card-bg': cardColor,
      }}
    >
      <div className="music-page-container">
        {/* Navigation Bar */}
        <div className="music-nav-bar">
          <button
            type="button"
            className="music-back-btn"
            onClick={() => navigate('/home')}
            aria-label="Back to home page"
          >
            <ArrowLeftIcon size={16} />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Page Header */}
        <header className="music-page-header">
          <h1 className="music-page-title">
            <span>Music</span>
            <span className="music-title-dot">•</span>
            <span className="music-title-badge">Synced Player</span>
          </h1>
          <p className="music-page-subtitle">
            Whatever's queued keeps playing until you stop it — no auto-pause between tracks.
          </p>
        </header>

        {/* 1. Now Playing Hero Card (Interactive Scrubber & Real Transport Engine) */}
        <NowPlayingHero
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={togglePlayPause}
          onNext={nextTrack}
          onPrev={prevTrack}
          onShuffle={toggleShuffle}
          onRepeat={cycleRepeat}
          onSeek={seek}
        />

        {/* 2. Live Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* 3. Queue / Track List */}
        <QueueList
          tracks={visibleTracks}
          totalCount={tracks.length}
          activeTrackId={currentTrack?._id}
          isUploading={isUploading}
          uploadError={uploadError}
          onUploadSong={handleUploadSong}
          onSelectTrack={playTrack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onRemoveTrack={removeTrack}
        />
      </div>
    </div>
  );
}
