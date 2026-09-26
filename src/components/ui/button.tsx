import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-hidden focus:ring-4 disabled:pointer-events-none disabled:opacity-50 shadow-xs';

    const variants = {
      default: 'bg-accent text-accent-ink hover:bg-accent-hover focus:ring-accent/25 active:bg-accent-hover shadow-xs',
      outline: 'border-2 border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-surface focus:ring-line-strong active:bg-canvas',
      ghost: 'text-ink hover:bg-canvas focus:ring-line-strong active:bg-muted',
      destructive: 'bg-danger text-accent-ink hover:bg-danger focus:ring-danger/25 active:bg-danger shadow-xs',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };