import React, { useState } from 'react';
import MediaThumbnail from './MediaThumbnail';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ConfirmDialog from '../common/ConfirmDialog';
import { useApp } from '../../context/AppContext';
import { uploadPost, uploadVideoPost } from '../../api/postsApi';
import { deleteFile } from '../../api/filesApi';
import {
  Send,
  Tag,
  AlertOctagon,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function PostCard({
  post,
  flairs = [],
  selectedAccount,
  uploadType = 'images',
  onUploadSuccess,
  onFileDeleted,
  onPlayVideo,
}) {
  const { showToast } = useApp();

  const [caption, setCaption] = useState('');
  const [selectedFlair, setSelectedFlair] = useState(
    flairs.length > 0 ? flairs[0].id : ''
  );
  const [isNsfw, setIsNsfw] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState(post.files || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isVideo = uploadType === 'videos';

  // Toggle single file selection
  const handleToggleFile = (file) => {
    if (isVideo) {
      // For video, only one is active at a time
      setSelectedFiles([file]);
      return;
    }
    setSelectedFiles(prev =>
      prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
    );
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedFiles.length === post.files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles([...post.files]);
    }
  };

  // Computed Reddit post title
  const computedTitle = `"${post.name}"${caption.trim() ? ` - ${caption.trim()}` : ''}`;

  // Handle file deletion confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFile({ filename: fileToDelete, type: uploadType });
      showToast(`Deleted ${fileToDelete}`, 'success');
      if (onFileDeleted) {
        onFileDeleted(post.uniqueId, fileToDelete);
      }
      setSelectedFiles(prev => prev.filter(f => f !== fileToDelete));
      setFileToDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete file', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit post to Reddit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAccount) {
      showToast('Please select a Reddit account from the top bar.', 'warning');
      return;
    }

    if (flairs.length > 0 && !selectedFlair) {
      showToast('Please select a post flair.', 'warning');
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Please select at least one file to post.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (isVideo) {
        res = await uploadVideoPost({
          accountUsername: selectedAccount,
          username: post.username,
          caption: caption.trim(),
          flairId: selectedFlair,
          videoToUpload: selectedFiles[0],
          isNsfw,
        });
      } else {
        res = await uploadPost({
          accountUsername: selectedAccount,
          username: post.username,
          caption: caption.trim(),
          flairId: selectedFlair,
          imagesToUpload: selectedFiles,
          isNsfw,
        });
      }

      showToast(res.message || 'Successfully posted to Reddit!', 'success');
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      showToast(err.message || 'Failed to post to Reddit.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-800/80 p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden transition-all hover:border-slate-700/80">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-reddit-orange to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
            {(post.name || post.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                {post.name}
              </h3>
              <Badge variant="neutral">@{post.username}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {post.files.length} {isVideo ? 'video' : 'image'}
              {post.files.length === 1 ? '' : 's'} available in staging
            </p>
          </div>
        </div>

        {/* Multi-select Controls (for images) */}
        {!isVideo && post.files.length > 1 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors self-start sm:self-auto py-1 px-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60"
          >
            {selectedFiles.length === post.files.length ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-reddit-orange" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Select All ({post.files.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Media Thumbnails Grid */}
      <div className="py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {post.files.map(file => (
            <MediaThumbnail
              key={file}
              file={file}
              type={uploadType}
              isSelected={selectedFiles.includes(file)}
              onToggleSelect={handleToggleFile}
              onDelete={setFileToDelete}
              onPlay={onPlayVideo}
            />
          ))}
        </div>
      </div>

      {/* Post Details & Form Controls */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-800/80 space-y-4">
        {/* Caption & Title Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Optional Caption (appended to name)</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              Live Preview
            </span>
          </div>

          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="e.g. Exclusive photoshoot preview"
            className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent transition-all shadow-sm"
          />

          {/* Formatted Title Preview Bar */}
          <div className="px-3 py-2 bg-slate-900/90 rounded-lg border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400 font-medium shrink-0">Title:</span>
            <span className="text-reddit-orange font-semibold truncate">
              {computedTitle}
            </span>
          </div>
        </div>

        {/* Options Row: Flair, NSFW Toggle, Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            {/* Flair Selector */}
            {flairs.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedFlair}
                  onChange={e => setSelectedFlair(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent cursor-pointer shadow-sm"
                >
                  {flairs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.text}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* NSFW Toggle Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isNsfw}
                onChange={e => setIsNsfw(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                NSFW
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting || selectedFiles.length === 0}
              icon={Send}
            >
              {isSubmitting
                ? 'Posting to Reddit...'
                : `Post ${selectedFiles.length} ${isVideo ? 'Video' : 'Image'}${
                    selectedFiles.length === 1 ? '' : 's'
                  }`}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Single File Modal */}
      <ConfirmDialog
        isOpen={Boolean(fileToDelete)}
        title="Delete Staged File"
        message={`Are you sure you want to permanently delete "${fileToDelete}"? This cannot be undone.`}
        confirmText="Delete File"
        cancelText="Keep File"
        onConfirm={handleConfirmDelete}
        onCancel={() => setFileToDelete(null)}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
