import React, { useState, useEffect, useCallback } from 'react';
import PostUploader from './components/PostUploader';
import ManageUsers from './components/ManageUsers'; // Import the new component

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [view, setView] = useState('uploader'); // 'uploader' or 'users'
  const [pendingPosts, setPendingPosts] = useState([]);
  const [flairs, setFlairs] = useState([]);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch accounts only once on initial load
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/accounts`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccount(data[0]);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch flairs when account changes
  const fetchFlairs = useCallback(async () => {
    if (!selectedAccount) {
      setFlairs([]);
      return;
    }
    try {
      const flairsRes = await fetch(`${API_BASE_URL}/api/flairs?account=${selectedAccount}`, { cache: 'no-cache' });
      if (!flairsRes.ok) throw new Error(`Failed to fetch flairs: ${flairsRes.statusText}`);
      const flairsData = await flairsRes.json();
      setFlairs(flairsData);
    } catch (err) {
      setError(err.message);
      setFlairs([]);
    }
  }, [selectedAccount]);

  // Fetch posts based on page
  const fetchPosts = useCallback(async (page) => {
    if (!selectedAccount) {
      setPendingPosts([]);
      setIsLoading(false);
      return;
    }

    page === 1 ? setIsLoading(true) : setIsLoadingMore(true);
    setError('');

    try {
      const postsRes = await fetch(`${API_BASE_URL}/api/posts/pending?page=${page}&limit=10`, { cache: 'no-cache' });
      if (!postsRes.ok) throw new Error(`Failed to fetch posts: ${postsRes.statusText}`);
      
      const data = await postsRes.json();
      
      const processedPosts = data.posts.map(post => {
        if (post.imageCount > 20) {
          const numParts = Math.ceil(post.imageCount / 20);
          return Array.from({ length: numParts }, (_, i) => ({
            ...post,
            images: post.images.slice(i * 20, (i + 1) * 20),
            part: i + 1,
            uniqueId: `${post.username}-${i + 1}`
          }));
        }
        return { ...post, part: 0, uniqueId: post.username };
      }).flat();

      setPendingPosts(prev => page === 1 ? processedPosts : [...prev, ...processedPosts]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedAccount]);

  // Effect to handle account changes
  useEffect(() => {
    if (selectedAccount) {
      setPendingPosts([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchFlairs();
      fetchPosts(1);
    }
  }, [selectedAccount, fetchFlairs, fetchPosts]);

  const handleRefresh = () => {
    setPendingPosts([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchPosts(1);
    fetchFlairs();
  };

  const loadMorePosts = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchPosts(nextPage);
  };
  
  const handleUploadSuccess = (uniqueId) => {
    // Re-fetch the first page of posts to ensure the list is up-to-date
    fetchPosts(1);
  };

  const handleImageDeleted = (uniqueId, deletedImage) => {
    setPendingPosts(currentPosts => {
      const newPosts = currentPosts
        .map(post => {
          if (post.uniqueId === uniqueId) {
            const remainingImages = post.images.filter(img => img !== deletedImage);
            return {
              ...post,
              images: remainingImages,
              imageCount: remainingImages.length,
            };
          }
          return post;
        })
        .filter(post => post.images.length > 0);
      return newPosts;
    });
  };

  const renderUploaderView = () => (
    <>
      {pendingPosts.map((post) => (
        <PostUploader
          key={post.uniqueId}
          post={post}
          flairs={flairs}
          selectedAccount={selectedAccount}
          onUploadSuccess={handleUploadSuccess}
          onImageDeleted={handleImageDeleted}
          setIsUploading={setIsUploading}
        />
      ))}
      {hasMore && !isLoading && (
        <div className="text-center mt-8">
          <button
            onClick={loadMorePosts}
            disabled={isLoadingMore || isUploading}
            className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out disabled:bg-gray-400"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold text-reddit-orange mb-4 sm:mb-0">
            Reddit Image Uploader
          </h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
             <button
              onClick={() => setView(view === 'uploader' ? 'users' : 'uploader')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
            >
              {view === 'uploader' ? 'Manage Users' : 'Back to Uploader'}
            </button>
            <div className="flex items-center space-x-2">
              <label htmlFor="account-select" className="font-semibold text-gray-700">Account:</label>
              <select 
                id="account-select" 
                value={selectedAccount} 
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                {accounts.length > 0 ? (
                  accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)
                ) : (
                  <option>No accounts found</option>
                )}
              </select>
            </div>
            {view === 'uploader' && (
              <button 
                onClick={handleRefresh} 
                disabled={isLoading || isUploading}
                className="w-full sm:w-auto bg-reddit-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading && !isLoadingMore && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isLoading && !isLoadingMore ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        {isLoading && <div className="text-center">Loading...</div>}
        
        {view === 'uploader' ? renderUploaderView() : <ManageUsers />}

      </main>
    </div>
  );
}

export default App;