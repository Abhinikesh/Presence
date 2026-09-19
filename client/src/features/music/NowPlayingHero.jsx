import React from 'react';
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  MusicNoteIcon
} from './icons';

function formatSeconds(secs) {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function NowPlayingHero({
  currentTrack,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  isShuffle = false,
  repeatMode = 'all',
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onRepeat,
  onSeek
}) {
  const title = currentTrack?.title || 'No track selected';
  const artist = currentTrack?.artist || currentTrack?.uploaderName || 'Presence Music';
  const formattedCurrentTime = formatSeconds(currentTime);
  const formattedDuration = formatSeconds(duration || (currentTrack?.duration ? 204 : 0));

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleScrubberChange = (e) => {
    const val = Number(e.target.value);
    onSeek?.(val);
  };

  return (
    <div className="music-hero-card" role="region" aria-label="Now Playing">
      {/* Top status line */}
      <div className="music-hero-top">
        <span className="music-hero-label">Now Playing</span>
        <div
          className="music-hero-continuous-pill"
          title={`Continuous Playback Engine: ${repeatMode === 'one' ? 'Repeating track' : repeatMode === 'all' ? 'Continuous loop' : 'Continuous queue'}`}
        >
          {repeatMode === 'one' ? (
            <RepeatOneIcon size={14} color="var(--accent-color, #E8623F)" />
          ) : (
            <RepeatIcon size={14} color="var(--accent-color, #E8623F)" />
          )}
          <span>{repeatMode === 'one' ? 'Repeat 1' : 'Continuous'}</span>
        </div>
      </div>

      {/* Main Track Info & Artwork */}
      <div className="music-hero-body">
        <div className="music-album-art" aria-hidden="true">
          <MusicNoteIcon size={44} color="#FFFFFF" />
        </div>

        <div className="music-track-meta">
          <h2 className="music-track-title" title={title}>{title}</h2>
          <span className="music-track-artist">{artist}</span>

          <div className="music-track-badges">
            <span className="music-badge-pill">Shared</span>
            <span className="music-badge-pill">{formattedDuration}</span>
          </div>
        </div>
      </div>

      {/* Interactive Progress Scrubber */}
      <div className="music-scrubber-container">
        <span className="music-time-label">{formattedCurrentTime}</span>

        <div className="music-scrubber-track-wrap">
          <input
            type="range"
            className="music-scrubber-input"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={handleScrubberChange}
            disabled={!currentTrack || duration <= 0}
            aria-label="Seek track position"
          />
          <div className="music-scrubber-track" aria-hidden="true">
            <div className="music-scrubber-progress" style={{ width: `${progressPercent}%` }} />
            <div className="music-scrubber-thumb" style={{ left: `${progressPercent}%` }} />
          </div>
        </div>

        <span className="music-time-label">{formattedDuration}</span>
      </div>

      {/* Transport Controls */}
      <div className="music-controls-row">
        {/* Shuffle */}
        <button
          type="button"
          className={`music-control-btn ${isShuffle ? 'active-accent' : ''}`}
          onClick={onShuffle}
          title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          aria-label="Shuffle"
        >
          <ShuffleIcon
            size={19}
            color={isShuffle ? 'var(--accent-color, #E8623F)' : 'var(--text-secondary, #6B6B6B)'}
          />
        </button>

        {/* Previous */}
        <button
          type="button"
          className="music-control-btn"
          onClick={onPrev}
          title="Previous Track"
          aria-label="Previous track"
          disabled={!currentTrack}
        >
          <SkipBackIcon size={22} />
        </button>

        {/* Central Large Play / Pause button */}
        <button
          type="button"
          className="music-play-pause-btn"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!currentTrack}
        >
          {isPlaying ? <PauseIcon size={24} color="#FFFFFF" /> : <PlayIcon size={24} color="#FFFFFF" />}
        </button>

        {/* Next */}
        <button
          type="button"
          className="music-control-btn"
          onClick={onNext}
          title="Next Track"
          aria-label="Next track"
          disabled={!currentTrack}
        >
          <SkipForwardIcon size={22} />
        </button>

        {/* Repeat Toggle */}
        <button
          type="button"
          className={`music-control-btn ${repeatMode !== 'off' ? 'active-accent' : ''}`}
          onClick={onRepeat}
          title={`Repeat mode: ${repeatMode.toUpperCase()} (Click to cycle)`}
          aria-label="Repeat mode"
        >
          {repeatMode === 'one' ? (
            <RepeatOneIcon size={19} color="var(--accent-color, #E8623F)" />
          ) : (
            <RepeatIcon
              size={19}
              color={repeatMode === 'all' ? 'var(--accent-color, #E8623F)' : 'var(--text-secondary, #6B6B6B)'}
            />
          )}
        </button>
      </div>
    </div>
  );
}
