import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Image as ImageIcon,
  Video,
  UploadCloud,
  Users,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export default function Header({ isRefreshing = false, onRefresh }) {
  const {
    accounts,
    selectedAccount,
    setSelectedAccount,
    activeView,
    setActiveView,
    counts,
  } = useApp();

  const navItems = [
    { id: 'images', label: 'Images', icon: ImageIcon, count: counts.images },
    { id: 'videos', label: 'Videos', icon: Video, count: counts.videos },
    { id: 'upload', label: 'Direct Upload', icon: UploadCloud },
    { id: 'users', label: 'Users', icon: Users, count: counts.users },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3.5 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-reddit-orange to-amber-500 shadow-glow-orange text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">
                  Reddit<span className="text-reddit-orange">Poster</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-reddit-orange/10 text-orange-400 border border-orange-500/20">
                  Studio
                </span>
              </div>
              <p className="text-xs text-slate-400">Content & Submissions Control</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-inner overflow-x-auto max-w-full">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-reddit-orange to-orange-600 text-white shadow-glow-orange'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Controls: Account Switcher & Refresh */}
          <div className="flex items-center gap-3">
            {/* Account Selector */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4 text-orange-400" />
              </div>
              <select
                id="account-select"
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs font-medium bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors cursor-pointer appearance-none shadow-sm hover:border-slate-600"
              >
                {accounts.length > 0 ? (
                  accounts.map(acc => (
                    <option key={acc} value={acc} className="bg-slate-900 text-slate-200">
                      u/{acc}
                    </option>
                  ))
                ) : (
                  <option className="bg-slate-900 text-slate-400">No accounts configured</option>
                )}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh feeds and flairs"
              className="p-2 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-300 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
