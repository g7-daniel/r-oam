'use client';

import { forwardRef, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'selected';
  padding?: 'none' | 'sm' | 'md' | 'lg';
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
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
