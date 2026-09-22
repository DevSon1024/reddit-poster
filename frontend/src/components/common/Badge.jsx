import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
  onClick,
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    blue: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  };

  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.default
      } ${isClickable ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </span>
  );
}
