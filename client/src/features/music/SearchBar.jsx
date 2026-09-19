import React from 'react';
import { SearchIcon } from './icons';

export default function SearchBar({ value = '', onChange }) {
  return (
    <div className="music-search-container">
      <div className="music-search-card">
        <span className="music-search-icon" aria-hidden="true">
          <SearchIcon size={19} />
        </span>
        <input
          type="text"
          className="music-search-input"
          placeholder="Search by title or artist"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label="Search tracks"
        />
        {/* TODO: Wire up real-time filter predicate in follow-up prompt */}
      </div>
    </div>
  );
}
