import React, { useState, useEffect, useCallback, useRef } from 'react';
import PostCard from './PostCard';
import VideoModal from './VideoModal';
import { Skeleton, EmptyState, Spinner } from '../common/Spinner';
import { useApp } from '../../context/AppContext';
import { fetchPendingPosts } from '../../api/postsApi';
import { Search, FolderOpen } from 'lucide-react';

export default function PostsView({ type = 'images' }) {
  const { selectedAccount, flairs, showToast, refreshTrigger, setCounts } = useApp();

  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);

  // Fetch posts callback
  const loadPosts = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!selectedAccount) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await fetchPendingPosts({
          page: pageToLoad,
          limit: 10,
          type,
        });

        // Split posts if images exceed 20
        const rawPosts = data.posts || [];
        const processedPosts = rawPosts
          .map(post => {
            if (post.fileCount > 20 && type === 'images') {
              const numParts = Math.ceil(post.fileCount / 20);
              return Array.from({ length: numParts }, (_, i) => ({
                ...post,
                files: post.files.slice(i * 20, (i + 1) * 20),
                part: i + 1,
                uniqueId: `${post.username}-${i + 1}`,
              }));
            }
            return { ...post, part: 0, uniqueId: post.username };
          })
          .flat();

        setPosts(prev => (append ? [...prev, ...processedPosts] : processedPosts));
        setHasMore(Boolean(data.hasMore));
        setCurrentPage(pageToLoad);

        // Update counts in header
        const totalFiles = rawPosts.reduce((acc, p) => acc + (p.fileCount || 0), 0);
        setCounts(prev => ({
          ...prev,
          [type]: totalFiles,
        }));
      } catch (err) {
        showToast(`Failed to load pending ${type}: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedAccount, type, showToast, setCounts]
  );

  // Re-fetch on account or type or refreshTrigger change
  useEffect(() => {
    loadPosts(1, false);
  }, [selectedAccount, type, refreshTrigger, loadPosts]);

  // Infinite Scroll Observer
  const observerRef = useRef();
  const lastElementRef = useCallback(
    node => {
      if (isLoading || isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadPosts(currentPage + 1, true);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, isLoadingMore, hasMore, currentPage, loadPosts]
  );

  const handleUploadSuccess = useCallback(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  const handleFileDeleted = useCallback((uniqueId, deletedFile) => {
    setPosts(prevPosts =>
      prevPosts
        .map(p => {
          if (p.uniqueId === uniqueId) {
            const remaining = p.files.filter(f => f !== deletedFile);
            return {
              ...p,
              files: remaining,
              fileCount: remaining.length,
            };
          }
          return p;
        })
        .filter(p => p.files.length > 0)
    );
  }, []);

  // Search filtering
  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (post.name && post.name.toLowerCase().includes(q)) ||
      (post.username && post.username.toLowerCase().includes(q)) ||
      post.files.some(f => f.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-4">
      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Filter ${type} by user or filename...`}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredPosts.length}</strong>{' '}
            pending batch{filteredPosts.length === 1 ? '' : 'es'}
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPosts.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={`No pending ${type} found`}
          description={
            searchQuery
              ? 'No matching files match your search keyword. Try clearing the filter.'
              : `All ${type} have been posted, or no files matching pending formats exist in the staging directory.`
          }
        />
      )}

      {/* Posts Feed */}
      {!isLoading && (
        <div>
          {filteredPosts.map((post, index) => {
            const isLast = filteredPosts.length === index + 1;
            return (
              <div
                key={post.uniqueId}
                ref={isLast ? lastElementRef : null}
                className="animate-fade-in"
              >
                <PostCard
                  post={post}
                  flairs={flairs}
                  selectedAccount={selectedAccount}
                  uploadType={type}
                  onUploadSuccess={handleUploadSuccess}
                  onFileDeleted={handleFileDeleted}
                  onPlayVideo={setPlayingVideo}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Loading More */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
          <Spinner size="md" />
          <span className="text-xs">Loading more posts...</span>
        </div>
      )}

      {/* Cinema Video Player Modal */}
      <VideoModal
        isOpen={Boolean(playingVideo)}
        videoFile={playingVideo}
        onClose={() => setPlayingVideo(null)}
      />
    </div>
  );
}
