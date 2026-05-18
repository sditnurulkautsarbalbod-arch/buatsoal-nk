import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl border border-slate-100 bg-white text-slate-950 shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';
