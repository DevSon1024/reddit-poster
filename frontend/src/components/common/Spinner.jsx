import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '', color = 'text-reddit-orange' }) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  const sz = sizeMap[size] || sizeMap.md;

  return (
    <Loader2
      className={`animate-spin ${sz} ${color} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-800/80 rounded-xl border border-slate-700/50 ${className}`}
    />
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-card rounded-2xl border border-slate-800/80 my-4">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-200 mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export default Spinner;
