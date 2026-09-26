import React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 sm:h-10 w-full rounded-lg border-2 border-line bg-surface px-4 py-2 text-base text-ink sm:text-sm font-medium shadow-xs transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-muted hover:border-line focus:border-accent focus:outline-hidden focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };