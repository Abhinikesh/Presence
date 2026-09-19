import React, { useRef } from 'react';
import {
  UploadIcon,
  SoundWaveIcon,
  MusicNoteIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CloseIcon
} from './icons';

export default function QueueList({
  tracks = [],
  totalCount,
  activeTrackId,
  isUploading = false,
  uploadError = '',
  onUploadSong,
  onSelectTrack,
  onMoveUp,
  onMoveDown,
  onRemoveTrack
}) {
  const fileInputRef = useRef(null);
  const displayCount = totalCount !== undefined ? totalCount : tracks.length;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadSong) {
      onUploadSong(file);
      e.target.value = null;
    }
  };

  return (
    <section className="music-queue-section" aria-label="Playback Queue">
      {/* Queue Header */}
      <div className="music-queue-header">
        <div className="music-queue-title-wrap">
          <h3 className="music-queue-title">Queue</h3>
          <span className="music-queue-count">
            {displayCount} {displayCount === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="music-upload-btn"
            onClick={handleUploadClick}
            disabled={isUploading}
            title="Upload Song (MP3/WAV, max 15MB)"
          >
            <UploadIcon size={16} color="#FFFFFF" />
            <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div style={{ color: '#EF4444', fontSize: '0.8125rem', padding: '0 4px' }}>
          {uploadError}
        </div>
      )}

      {/* Queue Track List */}
      <div className="music-queue-list">
        {tracks.length === 0 ? (
          <div className="music-queue-empty">
            <MusicNoteIcon size={36} color="var(--text-secondary, #9CA3AF)" />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No tracks found</p>
            <p style={{ fontSize: '0.8125rem' }}>
              {displayCount === 0 ? 'Click Upload above to add songs to your shared queue.' : 'No tracks match your search filter.'}
            </p>
          </div>
        ) : (
          tracks.map((track, index) => {
            const isActive = activeTrackId
              ? track._id === activeTrackId
              : index === 0;

            const title = track.title || 'Untitled Track';
            const artist = track.artist || track.uploaderName || 'Shared Track';
            const duration = track.duration || '3:30';

            return (
              <div
                key={track._id || index}
                className={`music-track-row ${isActive ? 'active-row' : ''}`}
              >
                {/* Index or Soundwave for active */}
                <div className="music-row-index">
                  {isActive ? (
                    <span className="music-row-soundwave" title="Currently playing">
                      <SoundWaveIcon size={18} color="var(--accent-color, #E8623F)" />
                    </span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Album Art Thumbnail */}
                <div className="music-row-art" aria-hidden="true">
                  <MusicNoteIcon size={20} color="#FFFFFF" />
                </div>

                {/* Title & Artist */}
                <div
                  className="music-row-info"
                  onClick={() => onSelectTrack?.(track)}
                  style={{ cursor: 'pointer' }}
                  title="Click to play track"
                >
                  <span className="music-row-title">{title}</span>
                  <span className="music-row-artist">{artist}</span>
                </div>

                {/* Actions: Duration + Move Up + Move Down + Delete */}
                <div className="music-row-actions">
                  <span className="music-row-duration">{duration}</span>

                  {/* Move Up */}
                  <button
                    type="button"
                    className="music-action-btn"
                    onClick={() => onMoveUp?.(track, index)}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.35 : 1 }}
                    title="Move up in queue"
                    aria-label="Move track up"
                  >
                    <ArrowUpIcon size={16} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    className="music-action-btn"
                    onClick={() => onMoveDown?.(track, index)}
                    disabled={index === tracks.length - 1}
                    style={{ opacity: index === tracks.length - 1 ? 0.35 : 1 }}
                    title="Move down in queue"
                    aria-label="Move track down"
                  >
                    <ArrowDownIcon size={16} />
                  </button>

                  {/* Remove */}
                  <button
                    type="button"
                    className="music-action-btn delete-btn"
                    onClick={() => onRemoveTrack?.(track)}
                    title="Remove from queue"
                    aria-label="Remove track"
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
