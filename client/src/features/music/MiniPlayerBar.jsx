import React from 'react';
import { useMusic } from './MusicContext';
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon
} from './icons';

function formatSeconds(secs) {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function MiniPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    toggleShuffle,
    cycleRepeat
  } = useMusic();

  const formattedCurrent = formatSeconds(currentTime);
  const formattedDuration = formatSeconds(duration || (currentTrack?.duration ? 188 : 0));
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleScrubberChange = (e) => {
    const val = Number(e.target.value);
    seek(val);
  };

  return (
    <div
      className="home-music-mini-player"
      style={{
        marginTop: '12px',
        padding: '12px 14px',
        borderRadius: 'var(--radius, 14px)',
        backgroundColor: 'rgba(232, 98, 63, 0.04)',
        border: '1px solid rgba(232, 98, 63, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Scrubber row with timestamps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary, #6B6B6B)',
            minWidth: '28px',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formattedCurrent}
        </span>

        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={handleScrubberChange}
            disabled={!currentTrack || duration <= 0}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: (!currentTrack || duration <= 0) ? 'default' : 'pointer',
              zIndex: 2,
              margin: 0
            }}
            aria-label="Seek track"
          />
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(232, 98, 63, 0.15)',
              borderRadius: '999px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'var(--accent-color, #E8623F)',
                borderRadius: '999px',
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary, #6B6B6B)',
            minWidth: '28px',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formattedDuration}
        </span>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px'
        }}
      >
        {/* Shuffle Button */}
        <button
          type="button"
          onClick={toggleShuffle}
          title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: isShuffle ? 'var(--accent-color, #E8623F)' : 'var(--text-secondary, #6B6B6B)',
            transition: 'all 0.2s ease'
          }}
        >
          <ShuffleIcon size={16} />
        </button>

        {/* Previous Button */}
        <button
          type="button"
          onClick={prevTrack}
          title="Previous Track"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'var(--text-primary, #1A1A1A)',
            transition: 'all 0.2s ease'
          }}
        >
          <SkipBackIcon size={18} />
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--accent-color, #E8623F)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232, 98, 63, 0.3)',
            transition: 'transform 0.15s ease, background-color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isPlaying ? (
            <PauseIcon size={18} color="#FFFFFF" />
          ) : (
            <PlayIcon size={18} color="#FFFFFF" />
          )}
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={nextTrack}
          title="Next Track"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'var(--text-primary, #1A1A1A)',
            transition: 'all 0.2s ease'
          }}
        >
          <SkipForwardIcon size={18} />
        </button>

        {/* Repeat Button */}
        <button
          type="button"
          onClick={cycleRepeat}
          title={`Repeat mode: ${repeatMode}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: repeatMode !== 'off' ? 'var(--accent-color, #E8623F)' : 'var(--text-secondary, #6B6B6B)',
            transition: 'all 0.2s ease'
          }}
        >
          {repeatMode === 'one' ? (
            <RepeatOneIcon size={16} />
          ) : (
            <RepeatIcon size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
