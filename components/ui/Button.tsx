'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-reddit text-white hover:bg-reddit-dark shadow-reddit hover:shadow-reddit-hover hover:-translate-y-0.5 focus:ring-reddit',
      secondary:
        'bg-white dark:bg-slate-800 text-reddit border-2 border-reddit hover:bg-reddit-50 dark:hover:bg-slate-700 shadow-reddit hover:shadow-reddit-hover hover:-translate-y-0.5 focus:ring-reddit',
      accent:
        'bg-secondary-500 text-white hover:bg-secondary-600 shadow-reddit hover:shadow-reddit-hover hover:-translate-y-0.5 focus:ring-secondary-500',
      ghost:
        'text-reddit-gray-600 dark:text-slate-300 hover:bg-reddit-gray-100 dark:hover:bg-slate-700 focus:ring-reddit-gray-300',
      danger:
        'bg-red-600 text-white hover:bg-red-700 shadow-reddit hover:shadow-reddit-hover hover:-translate-y-0.5 focus:ring-red-500',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm min-h-[44px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          isLoading && 'cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isLoading && <span className="sr-only">Loading...</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
