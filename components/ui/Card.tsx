'use client';

import { forwardRef, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'selected';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** For interactive cards, provide an accessible label */
  'aria-label'?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'bg-white dark:bg-slate-800 rounded-xl transition-all duration-200';

    const variants = {
      default: 'shadow-reddit dark:shadow-slate-900/50',
      interactive:
        'shadow-reddit dark:shadow-slate-900/50 cursor-pointer hover:shadow-reddit-hover dark:hover:shadow-slate-900/70 hover:-translate-y-1 border-2 border-transparent hover:border-reddit-200 dark:hover:border-slate-600',
      selected:
        'shadow-reddit dark:shadow-slate-900/50 border-2 border-reddit ring-2 ring-reddit-100 dark:ring-orange-900/50',
    };

    const paddings = {
      none: '',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-5 sm:p-8',
    };

    // For interactive cards, add proper keyboard support and role
    const interactiveProps = variant === 'interactive' ? {
      role: 'button' as const,
      tabIndex: 0,
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if ((e.key === 'Enter' || e.key === ' ') && props.onClick) {
          e.preventDefault();
          props.onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
        props.onKeyDown?.(e);
      },
    } : {};

    return (
      <div
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          paddings[padding],
          variant === 'interactive' && 'focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          className
        )}
        {...interactiveProps}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
