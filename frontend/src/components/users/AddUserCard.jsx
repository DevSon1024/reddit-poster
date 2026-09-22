import React, { useState } from 'react';
import Button from '../common/Button';
import { useApp } from '../../context/AppContext';
import { addUser } from '../../api/usersApi';
import { UserPlus } from 'lucide-react';

export default function AddUserCard({ onUserAdded }) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      showToast('Name and Username are both required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addUser({
        name: name.trim(),
        username: username.trim().replace(/^@/, ''), // strip leading @ if entered
      });
      showToast(res.message || `Added ${name} successfully!`, 'success');
      setName('');
      setUsername('');
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-700/70 shadow-xl mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-reddit-orange/10 text-reddit-orange flex items-center justify-center border border-reddit-orange/20">
          <UserPlus className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Add New User</h3>
          <p className="text-xs text-slate-400">
            Register a model or creator in users.csv for post attribution
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        <div className="sm:col-span-5">
          <label htmlFor="user-name" className="block text-xs font-medium text-slate-300 mb-1">
            Display Name
          </label>
          <input
            id="user-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Jane Doe"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent transition-all"
          />
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="user-username" className="block text-xs font-medium text-slate-300 mb-1">
            Username (slug)
          </label>
          <input
            id="user-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g., janedoe_official"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent transition-all"
          />
        </div>

        <div className="sm:col-span-2 flex items-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting || !name.trim() || !username.trim()}
            className="w-full"
            icon={UserPlus}
          >
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
