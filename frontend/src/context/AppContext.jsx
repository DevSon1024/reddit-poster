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
