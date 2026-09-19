import React from 'react';
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  MusicNoteIcon
} from './icons';

export default function NowPlayingHero({
  currentTrack,
  isPlaying = false,
  currentTime = '1:02',
  duration = '3:24',
  progressPercent = 32,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onRepeat
}) {
  // Fallback track details for layout demonstration when no track is queued
  const title = currentTrack?.title || 'Andheri Raatein';
  const artist = currentTrack?.artist || currentTrack?.uploaderName || 'Rameet';
  const trackDuration = currentTrack?.duration || duration || '3:24';

  return (
    <div className="music-hero-card" role="region" aria-label="Now Playing">
      {/* Top status line */}
      <div className="music-hero-top">
        <span className="music-hero-label">Now Playing</span>
        <div className="music-hero-continuous-pill" title="Playback continues continuously across queued tracks">
          <RepeatIcon size={14} color="var(--accent-color, #E8623F)" />
          <span>Continuous</span>
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
            <span className="music-badge-pill">{trackDuration}</span>
          </div>
        </div>
      </div>

      {/* Scrubber / Progress Bar */}
      <div className="music-scrubber-container">
        <span className="music-time-label">{currentTime}</span>

        {/* TODO: Connect interactive seek scrubber to audio element in next prompt */}
        <div className="music-scrubber-track" role="slider" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="music-scrubber-progress" style={{ width: `${progressPercent}%` }} />
          <div className="music-scrubber-thumb" style={{ left: `${progressPercent}%` }} />
        </div>

        <span className="music-time-label">{trackDuration}</span>
      </div>

      {/* Transport Controls */}
      <div className="music-controls-row">
        {/* Shuffle */}
        <button
          type="button"
          className="music-control-btn"
          onClick={onShuffle}
          title="Shuffle (TODO: wire up in follow-up)"
          aria-label="Shuffle"
        >
          {/* TODO: Wire up shuffle state toggling in follow-up prompt */}
          <ShuffleIcon size={19} />
        </button>

        {/* Previous */}
        <button
          type="button"
          className="music-control-btn"
          onClick={onPrev}
          title="Previous Track (TODO: wire up in follow-up)"
          aria-label="Previous track"
        >
          {/* TODO: Wire up track skipping in follow-up prompt */}
          <SkipBackIcon size={22} />
        </button>

        {/* Central Large Play / Pause button */}
        <button
          type="button"
          className="music-play-pause-btn"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {/* TODO: Wire up real HTML5 audio playback and synced timer in follow-up prompt */}
          {isPlaying ? <PauseIcon size={24} color="#FFFFFF" /> : <PlayIcon size={24} color="#FFFFFF" />}
        </button>

        {/* Next */}
        <button
          type="button"
          className="music-control-btn"
          onClick={onNext}
          title="Next Track (TODO: wire up in follow-up)"
          aria-label="Next track"
        >
          {/* TODO: Wire up track skipping in follow-up prompt */}
          <SkipForwardIcon size={22} />
        </button>

        {/* Repeat (Active accent state matches the reference image) */}
        <button
          type="button"
          className="music-control-btn active-accent"
          onClick={onRepeat}
          title="Repeat (TODO: wire up in follow-up)"
          aria-label="Repeat mode"
        >
          {/* TODO: Wire up repeat queue / single track logic in follow-up prompt */}
          <RepeatIcon size={19} color="var(--accent-color, #E8623F)" />
        </button>
      </div>
    </div>
  );
}
