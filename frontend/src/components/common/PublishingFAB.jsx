import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  ChevronUp,
  ChevronDown,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Radio,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';

export default function PublishingFAB() {
  const {
    uploads,
    activeUploadsCount,
    isFabExpanded,
    toggleFabExpanded,
    setIsFabExpanded,
    removeUpload,
    clearCompletedUploads,
  } = useApp();

  const panelRef = useRef(null);
  const fabButtonRef = useRef(null);

  // Close panel on Escape key or outside click
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isFabExpanded) {
        setIsFabExpanded(false);
      }
    }

    function handleClickOutside(e) {
      if (!isFabExpanded) return;
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        fabButtonRef.current &&
        !fabButtonRef.current.contains(e.target)
      ) {
        setIsFabExpanded(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFabExpanded, setIsFabExpanded]);

  const hasItems = uploads.length > 0;
  const isPublishing = activeUploadsCount > 0;
  const completedCount = uploads.filter(u => u.status === 'completed').length;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Expanded Uploads / Publishing Panel */}
      {isFabExpanded && (
        <div
          ref={panelRef}
          id="publishing-queue-panel"
          className="mb-3 w-[calc(100vw-3rem)] sm:w-[420px] max-h-[75vh] flex flex-col glass-panel rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden animate-fade-in"
          style={{ transformOrigin: 'bottom right' }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isPublishing
                    ? 'bg-reddit-orange/20 text-reddit-orange border border-reddit-orange/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isPublishing ? (
                  <UploadCloud className="w-4 h-4 animate-pulse" />
                ) : (
                  <Radio className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                  Posting to Reddit
                  {isPublishing && (
                    <span className="w-2 h-2 rounded-full bg-reddit-orange animate-ping" />
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isPublishing
                    ? `${activeUploadsCount} currently publishing`
                    : hasItems
                    ? `${completedCount} completed`
                    : 'Queue is idle'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {uploads.some(u => u.status !== 'publishing') && (
                <button
                  type="button"
                  onClick={clearCompletedUploads}
                  title="Clear finished items"
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear finished</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFabExpanded(false)}
                title="Collapse panel"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel Body: Uploads List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[50vh] divide-y divide-slate-800/60">
            {hasItems ? (
              uploads.map((item, idx) => {
                const isItemPublishing = item.status === 'publishing';
                const isItemCompleted = item.status === 'completed';
                const isItemError = item.status === 'error';
                const mediaLabel = item.type === 'videos' ? 'Videos' : 'Images';

                return (
                  <div
                    key={item.id || idx}
                    className={`pt-2.5 first:pt-0 rounded-xl p-2.5 transition-all ${
                      isItemPublishing
                        ? 'bg-slate-900/60 border border-orange-500/20 shadow-sm'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Avatar / Type Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-md ${
                          isItemPublishing
                            ? 'bg-gradient-to-tr from-reddit-orange to-amber-500 text-white animate-pulse'
                            : isItemCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isItemPublishing ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isItemCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>

                      {/* Middle: Details in requested format */}
                      <div className="flex-1 min-w-0">
                        {/* Name and Count in format: Anushka Sen (9 {Images/videos}) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100 truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                            ({item.count} {mediaLabel})
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {'{Images/videos}'}
                          </span>
                        </div>

                        {/* Status detail and progress */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {isItemPublishing && (
                            <div className="flex items-center gap-1.5 text-orange-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                              <span>Posting to Reddit...</span>
                            </div>
                          )}

                          {isItemCompleted && (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Published to Reddit
                            </span>
                          )}

                          {isItemError && (
                            <span className="text-rose-400 font-medium truncate">
                              Error: {item.error || 'Upload failed'}
                            </span>
                          )}

                          {item.account && (
                            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/60 truncate">
                              u/{item.account}
                            </span>
                          )}
                        </div>

                        {/* Animated progress bar while publishing */}
                        {isItemPublishing && (
                          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full animate-pulse w-3/4" />
                          </div>
                        )}

                        {/* View on Reddit button if URL returned */}
                        {item.url && (
                          <div className="mt-1.5">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2"
                            >
                              <span>View live post on Reddit</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right: Dismiss button */}
                      <button
                        type="button"
                        onClick={() => removeUpload(item.id)}
                        className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400">
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                <p className="text-xs font-semibold text-slate-300">
                  No active uploads in queue
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Clicking "Post to Reddit" on any model will show real-time publishing status here.
                </p>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click FAB to collapse list</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        ref={fabButtonRef}
        id="publishing-fab-toggle"
        type="button"
        onClick={toggleFabExpanded}
        aria-expanded={isFabExpanded}
        aria-label={
          isFabExpanded
            ? 'Hide Reddit publishing queue'
            : isPublishing
            ? `${activeUploadsCount} posts publishing to Reddit - click to expand`
            : 'Open Reddit publishing queue'
        }
        className={`group relative flex items-center gap-2.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:ring-offset-2 focus:ring-offset-slate-950 ${
          isPublishing
            ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-2 border-orange-500 text-white px-4 py-3 shadow-orange-500/30'
            : isFabExpanded
            ? 'bg-slate-800 border border-slate-600 text-white px-4 py-3 shadow-black/50'
            : hasItems
            ? 'bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-slate-200 px-3.5 py-2.5 shadow-lg'
            : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white px-3.5 py-2.5 shadow-lg'
        }`}
      >
        {/* Glow halo when publishing */}
        {isPublishing && (
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 opacity-60 blur-sm animate-pulse pointer-events-none" />
        )}

        {/* Icon & Spinning Indicator */}
        <div className="relative flex items-center justify-center">
          {isPublishing ? (
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
              <UploadCloud className="w-3.5 h-3.5 text-reddit-orange animate-pulse" />
            </div>
          ) : isFabExpanded ? (
            <ChevronDown className="w-5 h-5 text-orange-400 transition-transform" />
          ) : (
            <div className="relative w-5 h-5 flex items-center justify-center">
              <UploadCloud className="w-4 h-4 text-slate-300 group-hover:text-reddit-orange transition-colors" />
              {completedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
          )}
        </div>

        {/* Text Label & Publishing Indication */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold tracking-tight ${
                isPublishing ? 'text-white' : 'text-slate-200'
              }`}
            >
              {isPublishing
                ? 'Posting to Reddit'
                : isFabExpanded
                ? 'Publishing Queue'
                : 'Posting to Reddit'}
            </span>

            {/* Glowing dot when publishing */}
            {isPublishing && (
              <span className="w-2 h-2 rounded-full bg-reddit-orange animate-ping" />
            )}
          </div>

          {/* Subtitle / Counter */}
          <span className="text-[10px] text-slate-400 -mt-0.5">
            {isPublishing
              ? `${activeUploadsCount} ${
                  activeUploadsCount === 1 ? 'uploading...' : 'uploading...'
                }`
              : isFabExpanded
              ? 'Click to collapse'
              : hasItems
              ? `${completedCount} completed`
              : 'Idle'}
          </span>
        </div>

        {/* Badge with Count */}
        {isPublishing ? (
          <span className="relative flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-black bg-gradient-to-tr from-reddit-orange to-amber-500 text-white rounded-full shadow-md animate-bounce">
            {activeUploadsCount}
          </span>
        ) : hasItems ? (
          <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            {uploads.length}
          </span>
        ) : (
          <ChevronUp
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isFabExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
    </div>
  );
}
