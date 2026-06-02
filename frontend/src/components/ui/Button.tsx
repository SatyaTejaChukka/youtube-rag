import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'border-0 text-white hover:brightness-110'
      : variant === 'danger'
        ? 'border text-red-400 hover:bg-red-500/15'
        : 'border hover:bg-white/[0.04]';

  const style =
    variant === 'primary'
      ? {
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 16px rgba(99,102,241,0.3)',
        }
      : variant === 'danger'
        ? {
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
          }
        : {
            background: 'transparent',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          };

  return (
    <button
      className={`
        inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap
        rounded-[10px] font-semibold transition-all duration-150 active:scale-[0.98]
        disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40
        ${variantClass}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      style={style}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
