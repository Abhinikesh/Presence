import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config';
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
    duration: '3:24'
  },
  {
    _id: 'sample-2',
    title: 'Khuda Jaane',
    artist: 'KK, Shilpa Rao',
    duration: '4:52'
  },
  {
    _id: 'sample-3',
    title: 'Soch Na Sake',
    artist: 'Amaal Mallik, Arijit Singh',
    duration: '4:08'
  },
  {
    _id: 'sample-4',
    title: 'Tera Yaar Hoon Main',
    artist: 'Arijit Singh',
    duration: '5:01'
  }
];

export default function MusicPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

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

  // ── Tracks & Queue State ──
  const [songs, setSongs] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
          setSongs(data);
          setActiveTrack(data[0]);
        } else {
          // If no songs uploaded yet, display sample queue from reference design
          setSongs(SAMPLE_TRACKS);
          setActiveTrack(SAMPLE_TRACKS[0]);
        }
      } else {
        setSongs(SAMPLE_TRACKS);
        setActiveTrack(SAMPLE_TRACKS[0]);
      }
    } catch (err) {
      console.error('Error fetching songs for Music page:', err);
      setSongs(SAMPLE_TRACKS);
      setActiveTrack(SAMPLE_TRACKS[0]);
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

  // Handlers for transport controls
  const handlePlayPause = () => {
    // TODO: Wire up real HTML5 audio playback and synced partner playback in follow-up prompt
    setIsPlaying((prev) => !prev);
  };

  const handleNext = () => {
    // TODO: Wire up next track in queue logic in follow-up prompt
    const currentIndex = songs.findIndex((s) => s._id === activeTrack?._id);
    if (currentIndex >= 0 && currentIndex < songs.length - 1) {
      setActiveTrack(songs[currentIndex + 1]);
    } else if (songs.length > 0) {
      setActiveTrack(songs[0]);
    }
  };

  const handlePrev = () => {
    // TODO: Wire up previous track in queue logic in follow-up prompt
    const currentIndex = songs.findIndex((s) => s._id === activeTrack?._id);
    if (currentIndex > 0) {
      setActiveTrack(songs[currentIndex - 1]);
    }
  };

  const handleSelectTrack = (track) => {
    // TODO: Wire up track switching and audio src loading in follow-up prompt
    setActiveTrack(track);
    setIsPlaying(true);
  };

  const handleMoveUp = (index) => {
    // TODO: Wire up queue reordering and socket sync in follow-up prompt
    if (index <= 0) return;
    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, moved);
    setSongs(reordered);
  };

  const handleMoveDown = (index) => {
    // TODO: Wire up queue reordering and socket sync in follow-up prompt
    if (index >= songs.length - 1) return;
    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    setSongs(reordered);
  };

  const handleRemoveTrack = async (track) => {
    // TODO: Wire up persistent queue item deletion in follow-up prompt
    setSongs((prev) => prev.filter((s) => s._id !== track._id));
    if (activeTrack?._id === track._id) {
      const remaining = songs.filter((s) => s._id !== track._id);
      setActiveTrack(remaining[0] || null);
    }
  };

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

        {/* 1. Now Playing Hero Card */}
        <NowPlayingHero
          currentTrack={activeTrack}
          isPlaying={isPlaying}
          currentTime="1:02"
          duration={activeTrack?.duration || '3:24'}
          progressPercent={32}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onShuffle={() => { /* TODO: Toggle shuffle in follow-up */ }}
          onRepeat={() => { /* TODO: Toggle repeat in follow-up */ }}
        />

        {/* 2. Search Bar */}
        {/* TODO: Wire up real-time search query filtering on queue tracks in follow-up prompt */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* 3. Queue / Track List */}
        <QueueList
          tracks={songs}
          activeTrackId={activeTrack?._id}
          isUploading={isUploading}
          uploadError={uploadError}
          onUploadSong={handleUploadSong}
          onSelectTrack={handleSelectTrack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onRemoveTrack={handleRemoveTrack}
        />
      </div>
    </div>
  );
}
