import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAccounts } from '../api/accountsApi';
import { fetchFlairs } from '../api/postsApi';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [flairs, setFlairs] = useState([]);
  const [activeView, setActiveView] = useState('images'); // 'images', 'videos', 'upload', 'users'
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [counts, setCounts] = useState({
    images: 0,
    videos: 0,
    users: 0,
  });

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadAccounts() {
      setIsAccountsLoading(true);
      try {
        const data = await fetchAccounts();
        if (isMounted) {
          setAccounts(data || []);
          if (data && data.length > 0) {
            setSelectedAccount(data[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          showToast(`Error loading accounts: ${err.message}`, 'error');
        }
      } finally {
        if (isMounted) {
          setIsAccountsLoading(false);
        }
      }
    }
    loadAccounts();
    return () => { isMounted = false; };
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    async function loadFlairs() {
      if (!selectedAccount) {
        setFlairs([]);
        return;
      }
      try {
        const flairsData = await fetchFlairs(selectedAccount);
        if (isMounted) {
          setFlairs(flairsData || []);
        }
      } catch (err) {
        if (isMounted) {
          console.warn(`Could not load flairs for ${selectedAccount}:`, err.message);
          setFlairs([]);
        }
      }
    }
    loadFlairs();
    return () => { isMounted = false; };
  }, [selectedAccount]);

  const [uploads, setUploads] = useState(() => {
    try {
      const saved = sessionStorage.getItem('reddit_poster_uploads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Sync uploads to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('reddit_poster_uploads', JSON.stringify(uploads));
    } catch {
      // ignore
    }
  }, [uploads]);

  const startUpload = useCallback(({ name, username, count, type = 'images', account, isStaging = false, caption = '' }) => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUpload = {
      id,
      name: name || username || 'Unknown',
      username,
      count: count || 1,
      type: type, // 'images' or 'videos'
      isStaging,
      account,
      caption,
      status: 'publishing', // 'publishing', 'completed', 'error'
      progressText: isStaging ? 'Uploading files to staging...' : 'Posting to Reddit...',
      startedAt: Date.now(),
      completedAt: null,
      url: null,
      error: null,
    };
    setUploads(prev => [newUpload, ...prev]);
    return id;
  }, []);

  const finishUpload = useCallback((id, { success = true, url = null, error = null }) => {
    setUploads(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            status: success ? 'completed' : 'error',
            progressText: success ? 'Published' : 'Failed',
            completedAt: Date.now(),
            url,
            error,
          };
        }
        return item;
      })
    );
  }, []);

  const removeUpload = useCallback((id) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status === 'publishing'));
  }, []);

  const toggleFabExpanded = useCallback(() => {
    setIsFabExpanded(prev => !prev);
  }, []);

  const activeUploadsCount = uploads.filter(u => u.status === 'publishing').length;

  const value = {
    accounts,
    selectedAccount,
    setSelectedAccount,
    flairs,
    activeView,
    setActiveView,
    isAccountsLoading,
    refreshTrigger,
    triggerRefresh,
    toasts,
    showToast,
    removeToast,
    counts,
    setCounts,
    uploads,
    activeUploadsCount,
    isFabExpanded,
    setIsFabExpanded,
    toggleFabExpanded,
    startUpload,
    finishUpload,
    removeUpload,
    clearCompletedUploads,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
