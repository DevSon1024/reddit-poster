import React, { useState, useEffect, useCallback } from 'react';
import AddUserCard from './AddUserCard';
import Badge from '../common/Badge';
import { Skeleton, EmptyState } from '../common/Spinner';
import { useApp } from '../../context/AppContext';
import { fetchUsers } from '../../api/usersApi';
import { Users, Search, Copy, Check, AtSign } from 'lucide-react';

export default function UsersView() {
  const { showToast, setCounts } = useApp();

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      const list = data || [];
      setUsers(list);
      setCounts(prev => ({ ...prev, users: list.length }));
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, setCounts]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied "${text}" to clipboard!`, 'info');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.Name && u.Name.toLowerCase().includes(q)) ||
      (u.Username && u.Username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Add New User Card Section */}
      <AddUserCard onUserAdded={loadUsers} />

      {/* Directory Header & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Creator Directory</span>
              <Badge variant="primary">{users.length}</Badge>
            </h2>
            <p className="text-xs text-slate-400">
              Configured creators loaded from users.csv
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or @username..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUsers.length === 0 && (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matching creators found' : 'No creators in users.csv'}
          description={
            searchQuery
              ? 'Try checking the spelling or clear the search keyword.'
              : 'Add your first creator using the form above to enable post attribution.'
          }
        />
      )}

      {/* Users Grid */}
      {!isLoading && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredUsers.map(user => {
            const isNameCopied = copiedKey === `name-${user.Username}`;
            const isUserCopied = copiedKey === `user-${user.Username}`;

            return (
              <div
                key={user.Username}
                className="glass-card rounded-2xl border border-slate-800/80 p-4 transition-all hover:border-slate-700/90 shadow-md group relative flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                    {(user.Name || user.Username || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                      {user.Name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-0.5 mt-0.5 font-mono">
                      <AtSign className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{user.Username}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(`"${user.Name}"`, `name-${user.Username}`)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700"
                    title="Copy formatted title syntax"
                  >
                    {isNameCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>Title Syntax</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(user.Username, `user-${user.Username}`)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700"
                    title="Copy raw username"
                  >
                    {isUserCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>@{user.Username}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
