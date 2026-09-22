import React, { useEffect, useState } from 'react';
import { X, FileVideo } from 'lucide-react';

export default function FilePreviewGrid({ files = [], onRemoveFile, uploadType = 'images' }) {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setPreviews([]);
      return;
    }

    const objectUrls = files.map(file => {
      if (file.type && file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });

    setPreviews(objectUrls);

    return () => {
      objectUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  if (!files || files.length === 0) return null;

  const formatSize = bytes => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-300">
          Selected Files ({files.length})
        </span>
        <span>
          Total:{' '}
          {formatSize(files.reduce((acc, f) => acc + (f.size || 0), 0))}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
        {files.map((file, index) => {
          const previewUrl = previews[index];
          const isImage = uploadType === 'images' && previewUrl;

          return (
            <div
              key={`${file.name}-${index}`}
              className="group relative rounded-xl border border-slate-700/80 bg-slate-900/80 overflow-hidden flex flex-col shadow-sm"
            >
              {/* Media Preview or Icon Box */}
              <div className="h-28 w-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <FileVideo className="w-8 h-8 text-sky-400 mb-1" />
                    <span className="text-[10px] uppercase font-bold text-sky-400/80">
                      Video
                    </span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/70 hover:bg-rose-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* File Info */}
              <div className="p-2 bg-slate-900/90 flex flex-col justify-between">
                <p className="text-[11px] font-medium text-slate-200 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
