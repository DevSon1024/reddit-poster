import React from 'react';
import LazyMedia from '../common/LazyMedia';
import { Play, Check, Trash2 } from 'lucide-react';

export default function MediaThumbnail({
  file,
  type = 'images',
  isSelected = true,
  onToggleSelect,
  onDelete,
  onPlay,
}) {
  const isVideo = type === 'videos';

  return (
    <div
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 aspect-square bg-slate-900 ${
        isSelected
          ? 'border-reddit-orange shadow-sm ring-1 ring-reddit-orange/60'
          : 'border-slate-800 opacity-60 hover:opacity-100'
      }`}
    >
      {/* Media Image / Video Thumbnail */}
      <LazyMedia
        type={type}
        src={file}
        alt={file}
        className="w-full h-full object-cover"
        onPlayClick={isVideo ? () => onPlay && onPlay(file) : undefined}
      />

      {/* Select Toggle Overlay (Top-Left) */}
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          if (onToggleSelect) onToggleSelect(file);
        }}
        className={`absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all z-10 ${
          isSelected
            ? 'bg-reddit-orange text-white shadow-md'
            : 'bg-black/60 backdrop-blur-sm border border-white/20 text-transparent hover:text-white/70'
        }`}
        title={isSelected ? 'Deselect from post' : 'Select for post'}
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Delete Button (Top-Right) */}
      {onDelete && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete(file);
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-950/80 hover:border-rose-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete file permanently"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Center Video Play Icon Button */}
      {isVideo && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (onPlay) onPlay(file);
          }}
          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-reddit-orange/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 z-10"
          title="Play video"
        >
          <Play className="w-4 h-4 fill-white translate-x-0.5" />
        </button>
      )}

      {/* Bottom Filename Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-slate-300 truncate font-mono">{file}</p>
      </div>
    </div>
  );
}
