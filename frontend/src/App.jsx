import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/common/Header';
import ToastContainer from './components/common/ToastContainer';
import PostsView from './components/posts/PostsView';
import FileUploadView from './components/upload/FileUploadView';
import UsersView from './components/users/UsersView';

function AppContent() {
  const { activeView, triggerRefresh } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header & Navigation */}
      <Header isRefreshing={isRefreshing} onRefresh={handleManualRefresh} />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        {activeView === 'images' && <PostsView type="images" />}
        {activeView === 'videos' && <PostsView type="videos" />}
        {activeView === 'upload' && <FileUploadView />}
        {activeView === 'users' && <UsersView />}
      </main>

      {/* Global Toast Alert Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
