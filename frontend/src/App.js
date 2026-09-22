import React, { useState, useEffect, useCallback, useRef } from 'react';
import PostUploader from './components/PostUploader';
import ManageUsers from './components/ManageUsers';
import FileUpload from './components/FileUpload';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [view, setView] = useState('upload'); // 'images', 'videos', 'users', or 'upload'
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

  // Fetch posts based on page and type
  const fetchPosts = useCallback(async (page, type) => {
    if (!selectedAccount || !type) {
      setPendingPosts([]);
      setIsLoading(false);
      return;
    }

    page === 1 ? setIsLoading(true) : setIsLoadingMore(true);
    setError('');

    try {
      const postsRes = await fetch(`${API_BASE_URL}/api/posts/pending?page=${page}&limit=10&type=${type}`, { cache: 'no-cache' });
      if (!postsRes.ok) throw new Error(`Failed to fetch posts: ${postsRes.statusText}`);
      
      const data = await postsRes.json();
      
      const processedPosts = data.posts.map(post => {
        if (post.fileCount > 20 && type === 'images') {
          const numParts = Math.ceil(post.fileCount / 20);
          return Array.from({ length: numParts }, (_, i) => ({
            ...post,
            files: post.files.slice(i * 20, (i + 1) * 20),
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
    if (selectedAccount && (view === 'images' || view === 'videos')) {
      setPendingPosts([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchFlairs();
      fetchPosts(1, view);
    }
  }, [selectedAccount, view, fetchFlairs, fetchPosts]);

  const handleRefresh = () => {
    setPendingPosts([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchPosts(1, view);
    fetchFlairs();
  };

  const loadMorePosts = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchPosts(nextPage, view);
  };
  
  const handleUploadSuccess = (uniqueId) => {
    fetchPosts(1, view);
  };

  const handleFileDeleted = (uniqueId, deletedFile) => {
    setPendingPosts(currentPosts => {
      const newPosts = currentPosts
        .map(post => {
          if (post.uniqueId === uniqueId) {
            const remainingFiles = post.files.filter(file => file !== deletedFile);
            return {
              ...post,
              files: remainingFiles,
              fileCount: remainingFiles.length,
            };
          }
          return post;
        })
        .filter(post => post.files.length > 0);
      return newPosts;
    });
  };

  // Infinite scroll observer
  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (isLoading || isLoadingMore || isUploading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, isUploading, hasMore]);

  const renderUploaderView = () => (
    <>
      {pendingPosts.map((post, index) => {
        if (pendingPosts.length === index + 1) {
            return (
                <div ref={lastPostElementRef} key={post.uniqueId}>
                    <PostUploader
                        post={post}
                        flairs={flairs}
                        selectedAccount={selectedAccount}
                        onUploadSuccess={handleUploadSuccess}
                        onFileDeleted={handleFileDeleted}
                        setIsUploading={setIsUploading}
                        uploadType={view}
                    />
                </div>
            );
        } else {
            return (
                <PostUploader
                    key={post.uniqueId}
                    post={post}
                    flairs={flairs}
                    selectedAccount={selectedAccount}
                    onUploadSuccess={handleUploadSuccess}
                    onFileDeleted={handleFileDeleted}
                    setIsUploading={setIsUploading}
                    uploadType={view}
                />
            );
        }
      })}
      {isLoadingMore && (
         <div className="text-center mt-8 p-4">
            <svg className="animate-spin h-8 w-8 text-reddit-orange mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 mt-2">Loading more posts...</p>
         </div>
      )}
      {!hasMore && pendingPosts.length > 0 && (
          <div className="text-center mt-8 p-4 text-gray-500">
              No more posts to load.
          </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold text-reddit-orange mb-4 sm:mb-0">
            Reddit Uploader
          </h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setView('upload')}
              className={`${view === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'} text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Direct Upload
            </button>
            <button
              onClick={() => setView('images')}
              className={`${view === 'images' ? 'bg-reddit-blue text-white' : 'bg-gray-200 hover:bg-gray-300'} text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out`}
            >
              Post Images
            </button>
            <button
              onClick={() => setView('videos')}
              className={`${view === 'videos' ? 'bg-reddit-orange text-white' : 'bg-gray-200 hover:bg-gray-300'} text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out`}
            >
              Post Videos
            </button>
            <button
              onClick={() => setView('users')}
              className={`${view === 'users' ? 'bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'} text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out`}
            >
              Users
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
            {(view === 'images' || view === 'videos') && (
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
        
        {(view === 'images' || view === 'videos') && renderUploaderView()}
        {view === 'users' && <ManageUsers />}
        {view === 'upload' && <FileUpload onUploadSuccess={() => {
          // You could automatically switch to the content view here if desired
          // setView(uploadType === 'images' ? 'images' : 'videos');
        }} />}

      </main>
    </div>
  );
}

export default App;