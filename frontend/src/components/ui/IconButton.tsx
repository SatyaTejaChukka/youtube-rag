import { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
}

export function IconButton({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const variantClass =
    variant === 'danger'
      ? 'text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400'
      : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]';
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <button
      className={`
        inline-flex cursor-pointer items-center justify-center rounded-[8px]
        transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40
        ${variantClass}
        ${sizeClass}
        ${className}
      `}
      {...props}
    />
  );
}
