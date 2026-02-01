'use client';

import clsx from 'clsx';

interface PriceTagProps {
  price: number;
  currency?: string;
  originalPrice?: number;
  perUnit?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PriceTag({
  price,
  currency = 'USD',
  originalPrice,
  perUnit,
  size = 'md',
  className,
}: PriceTagProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={clsx('flex items-baseline gap-2', className)}>
      <span className={clsx('font-bold text-slate-950', sizes[size])}>
        {formatPrice(price)}
      </span>

      {perUnit && (
        <span className="text-gray-500 text-sm">/{perUnit}</span>
      )}

      {hasDiscount && (
        <>
          <span className="text-gray-400 line-through text-sm">
            {formatPrice(originalPrice)}
          </span>
          <span className="text-xs font-medium text-accent-600 bg-accent-100 px-2 py-0.5 rounded-full">
            {discountPercent}% off
          </span>
        </>
      )}
    </div>
  );
}
